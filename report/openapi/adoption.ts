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
// Nested callable bodies are assessed separately; declaring a function is not calling it.
const visitBody = (node: ts.Node, action: (node: ts.Node) => void) => {
  action(node)
  node.forEachChild((child) => {
    if (
      ts.isFunctionDeclaration(child) ||
      ts.isFunctionExpression(child) ||
      ts.isArrowFunction(child) ||
      ts.isMethodDeclaration(child)
    )
      action(child)
    else visitBody(child, action)
  })
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
          ts.isFunctionDeclaration(statement) ||
          ts.isEnumDeclaration(statement)) &&
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
  const memberAccess = (node: ts.Expression) => {
    node = unwrap(node)
    if (ts.isPropertyAccessExpression(node))
      return { receiver: node.expression, key: node.name.text }
    if (ts.isElementAccessExpression(node)) {
      const key = unwrap(node.argumentExpression)
      return {
        receiver: node.expression,
        key:
          ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key)
            ? key.text
            : undefined,
      }
    }
    return undefined
  }
  // inject() is untyped without Angular declarations. Retain receiver/member writes
  // independently of checker property symbols, including writes through stable aliases.
  const receiverIds = new Map<ts.Symbol | ts.Node, number>()
  const receiverId = (value: ts.Symbol | ts.Node) => {
    if (!receiverIds.has(value)) receiverIds.set(value, receiverIds.size)
    return String(receiverIds.get(value))
  }
  const receiverKey = (
    node: ts.Expression,
    seen = new Set<ts.Node>(),
  ): string | undefined => {
    node = unwrap(node)
    const symbol = bindingSymbol(node)
    const declared = symbol?.valueDeclaration
    if (
      declared &&
      !seen.has(declared) &&
      (ts.isVariableDeclaration(declared) ||
        ts.isPropertyDeclaration(declared)) &&
      declared.initializer
    ) {
      seen.add(declared)
      const key = receiverKey(declared.initializer, seen)
      if (key !== undefined) return key
    }
    if (symbol) return receiverId(symbol)
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      for (let parent = node.parent; parent; parent = parent.parent)
        if (ts.isClassDeclaration(parent) || ts.isClassExpression(parent))
          return receiverId(parent)
    }
    const access = memberAccess(node)
    const root = access && receiverKey(access.receiver, seen)
    return root !== undefined && access?.key !== undefined
      ? `${root}.${access.key}`
      : undefined
  }
  const memberWrites = new Map<string, Set<string | undefined>>()
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
      const access = memberAccess(target)
      const receiver = access && receiverKey(access.receiver)
      if (receiver !== undefined && access) {
        const keys = memberWrites.get(receiver) ?? new Set<string | undefined>()
        keys.add(access.key)
        memberWrites.set(receiver, keys)
      }
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
  const assigned = (node: ts.Expression) => {
    if (writes.has(bindingSymbol(node)!)) return true
    const access = memberAccess(node)
    const receiver = access && receiverKey(access.receiver)
    const keys = receiver !== undefined && memberWrites.get(receiver)
    return !!(keys && (keys.has(undefined) || keys.has(access?.key)))
  }
  const dependency = (
    node: ts.Expression,
    ignoreWrites = false,
    seen = new Set<ts.Node>(),
  ): Binding | undefined => {
    node = unwrap(node)
    if (!ignoreWrites && assigned(node)) return undefined
    if (
      ts.isCallExpression(node) &&
      imported(node.expression, '@angular/core', 'inject')
    )
      return node.arguments[0] && bindingOf(node.arguments[0])
    const declared = declaration(node)
    if (!declared || seen.has(declared)) return undefined
    seen.add(declared)
    if (
      declared &&
      (ts.isPropertyDeclaration(declared) ||
        ts.isParameter(declared) ||
        ts.isVariableDeclaration(declared))
    ) {
      if (declared.initializer)
        return dependency(declared.initializer, ignoreWrites, seen)
      if (
        ts.isParameter(declared) &&
        declared.type &&
        ts.isTypeReferenceNode(declared.type)
      )
        return bindingOf(declared.type.typeName)
    }
    return undefined
  }
  // Ignore writes only when retaining the original receiver as unresolved evidence.
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
  type Callable =
    | ts.MethodDeclaration
    | ts.FunctionDeclaration
    | ts.ArrowFunction
    | ts.FunctionExpression
  type Frame = {
    owner?: ts.ClassLikeDeclaration
    values?: Map<ts.Symbol, string | undefined>
  }
  const sourceLocation = (node: ts.Node): SourceLocation => {
    const file = node.getSourceFile()
    return {
      inputId: generatedFile(file.fileName) ? 'generated' : 'client',
      path: file.fileName,
      line: file.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    }
  }
  const enclosing = (node: ts.Node) => {
    let owner: ts.ClassLikeDeclaration | undefined
    let callable: Callable | undefined
    let member: string | undefined
    for (
      let parent = node.parent;
      parent && !ts.isSourceFile(parent);
      parent = parent.parent
    ) {
      if (
        !callable &&
        (ts.isMethodDeclaration(parent) ||
          ts.isFunctionDeclaration(parent) ||
          ts.isArrowFunction(parent) ||
          ts.isFunctionExpression(parent))
      )
        callable = parent
      if (
        !member &&
        (ts.isMethodDeclaration(parent) ||
          ts.isFunctionDeclaration(parent) ||
          ts.isPropertyDeclaration(parent))
      )
        member = name(parent.name)
      if (
        !member &&
        ts.isVariableDeclaration(parent) &&
        parent.initializer === callable
      )
        member = name(parent.name)
      if (!member && ts.isConstructorDeclaration(parent)) member = 'constructor'
      if (ts.isClassDeclaration(parent) || ts.isClassExpression(parent)) {
        owner = parent
        break
      }
    }
    return {
      owner,
      callable,
      symbol:
        [owner?.name?.text, member].filter(Boolean).join('.') || '<top-level>',
    }
  }
  const exportedNode = (binding: Binding) => {
    const target = exportedAt(binding)
    return (
      target?.resolved &&
      program
        .getSourceFile(target.file)
        ?.statements.flatMap((statement): ts.Node[] =>
          ts.isVariableStatement(statement)
            ? [...statement.declarationList.declarations]
            : [statement],
        )
        .find(
          (statement) =>
            (ts.isClassDeclaration(statement) ||
              ts.isFunctionDeclaration(statement) ||
              ts.isEnumDeclaration(statement) ||
              ts.isVariableDeclaration(statement)) &&
            name(statement.name) === target.symbol,
        )
    )
  }
  const baseClass = (owner: ts.ClassLikeDeclaration) => {
    const expression = owner.heritageClauses?.find(
      (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
    )?.types[0].expression
    const binding = expression && bindingOf(expression)
    const node = binding
      ? exportedNode(binding)
      : expression && declaration(expression)
    return node && ts.isClassDeclaration(node) ? node : undefined
  }
  const memberOf = (
    owner: ts.ClassLikeDeclaration | undefined,
    key: string,
    seen = new Set<ts.Node>(),
  ): ts.ClassElement | undefined => {
    if (!owner || seen.has(owner)) return undefined
    seen.add(owner)
    return (
      owner.members.find((member) => name(member.name) === key) ??
      memberOf(baseClass(owner), key, seen)
    )
  }
  const receiverClass = (
    node: ts.Expression,
    frame: Frame,
    seen = new Set<ts.Node>(),
    ignoreWrites = false,
  ): ts.ClassLikeDeclaration | undefined => {
    node = unwrap(node)
    if (node.kind === ts.SyntaxKind.ThisKeyword) return frame.owner
    if (node.kind === ts.SyntaxKind.SuperKeyword)
      return frame.owner && baseClass(frame.owner)
    const binding = dependency(node, ignoreWrites)
    const declared = binding ? exportedNode(binding) : declaration(node)
    if (declared && ts.isClassDeclaration(declared)) return declared
    if (
      ts.isCallExpression(node) &&
      imported(node.expression, '@angular/core', 'inject') &&
      node.arguments[0]
    )
      return receiverClass(node.arguments[0], frame, seen, ignoreWrites)
    if (ts.isNewExpression(node))
      return receiverClass(node.expression, frame, seen, ignoreWrites)
    if (!declared || seen.has(declared) || (!ignoreWrites && assigned(node)))
      return undefined
    seen.add(declared)
    if (
      (ts.isPropertyDeclaration(declared) ||
        ts.isVariableDeclaration(declared)) &&
      declared.initializer
    )
      return receiverClass(declared.initializer, frame, seen, ignoreWrites)
    if (
      ts.isParameter(declared) &&
      declared.type &&
      ts.isTypeReferenceNode(declared.type)
    ) {
      const local = checker.getSymbolAtLocation(
        declared.type.typeName,
      )?.valueDeclaration
      if (local && ts.isClassDeclaration(local)) return local
    }
    return undefined
  }
  const callableTarget = (
    expression: ts.Expression,
    frame: Frame,
    ignoreWrites = false,
    seen = new Set<ts.Node>(),
  ):
    | {
        callable: Callable
        owner?: ts.ClassLikeDeclaration
        unsupportedAlias?: boolean
      }
    | undefined => {
    expression = unwrap(expression)
    if (!ignoreWrites && assigned(expression)) return undefined
    const binding = bindingOf(expression)
    const declared = binding ? exportedNode(binding) : declaration(expression)
    if (
      declared &&
      (ts.isFunctionDeclaration(declared) ||
        ts.isVariableDeclaration(declared)) &&
      !ignoreWrites &&
      assigned(declared.name as ts.Expression)
    )
      return undefined
    if (ts.isPropertyAccessExpression(expression)) {
      const owner = receiverClass(
        expression.expression,
        frame,
        new Set(),
        ignoreWrites,
      )
      const member = memberOf(owner, expression.name.text)
      if (
        member &&
        ts.isMethodDeclaration(member) &&
        member.body &&
        (ignoreWrites || !assigned(member.name as ts.Expression))
      )
        return { callable: member, owner }
    }
    if (declared && ts.isFunctionDeclaration(declared) && declared.body)
      return { callable: declared }
    if (
      declared &&
      ts.isVariableDeclaration(declared) &&
      declared.initializer &&
      !seen.has(declared)
    ) {
      seen.add(declared)
      const initializer = unwrap(declared.initializer)
      if (
        ts.isArrowFunction(initializer) ||
        ts.isFunctionExpression(initializer)
      )
        return { callable: initializer }
      const bound =
        ts.isCallExpression(initializer) &&
        ts.isPropertyAccessExpression(initializer.expression) &&
        initializer.expression.name.text === 'bind'
      const original = bound ? initializer.expression.expression : initializer
      const target = callableTarget(original, frame, ignoreWrites, seen)
      if (target)
        return {
          ...target,
          unsupportedAlias:
            target.unsupportedAlias ||
            bound ||
            (!!target.owner &&
              (ts.isPropertyAccessExpression(original) ||
                ts.isElementAccessExpression(original))),
        }
    }
    return undefined
  }
  const callTarget = (
    node: ts.CallExpression,
    frame: Frame,
    ignoreWrites = false,
  ) => callableTarget(node.expression, frame, ignoreWrites)
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
    frame: Frame = {},
  ): string | undefined => {
    node = unwrap(node)
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      return node.text
    if (assigned(node)) return undefined
    const symbol = bindingSymbol(node)
    if (symbol && frame.values?.has(symbol)) return frame.values.get(symbol)
    if (ts.isPropertyAccessExpression(node)) {
      const binding = bindingOf(node.expression)
      const enumNode = binding
        ? exportedNode(binding)
        : declaration(node.expression)
      if (enumNode && ts.isEnumDeclaration(enumNode)) {
        const member = enumNode.members.find(
          (member) => name(member.name) === node.name.text,
        )
        if (member?.initializer) return render(member.initializer, seen, frame)
      }
      if (node.expression.kind === ts.SyntaxKind.ThisKeyword && frame.owner) {
        const member = memberOf(frame.owner, node.name.text)
        if (
          member &&
          ts.isPropertyDeclaration(member) &&
          member.initializer &&
          !assigned(member.name as ts.Expression) &&
          !seen.has(member)
        ) {
          seen.add(member)
          return render(member.initializer, seen, frame)
        }
      }
    }
    if (ts.isTemplateExpression(node)) {
      let value = node.head.text
      for (const span of node.templateSpans) {
        if (/[?#]/.test(value)) return value // Query/fragment values do not affect operation identity.
        const part = render(span.expression, new Set(seen), frame)
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
      const left = render(node.left, new Set(seen), frame)
      const right = render(node.right, new Set(seen), frame)
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
      return render(declared.initializer, seen, frame)
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
  type Finding = Pick<
    Caller,
    'transport' | 'traffic' | 'operationIds' | 'mapping' | 'reason'
  > & { generatedMethodId?: string; via?: SourceLocation[] }
  const graph = new Map<Callable, Callable[]>()
  const callbackEdges = new Map<Callable, Set<Callable>>()
  const terminals = new Map<Callable, number>()
  const reachesTransport = new Set<Callable>()
  const calls: ts.CallExpression[] = []
  for (const file of program.getSourceFiles()) {
    if (
      excludedClientSource(file.fileName, scope.generatedRoot) ||
      program.getSyntacticDiagnostics(file).length
    )
      continue
    visit(file, (node) => {
      if (ts.isCallExpression(node)) calls.push(node)
      if (
        !ts.isMethodDeclaration(node) &&
        !ts.isFunctionDeclaration(node) &&
        !ts.isArrowFunction(node) &&
        !ts.isFunctionExpression(node)
      )
        return
      if (!node.body) return
      const owner = enclosing(node).owner
      const edges: Callable[] = []
      graph.set(node, edges)
      terminals.set(node, 0)
      visitBody(node.body, (child) => {
        if (
          (ts.isArrowFunction(child) || ts.isFunctionExpression(child)) &&
          !ts.isVariableDeclaration(child.parent) &&
          !ts.isPropertyDeclaration(child.parent)
        ) {
          edges.push(child)
          const callbacks = callbackEdges.get(node) ?? new Set<Callable>()
          callbacks.add(child)
          callbackEdges.set(node, callbacks)
          return
        }
        if (!ts.isCallExpression(child)) return
        const access =
          ts.isPropertyAccessExpression(child.expression) ||
          ts.isElementAccessExpression(child.expression)
            ? child.expression
            : undefined
        const binding = access
          ? originalBinding(access.expression)
          : bindingOf(child.expression)
        const exported = binding && exportedAt(binding)
        if (
          (access && http(access.expression)) ||
          (exported && generatedFile(exported.file)) ||
          imported(child.expression, '@angular/common/http', 'httpResource') ||
          (access &&
            imported(
              access.expression,
              '@angular/common/http',
              'httpResource',
            )) ||
          (ts.isIdentifier(child.expression) &&
            child.expression.text === 'fetch' &&
            !declaration(child.expression))
        ) {
          reachesTransport.add(node)
          terminals.set(node, Math.min(2, terminals.get(node)! + 1))
        }
        const target = callTarget(child, { owner })
        if (target && !generatedFile(target.callable.getSourceFile().fileName))
          edges.push(target.callable)
      })
    })
  }
  // A fixed point handles cycles without arbitrarily choosing the first edge.
  let changed = true
  while (changed) {
    changed = false
    for (const [callable, edges] of graph)
      if (
        !reachesTransport.has(callable) &&
        [...edges].some((edge) => reachesTransport.has(edge))
      ) {
        reachesTransport.add(callable)
        changed = true
      }
  }
  // Only a single-terminal forwarder is an implementation node. Multi-operation
  // business methods retain their concrete transport sites as production evidence.
  const terminalCounts = new Map(terminals)
  changed = true
  while (changed) {
    changed = false
    for (const [callable, edges] of graph) {
      const count = Math.min(
        2,
        terminals.get(callable)! +
          edges.reduce(
            (sum, edge) =>
              sum +
              (callbackEdges.get(callable)?.has(edge) &&
              terminalCounts.get(edge)
                ? 2
                : (terminalCounts.get(edge) ?? 0)),
            0,
          ),
      )
      if (count !== terminalCounts.get(callable)) {
        terminalCounts.set(callable, count)
        changed = true
      }
    }
  }
  const implementations = new Set<Callable>()
  for (const call of calls) {
    const target = callTarget(call, { owner: enclosing(call).owner })
    if (target && terminalCounts.get(target.callable) === 1)
      implementations.add(target.callable)
  }
  const classHasTransport = (
    owner: ts.ClassLikeDeclaration | undefined,
  ): boolean => {
    const seen = new Set<ts.Node>()
    while (owner && !seen.has(owner)) {
      seen.add(owner)
      if (
        owner.members.some(
          (member) =>
            ts.isMethodDeclaration(member) && reachesTransport.has(member),
        )
      )
        return true
      owner = baseClass(owner)
    }
    return false
  }
  const inspect = (
    node: ts.CallExpression | ts.NewExpression,
    frame: Frame = {},
    stack = new Set<Callable>(),
  ): Finding[] => {
    const owner = frame.owner ?? enclosing(node).owner
    frame = { ...frame, owner }
    const findings: Finding[] = []
    const access = ts.isPropertyAccessExpression(node.expression)
      ? node.expression
      : undefined
    const add = (finding: Finding) => {
      findings.push(finding)
    }
    const scan = () => {
      if (ts.isCallExpression(node) && assigned(node.expression)) {
        const initialTarget = callTarget(node, frame, true)
        const receiver = memberAccess(node.expression)?.receiver
        const binding = receiver && originalBinding(receiver)
        const original = binding && exportedAt(binding)
        if (
          (initialTarget &&
            (reachesTransport.has(initialTarget.callable) ||
              generatedFile(
                initialTarget.callable.getSourceFile().fileName,
              ))) ||
          (receiver && http(receiver)) ||
          (original && generatedFile(original.file))
        ) {
          add({
            transport: 'unresolved',
            traffic: 'unresolved',
            operationIds: [],
            mapping: 'unresolved',
            via: initialTarget ? [sourceLocation(initialTarget.callable)] : [],
            reason:
              'Transport method/function is reassigned; its declared body cannot establish the called implementation.',
          })
          return
        }
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
      if (access && !receiverClass(access.expression, frame)) {
        const initialBinding = originalBinding(access.expression)
        const originalClass = initialBinding && exportedNode(initialBinding)
        if (
          originalClass &&
          ts.isClassDeclaration(originalClass) &&
          classHasTransport(originalClass)
        ) {
          add({
            transport: 'unresolved',
            traffic: 'unresolved',
            operationIds: [],
            mapping: 'unresolved',
            reason:
              'Source transport-wrapper receiver is reassigned or unsupported; its initial binding cannot establish the called implementation.',
          })
          return
        }
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
        if (
          http(receiver) ||
          (declaration && generatedFile(declaration.file)) ||
          classHasTransport(receiverClass(receiver, frame))
        )
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
            'Generated API receiver binding is unsupported; its initial import does not establish the called transport.',
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
              'HttpClient receiver binding is unsupported; no transport was inferred.',
          })
          return
        }
        const args = node.arguments ?? []
        const method = (
          access.name.text === 'request'
            ? args[0] && render(args[0], new Set(), frame)
            : access.name.text
        )?.toUpperCase()
        const urlNode = args[access.name.text === 'request' ? 1 : 0]
        const url = urlNode && render(urlNode, new Set(), frame)
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
        !callTarget(node as ts.CallExpression, { owner }) &&
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
            'Inherited transport-like call has an unavailable or unsupported base-class binding; no HTTP method, API prefix or operation was inferred.',
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
            : trafficOf(
                node.arguments?.[0] &&
                  render(node.arguments[0], new Set(), frame),
              ),
          operationIds: [],
          mapping: 'unresolved',
          reason: ts.isNewExpression(node)
            ? 'WebSocket construction is separate traffic and excluded from REST adoption.'
            : 'Native fetch transport needs focused analysis; it cannot disappear from remaining work.',
        })
      }
      if (!findings.length && ts.isCallExpression(node)) {
        const target = callTarget(node, frame)
        const initialTarget = target ?? callTarget(node, frame, true)
        if (
          initialTarget &&
          (reachesTransport.has(initialTarget.callable) ||
            generatedFile(initialTarget.callable.getSourceFile().fileName)) &&
          (!target || target.unsupportedAlias)
        ) {
          add({
            transport: 'unresolved',
            traffic: 'unresolved',
            operationIds: [],
            mapping: 'unresolved',
            via: [sourceLocation(initialTarget.callable)],
            reason: !target
              ? 'Transport function alias or receiver is reassigned; its original body cannot establish the called implementation.'
              : 'Bound or extracted transport method alias requires focused receiver/argument analysis; no operation binding was guessed.',
          })
          return
        }
        if (target && reachesTransport.has(target.callable)) {
          if (stack.has(target.callable) || stack.size >= 12) {
            add({
              transport: 'unresolved',
              traffic: 'unresolved',
              operationIds: [],
              mapping: 'unresolved',
              via: [sourceLocation(target.callable)],
              reason:
                'Recursive or deep transport chain exceeds supported static resolution; inspect its dispatch and arguments.',
            })
            return
          }
          const values = new Map<ts.Symbol, string | undefined>()
          for (const [
            index,
            parameter,
          ] of target.callable.parameters.entries()) {
            const symbol = checker.getSymbolAtLocation(parameter.name)
            const argument = node.arguments[index]
            if (symbol)
              values.set(
                symbol,
                argument
                  ? render(argument, new Set(), frame)
                  : parameter.initializer
                    ? render(parameter.initializer, new Set(), frame)
                    : undefined,
              )
          }
          const nested: Finding[] = []
          const next = new Set(stack).add(target.callable)
          if (target.callable.body)
            visitBody(target.callable.body, (child) => {
              if (ts.isCallExpression(child) || ts.isNewExpression(child)) {
                for (const finding of inspect(
                  child,
                  { owner: target.owner, values },
                  next,
                ))
                  nested.push({
                    ...finding,
                    via: [
                      sourceLocation(target.callable),
                      sourceLocation(child),
                      ...(finding.via ?? []),
                    ],
                  })
              }
            })
          if (nested.length === 1)
            add({
              ...nested[0],
              reason: `Resolved source chain: ${nested[0].reason}`,
            })
          else
            add({
              transport: 'unresolved',
              traffic: 'unresolved',
              operationIds: [
                ...new Set(nested.flatMap((finding) => finding.operationIds)),
              ],
              mapping: nested.length ? 'ambiguous' : 'unresolved',
              via: nested.length
                ? nested.flatMap((finding) => finding.via ?? [])
                : [sourceLocation(target.callable)],
              reason: `Transport chain reaches ${nested.length} terminal calls; reconcile multiple branches or unsupported dispatch before assigning one call site to transport.`,
            })
        }
      }
    }
    scan()
    return findings
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
          'Inspect this source call, its recorded chain and URL/receiver; reconcile unsupported dispatch or arguments before claiming complete adoption.',
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
      const { owner, callable, symbol } = enclosing(node)
      const access = ts.isPropertyAccessExpression(node.expression)
        ? node.expression
        : undefined
      const anchor = location(access?.name ?? node.expression, symbol)
      for (const data of inspect(node, { owner })) {
        const caller: Caller = {
          id: `${file.fileName}:${node.getStart(file)}`,
          symbol,
          area: file.fileName.slice(scope.clientRoot.length + 1).split('/')[0],
          location: anchor,
          kind:
            (callable && implementations.has(callable)) ||
            owner?.modifiers?.some(
              (modifier) => modifier.kind === ts.SyntaxKind.AbstractKeyword,
            )
              ? 'wrapper-implementation'
              : 'production',
          via: [],
          ...data,
        }
        result.callers.push(caller)
        if (
          caller.kind === 'production' &&
          (caller.traffic === 'unresolved' ||
            (caller.traffic === 'artemis-rest' &&
              (caller.mapping !== 'resolved' ||
                caller.transport === 'unresolved')))
        )
          issue([anchor, ...caller.via], caller.operationIds, caller.reason)
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
      ['artemis-rest', 'unresolved'].includes(caller.traffic) &&
      caller.operationIds.includes(operation.id),
  )
  if (!callers.length) {
    operation.adoption = {
      state: 'unassessed',
      reason:
        'No supported production caller was bound. Unsupported dispatch and dynamic URLs remain unassessed; absence is not migration or server-only evidence.',
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
  const generated = callers.some(
    (caller) =>
      caller.mapping === 'resolved' && caller.transport === 'generated',
  )
  const manual = callers.some(
    (caller) => caller.mapping === 'resolved' && caller.transport === 'manual',
  )
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
            'Production calls and supported source chains were detected. Unsupported dispatch/dynamic cases constrain exclusive adoption; static calls do not establish runtime migration or protection.',
        }
      : {
          state: 'incomplete-analysis',
          reason:
            'Only ambiguous/unresolved transport candidates were found; inspect their caller diagnostics before asserting operation-level adoption.',
          evidence: callers.map((caller) => caller.location),
        }
}
