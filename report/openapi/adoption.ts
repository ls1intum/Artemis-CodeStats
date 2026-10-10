import path from 'node:path'
import ts from 'typescript'
import {
  operationIdentitySchema,
  type Caller,
  type GeneratedMethod,
  type Operation,
  type SourceLocation,
} from '../../src/features/openapi/model'

export interface AdoptionInventory {
  callers: Caller[]
  issues: {
    evidence: SourceLocation[]
    operationIds: string[]
    reason: string
    nextStep: string
  }[]
  evidence: SourceLocation[]
}

export const excludedClientSource = (file: string, generatedRoot: string) =>
  file === generatedRoot ||
  file.startsWith(`${generatedRoot}/`) ||
  !file.endsWith('.ts') ||
  file.endsWith('.d.ts') ||
  /\.(spec|test|mock|fixture)\.ts$/.test(file) ||
  file
    .split('/')
    .some((part) =>
      [
        '__tests__',
        '__mocks__',
        'test',
        'tests',
        'mock',
        'mocks',
        'fixture',
        'fixtures',
      ].includes(part),
    )

const unwrap = (node: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(node) ||
  ts.isAsExpression(node) ||
  ts.isNonNullExpression(node) ||
  ts.isSatisfiesExpression(node)
    ? unwrap(node.expression)
    : node
const name = (node: ts.Node | undefined) =>
  node && (ts.isIdentifier(node) || ts.isStringLiteral(node))
    ? node.text
    : undefined
const visit = (node: ts.Node, action: (node: ts.Node) => void) => {
  action(node)
  node.forEachChild((child) => visit(child, action))
}
const trafficOf = (url: string | undefined): Caller['traffic'] =>
  url === undefined
    ? 'unresolved'
    : /^(https?:)?\/\//i.test(url)
      ? 'external-api'
      : /^(wss?:)/i.test(url)
        ? 'websocket'
        : /^(\/)?api(\/|$)/.test(url)
          ? 'artemis-rest'
          : /^(\/)?(assets|content|i18n)\//.test(url) ||
              /\.(json|svg|html|png|jpg|css)([?#]|$)/i.test(url)
            ? 'asset'
            : 'unresolved'

/** Counts syntax call sites, never executions, subscriptions, or runtime migration. */
export function analyzeAdoption(
  sources: { path: string; content: string }[],
  operations: Operation[],
  methods: GeneratedMethod[],
  scope: { clientRoot: string; generatedRoot: string },
): AdoptionInventory {
  const result: AdoptionInventory = { callers: [], issues: [], evidence: [] }
  const contents = new Map(
    sources.map((source) => [source.path, source.content]),
  )
  const host = ts.createCompilerHost({})
  host.getSourceFile = (file) =>
    contents.has(file)
      ? ts.createSourceFile(
          file,
          contents.get(file)!,
          ts.ScriptTarget.Latest,
          true,
        )
      : undefined
  host.fileExists = (file) => contents.has(file)
  host.readFile = (file) => contents.get(file)
  // Binding symbols disambiguate local shadowing without installing/compiling Artemis.
  const program = ts.createProgram(
    [...contents.keys()],
    { noResolve: true, noLib: true },
    host,
  )
  const checker = program.getTypeChecker()
  type Binding = { module: string; exported: string; file: ts.SourceFile }
  const imports = new Map<ts.Symbol, Binding>()
  for (const file of program.getSourceFiles()) {
    for (const statement of file.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      )
        continue
      const bindings = statement.importClause?.namedBindings
      if (!bindings) continue
      for (const binding of ts.isNamedImports(bindings)
        ? bindings.elements
        : [bindings]) {
        const symbol = checker.getSymbolAtLocation(binding.name)
        if (symbol)
          imports.set(symbol, {
            module: statement.moduleSpecifier.text,
            exported: ts.isImportSpecifier(binding)
              ? (binding.propertyName ?? binding.name).text
              : '*',
            file,
          })
      }
    }
  }
  const bindingOf = (node: ts.Node): Binding | undefined => {
    if (ts.isPropertyAccessExpression(node) || ts.isQualifiedName(node)) {
      const receiver = ts.isQualifiedName(node) ? node.left : node.expression
      const binding = imports.get(checker.getSymbolAtLocation(receiver)!)
      if (binding?.exported === '*')
        return {
          ...binding,
          exported: (ts.isQualifiedName(node) ? node.right : node.name).text,
        }
    }
    return imports.get(checker.getSymbolAtLocation(node)!)
  }
  const imported = (node: ts.Node, module: string, exported: string) => {
    const binding = bindingOf(node)
    return binding?.module === module && binding.exported === exported
  }
  const generatedFile = (file: string) =>
    file === scope.generatedRoot || file.startsWith(`${scope.generatedRoot}/`)
  const resolveFile = (module: string, file: ts.SourceFile) => {
    const root = module.startsWith('app/')
      ? `${scope.clientRoot}/${module.slice(4)}`
      : module.startsWith('.')
        ? path.posix.normalize(
            path.posix.join(path.posix.dirname(file.fileName), module),
          )
        : undefined
    return (
      root &&
      ([root, `${root}.ts`, `${root}/index.ts`].find((candidate) =>
        contents.has(candidate),
      ) ??
        root)
    )
  }
  // Follow explicit export barrels to the generated declaration, without guessing by API name.
  const exportedAt = (
    binding: Binding,
    seen = new Set<string>(),
  ): { file: string; symbol: string; resolved: boolean } | undefined => {
    const fileName = resolveFile(binding.module, binding.file)
    if (!fileName || seen.has(`${fileName}:${binding.exported}`))
      return undefined
    seen.add(`${fileName}:${binding.exported}`)
    const file = program.getSourceFile(fileName)
    let unresolved: ReturnType<typeof exportedAt>
    for (const statement of file?.statements ?? []) {
      if (
        (ts.isClassDeclaration(statement) ||
          ts.isFunctionDeclaration(statement)) &&
        statement.name?.text === binding.exported &&
        statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        )
      )
        return { file: fileName, symbol: binding.exported, resolved: true }
      if (
        ts.isVariableStatement(statement) &&
        statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        ) &&
        statement.declarationList.declarations.some(
          (declaration) => name(declaration.name) === binding.exported,
        )
      )
        return { file: fileName, symbol: binding.exported, resolved: true }
      if (
        !ts.isExportDeclaration(statement) ||
        !statement.moduleSpecifier ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      )
        continue
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        const item = statement.exportClause.elements.find(
          (item) => item.name.text === binding.exported,
        )
        if (item) {
          const found = exportedAt(
            {
              file: file!,
              module: statement.moduleSpecifier.text,
              exported: (item.propertyName ?? item.name).text,
            },
            seen,
          )
          if (found?.resolved) return found
          unresolved ??= found
        }
      } else if (!statement.exportClause) {
        const found = exportedAt(
          {
            file: file!,
            module: statement.moduleSpecifier.text,
            exported: binding.exported,
          },
          seen,
        )
        if (found?.resolved) return found
        unresolved ??= found
      }
    }
    // Import intent retains a call when generated inputs/exports are missing, but cannot bind transport.
    return (
      unresolved ??
      (generatedFile(fileName)
        ? { file: fileName, symbol: binding.exported, resolved: false }
        : undefined)
    )
  }
  const bindingSymbol = (node: ts.Expression): ts.Symbol | undefined => {
    node = unwrap(node)
    if (ts.isElementAccessExpression(node)) {
      const key = unwrap(node.argumentExpression)
      return ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key)
        ? checker.getTypeAtLocation(node.expression).getProperty(key.text)
        : undefined
    }
    return checker.getSymbolAtLocation(
      ts.isPropertyAccessExpression(node) ? node.name : node,
    )
  }
  const declaration = (node: ts.Expression) =>
    bindingSymbol(node)?.valueDeclaration
  const writes = new Set<ts.Symbol>()
  const recordWrite = (target: ts.Expression) => {
    target = unwrap(target)
    if (ts.isObjectLiteralExpression(target)) {
      for (const property of target.properties) {
        if (ts.isPropertyAssignment(property)) recordWrite(property.initializer)
        else if (ts.isShorthandPropertyAssignment(property)) {
          const symbol = checker.getShorthandAssignmentValueSymbol(property)
          if (symbol) writes.add(symbol)
        } else if (ts.isSpreadAssignment(property))
          recordWrite(property.expression)
      }
    } else if (ts.isArrayLiteralExpression(target)) {
      for (const element of target.elements)
        if (!ts.isOmittedExpression(element)) recordWrite(element)
    } else if (ts.isSpreadElement(target)) recordWrite(target.expression)
    else if (
      ts.isBinaryExpression(target) &&
      target.operatorToken.kind === ts.SyntaxKind.EqualsToken
    )
      recordWrite(target.left)
    else {
      const symbol = bindingSymbol(target)
      if (symbol) writes.add(symbol)
      else if (ts.isElementAccessExpression(target)) {
        // An unknown key can overwrite any property; none of its initial values is reliable.
        for (const property of checker
          .getTypeAtLocation(target.expression)
          .getProperties())
          writes.add(property)
      }
    }
  }
  for (const file of program.getSourceFiles())
    visit(file, (node) => {
      const target =
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
          ? node.left
          : (ts.isPostfixUnaryExpression(node) ||
                ts.isPrefixUnaryExpression(node)) &&
              [
                ts.SyntaxKind.PlusPlusToken,
                ts.SyntaxKind.MinusMinusToken,
              ].includes(node.operator)
            ? node.operand
            : undefined
      if (target) recordWrite(target)
    })
  const assigned = (node: ts.Expression) => writes.has(bindingSymbol(node)!)
  const dependency = (
    node: ts.Expression,
    ignoreWrites = false,
  ): Binding | undefined => {
    node = unwrap(node)
    if (!ignoreWrites && assigned(node)) return undefined
    if (
      ts.isCallExpression(node) &&
      imported(node.expression, '@angular/core', 'inject')
    )
      return node.arguments[0] && bindingOf(node.arguments[0])
    const declared = declaration(node)
    if (
      declared &&
      (ts.isPropertyDeclaration(declared) ||
        ts.isParameter(declared) ||
        ts.isVariableDeclaration(declared))
    ) {
      if (
        declared.initializer &&
        ts.isCallExpression(unwrap(declared.initializer))
      )
        return dependency(declared.initializer, ignoreWrites)
      if (
        ts.isParameter(declared) &&
        declared.type &&
        ts.isTypeReferenceNode(declared.type)
      )
        return bindingOf(declared.type.typeName)
    }
    return undefined
  }
  // Follow initial receiver aliases only to retain unresolved sites, never to establish adoption.
  const originalBinding = (
    node: ts.Expression,
    seen = new Set<ts.Node>(),
  ): Binding | undefined => {
    const dep = dependency(node, true)
    if (dep) return dep
    const declared = declaration(unwrap(node))
    if (!declared || seen.has(declared)) return undefined
    seen.add(declared)
    return (ts.isVariableDeclaration(declared) ||
      ts.isPropertyDeclaration(declared)) &&
      declared.initializer
      ? originalBinding(declared.initializer, seen)
      : undefined
  }
  const http = (node: ts.Expression) => {
    const dep = originalBinding(node)
    return (
      dep?.module === '@angular/common/http' && dep.exported === 'HttpClient'
    )
  }
  const parameterExpression = (node: ts.Expression): boolean => {
    node = unwrap(node)
    return (
      ts.isIdentifier(node) ||
      ts.isPropertyAccessExpression(node) ||
      (ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        ['encodeURIComponent', 'String'].includes(node.expression.text) &&
        !declaration(node.expression))
    )
  }
  const render = (
    node: ts.Expression,
    seen = new Set<ts.Node>(),
  ): string | undefined => {
    node = unwrap(node)
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      return node.text
    if (ts.isTemplateExpression(node)) {
      let value = node.head.text
      for (const span of node.templateSpans) {
        if (/[?#]/.test(value)) return value // Query/fragment values do not affect operation identity.
        const part = render(span.expression, new Set(seen))
        // A dynamic interpolation may fill one path parameter, but must never supply a URL origin/prefix.
        const parameter = parameterExpression(span.expression)
        if (part === undefined && (!parameter || !value)) return undefined
        value += (part ?? '{parameter}') + span.literal.text
      }
      return value
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      const left = render(node.left, new Set(seen))
      const right = render(node.right, new Set(seen))
      if (left !== undefined && right !== undefined) return left + right
      if (left !== undefined && parameterExpression(node.right))
        return left + '{parameter}'
      return undefined
    }
    if (assigned(node)) return undefined
    const declared = declaration(node)
    if (!declared || seen.has(declared)) return undefined
    seen.add(declared)
    if (
      (ts.isVariableDeclaration(declared) ||
        ts.isPropertyDeclaration(declared)) &&
      declared.initializer
    )
      return render(declared.initializer, seen)
    return undefined
  }
  const join = (method: string, url: string) => {
    const normalized = url.startsWith('api/') ? `/${url}` : url
    const parsed = operationIdentitySchema.safeParse({
      method,
      path: normalized.split(/[?#]/)[0],
    })
    if (!parsed.success) return []
    const id = `${method} ${parsed.data.path}`
    const exact = operations.filter((operation) => operation.id === id)
    if (!parsed.data.path.includes('{') && exact.length)
      return exact.map((operation) => operation.id)
    return operations
      .filter((operation) => {
        const [serverMethod, ...parts] = operation.id.split(' ')
        if (serverMethod !== method) return false
        const pattern = parts
          .join(' ')
          .split(/(\{[^}]+\})/g)
          .map((part) =>
            /^\{[^}]+\}$/.test(part)
              ? '[^/]+'
              : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          )
          .join('')
        return new RegExp(`^${pattern}$`).test(parsed.data.path)
      })
      .map((operation) => operation.id)
  }
  for (const file of program.getSourceFiles()) {
    if (
      excludedClientSource(file.fileName, scope.generatedRoot) ||
      !file.fileName.startsWith(`${scope.clientRoot}/`)
    )
      continue
    const location = (node: ts.Node, symbol?: string): SourceLocation => ({
      inputId: 'client',
      path: file.fileName,
      line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
      ...(symbol ? { symbol } : {}),
    })
    result.evidence.push(location(file))
    const issue = (
      evidence: SourceLocation[],
      operationIds: string[],
      reason: string,
    ) =>
      result.issues.push({
        evidence,
        operationIds,
        reason,
        nextStep:
          'Inspect this source call and its URL/receiver; reconcile unsupported wrappers, aliases or indirect chains in iteration 5 before claiming complete adoption.',
      })
    const errors = program.getSyntacticDiagnostics(file)
    if (errors.length) {
      for (const error of errors)
        issue(
          [
            {
              ...location(file),
              line:
                file.getLineAndCharacterOfPosition(error.start ?? 0).line + 1,
            },
          ],
          [],
          `Production TypeScript parse failure: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`,
        )
      continue
    }
    visit(file, (node) => {
      if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return
      let parent: ts.Node | undefined = node.parent
      let member: string | undefined
      let owner: ts.ClassLikeDeclaration | undefined
      while (parent && !ts.isSourceFile(parent)) {
        if (
          !member &&
          (ts.isMethodDeclaration(parent) ||
            ts.isFunctionDeclaration(parent) ||
            ts.isPropertyDeclaration(parent))
        )
          member = name(parent.name)
        if (!member && ts.isConstructorDeclaration(parent))
          member = 'constructor'
        if (ts.isClassDeclaration(parent) || ts.isClassExpression(parent)) {
          owner = parent
          break
        }
        parent = parent.parent
      }
      const symbol =
        [owner?.name?.text, member].filter(Boolean).join('.') || '<top-level>'
      const access = ts.isPropertyAccessExpression(node.expression)
        ? node.expression
        : undefined
      const anchor = location(access?.name ?? node.expression, symbol)
      const add = (
        data: Pick<
          Caller,
          'transport' | 'traffic' | 'operationIds' | 'mapping' | 'reason'
        > & { generatedMethodId?: string; via?: SourceLocation[] },
      ) => {
        const caller: Caller = {
          id: `${file.fileName}:${node.getStart(file)}`,
          symbol,
          area: file.fileName.slice(scope.clientRoot.length + 1).split('/')[0],
          location: anchor,
          kind: owner?.modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.AbstractKeyword,
          )
            ? 'wrapper-implementation'
            : 'production',
          via: [],
          ...data,
        }
        result.callers.push(caller)
        if (
          caller.traffic === 'unresolved' ||
          (caller.traffic === 'artemis-rest' &&
            (caller.mapping !== 'resolved' ||
              caller.transport === 'unresolved'))
        )
          issue([anchor, ...caller.via], caller.operationIds, caller.reason)
      }
      const directImport = bindingOf(node.expression)
      const dep = access && dependency(access.expression)
      const generated =
        (dep || directImport) && exportedAt((dep || directImport)!)
      const originalDependency =
        access &&
        assigned(access.expression) &&
        originalBinding(access.expression)
      const originalDeclaration =
        originalDependency && exportedAt(originalDependency)
      if (
        originalDependency &&
        ((originalDependency.module === '@angular/common/http' &&
          originalDependency.exported === 'HttpClient') ||
          (originalDeclaration && generatedFile(originalDeclaration.file)))
      ) {
        add({
          transport: 'unresolved',
          traffic: 'unresolved',
          operationIds: [],
          mapping: 'unresolved',
          reason:
            'Injected transport receiver is reassigned; its original import cannot establish the called implementation.',
        })
        return
      }
      if (
        imported(node.expression, '@angular/common/http', 'httpResource') ||
        (access &&
          imported(access.expression, '@angular/common/http', 'httpResource'))
      ) {
        add({
          transport: 'unresolved',
          traffic: 'unresolved',
          operationIds: [],
          mapping: 'unresolved',
          reason:
            'Handwritten httpResource callback transport needs focused URL/chain analysis; generated helper calls are analyzed separately.',
        })
        return
      }
      if (ts.isElementAccessExpression(node.expression)) {
        const receiver = node.expression.expression
        const binding = originalBinding(receiver)
        const declaration = binding && exportedAt(binding)
        if (http(receiver) || (declaration && generatedFile(declaration.file)))
          add({
            transport: 'unresolved',
            traffic: 'unresolved',
            operationIds: [],
            mapping: 'unresolved',
            reason:
              'Computed transport method access needs focused resolution; no operation binding was guessed.',
          })
        return
      }
      const original = access && originalBinding(access.expression)
      const originalGenerated = original && exportedAt(original)
      if (
        !dep &&
        originalGenerated &&
        generatedFile(originalGenerated.file) &&
        !ts.isNewExpression(node)
      ) {
        add({
          transport: 'unresolved',
          traffic: 'unresolved',
          operationIds: [],
          mapping: 'unresolved',
          reason:
            'Generated API receiver alias/indirect binding needs iteration 5 analysis; its initial import does not establish the called transport.',
        })
        return
      }
      if (
        generated &&
        !generated.resolved &&
        generatedFile(generated.file) &&
        !ts.isNewExpression(node)
      ) {
        add({
          transport: 'unresolved',
          traffic: 'unresolved',
          operationIds: [],
          mapping: 'unresolved',
          reason:
            'Generated import/export binding could not be resolved because its source or declaration is unavailable; inspect its generated input/barrel instead of assuming no calls.',
        })
        return
      }
      if (generated?.resolved && generatedFile(generated.file)) {
        if (ts.isNewExpression(node)) return // Construction/injection is not a method call.
        const target =
          dep && access
            ? `${generated.symbol}.${access.name.text}`
            : generated.symbol
        const matches = methods.filter(
          (method) =>
            method.location.path === generated.file && method.symbol === target,
        )
        if (matches.length === 1) {
          const method = matches[0]
          add({
            transport: 'generated',
            traffic: 'artemis-rest',
            operationIds: method.operationIds,
            mapping: method.mapping,
            generatedMethodId: method.id,
            via: [method.location],
            reason: `Actual direct call to ${target}; ${method.reason}. This is static call evidence, not runtime verification.`,
          })
        } else
          add({
            transport: 'unresolved',
            traffic: 'unresolved',
            operationIds: [
              ...new Set(matches.flatMap((method) => method.operationIds)),
            ],
            mapping: matches.length ? 'ambiguous' : 'unresolved',
            reason: `Actual generated API call ${target} has ${matches.length} indexed transport methods; reconcile its implementation instead of guessing a binding.`,
          })
        return
      }
      if (access && http(access.expression)) {
        const isDirect =
          dep?.module === '@angular/common/http' &&
          dep.exported === 'HttpClient'
        if (!isDirect) {
          add({
            transport: 'unresolved',
            traffic: 'unresolved',
            operationIds: [],
            mapping: 'unresolved',
            reason:
              'HttpClient receiver alias/indirect binding needs iteration 5 analysis.',
          })
          return
        }
        const args = node.arguments ?? []
        const method = (
          access.name.text === 'request'
            ? args[0] && render(args[0])
            : access.name.text
        )?.toUpperCase()
        const urlNode = args[access.name.text === 'request' ? 1 : 0]
        const url = urlNode && render(urlNode)
        const traffic = trafficOf(url)
        const operationIds =
          traffic === 'artemis-rest' && method ? join(method, url!) : []
        add({
          transport: 'manual',
          traffic,
          operationIds,
          mapping:
            operationIds.length === 1
              ? 'resolved'
              : operationIds.length
                ? 'ambiguous'
                : 'unresolved',
          reason:
            traffic === 'artemis-rest'
              ? `Direct HttpClient ${method ?? 'unknown method'} ${url}; ${operationIds.length} compatible independent server identities. Dynamic path parameters are matched by structure; runtime values remain unknown.`
              : traffic === 'unresolved'
                ? 'Direct HttpClient URL/method is unsupported or dynamically determined; no operation binding was invented.'
                : `Direct HttpClient traffic classified as ${traffic}; excluded from Artemis REST adoption.`,
        })
        return
      }
      if (
        access &&
        access.expression.kind === ts.SyntaxKind.ThisKeyword &&
        owner?.heritageClauses?.some(
          (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
        ) &&
        [
          'get',
          'post',
          'put',
          'patch',
          'delete',
          'request',
          'head',
          'options',
        ].includes(access.name.text) &&
        !owner.members.some((item) => name(item.name) === access.name.text)
      ) {
        add({
          transport: 'unresolved',
          traffic: 'unresolved',
          operationIds: [],
          mapping: 'unresolved',
          reason:
            'Inherited transport-like call needs wrapper/base-class resolution in iteration 5; no HTTP method, API prefix or operation was inferred.',
        })
        return
      }
      if (
        (ts.isNewExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'WebSocket' &&
          !declaration(node.expression)) ||
        (ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'fetch' &&
          !declaration(node.expression))
      ) {
        add({
          transport: 'unresolved',
          traffic: ts.isNewExpression(node)
            ? 'websocket'
            : trafficOf(node.arguments?.[0] && render(node.arguments[0])),
          operationIds: [],
          mapping: 'unresolved',
          reason: ts.isNewExpression(node)
            ? 'WebSocket construction is separate traffic and excluded from REST adoption.'
            : 'Native fetch transport needs focused analysis; it cannot disappear from remaining work.',
        })
      }
    })
  }
  result.callers.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return result
}

export function reconcileAdoption(
  operation: Operation,
  inventory: AdoptionInventory,
): void {
  const callers = inventory.callers.filter(
    (caller) =>
      caller.kind === 'production' &&
      caller.traffic === 'artemis-rest' &&
      caller.operationIds.includes(operation.id),
  )
  if (!callers.length) {
    operation.adoption = {
      state: 'unassessed',
      reason:
        'No direct caller was bound. Wrappers, indirect callers and dynamic URLs remain unassessed; absence is not migration or server-only evidence.',
    }
    return
  }
  if (callers.some((caller) => caller.mapping === 'resolved'))
    operation.webRelevance = {
      state: 'relevant',
      basis: 'production-caller',
      evidence: callers
        .filter((caller) => caller.mapping === 'resolved')
        .map((caller) => caller.location),
    }
  else if (operation.webRelevance?.state !== 'relevant')
    operation.webRelevance = {
      state: 'incomplete-analysis',
      reason:
        'Only ambiguous/unresolved caller candidates exist; reconcile their operation identities before establishing web relevance.',
    }
  if (callers.some((caller) => caller.mapping !== 'resolved')) {
    operation.adoption = {
      state: 'incomplete-analysis',
      reason:
        'Caller candidates include ambiguous/unresolved operation bindings. Direct transport evidence is retained on the caller records without asserting operation-level adoption.',
      evidence: callers.map((caller) => caller.location),
    }
    return
  }
  const generated = callers.some((caller) => caller.transport === 'generated')
  const manual = callers.some((caller) => caller.transport === 'manual')
  operation.adoption =
    generated || manual
      ? {
          state:
            generated && manual
              ? 'mixed'
              : generated
                ? 'generated-detected'
                : 'manual',
          callerIds: callers.map((caller) => caller.id),
          analysis: 'incomplete-analysis',
          evidence: callers.map((caller) => caller.location),
          reason:
            'Direct production call sites detected; wrapper/indirect analysis is deferred, so exclusive use, runtime migration and protection remain unassessed.',
        }
      : {
          state: 'incomplete-analysis',
          reason:
            'Only unresolved transport bindings were found; inspect their caller diagnostics.',
          evidence: callers.map((caller) => caller.location),
        }
}
