import ts from 'typescript'
import {
  operationIdentitySchema,
  type GeneratedMethod,
  type Operation,
  type SourceLocation,
} from '../../src/features/openapi/model'
import { reconcileSpecification, type Specification } from './spec'

export interface GeneratedInventory {
  methods: GeneratedMethod[]
  issues: { evidence: SourceLocation[]; reason: string; nextStep: string }[]
  complete: boolean
  evidence: SourceLocation[]
}
const identityId = (identity: { method: string; path: string }) =>
  `${identity.method} ${identity.path}`
const shape = (id: string) => id.replace(/\{[^}]+\}/g, '{}')
const name = (node: ts.Node) =>
  ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : undefined
const unwrap = (node: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(node) ||
  ts.isAsExpression(node) ||
  ts.isNonNullExpression(node) ||
  ts.isSatisfiesExpression(node)
    ? unwrap(node.expression)
    : node
const literal = (node: ts.Node) =>
  ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : undefined
const visit = (node: ts.Node, action: (node: ts.Node) => void) => {
  action(node)
  node.forEachChild((child) => visit(child, action))
}

/** Syntax/binding analysis of committed generated implementations; never executes or compiles the client. */
export function analyzeGenerated(
  sources: { path: string; content: string }[],
  operations: Operation[],
  specification?: Specification,
  specRevisionMatches = true,
): GeneratedInventory {
  const result: GeneratedInventory = {
    methods: [],
    issues: [],
    complete: true,
    evidence: [],
  }
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
  const program = ts.createProgram(
    [...contents.keys()],
    { noResolve: true, noLib: true },
    host,
  )
  const checker = program.getTypeChecker()
  const issue = (evidence: SourceLocation[], reason: string) => {
    result.complete = false
    result.issues.push({
      evidence,
      reason,
      nextStep:
        'Reconcile this generated implementation and extend focused transport/URL support; re-run before claiming transport absence or a complete percentage.',
    })
  }
  for (const file of program.getSourceFiles()) {
    const location = (node: ts.Node, symbol?: string): SourceLocation => ({
      inputId: 'generated',
      path: file.fileName,
      line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
      ...(symbol ? { symbol } : {}),
    })
    result.evidence.push(location(file))
    const errors = program.getSyntacticDiagnostics(file)
    if (errors.length) {
      for (const error of errors)
        issue(
          [
            {
              inputId: 'generated',
              path: file.fileName,
              line:
                file.getLineAndCharacterOfPosition(error.start ?? 0).line + 1,
            },
          ],
          `Generated TypeScript parse failure: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`,
        )
      continue
    }
    const imports = new Map<ts.Symbol, { module: string; name: string }>()
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
            name: ts.isImportSpecifier(binding)
              ? (binding.propertyName ?? binding.name).text
              : '*',
          })
      }
    }
    const imported = (
      node: ts.Node,
      module: string,
      importedName: string,
    ): boolean => {
      if (ts.isPropertyAccessExpression(node)) {
        const binding = imports.get(
          checker.getSymbolAtLocation(node.expression)!,
        )
        return (
          binding?.module === module &&
          binding.name === '*' &&
          node.name.text === importedName
        )
      }
      const binding = imports.get(checker.getSymbolAtLocation(node)!)
      return binding?.module === module && binding.name === importedName
    }
    const declaration = (node: ts.Expression) =>
      checker.getSymbolAtLocation(
        ts.isPropertyAccessExpression(node) ? node.name : node,
      )?.valueDeclaration
    const httpClient = (
      node: ts.Expression,
      seen = new Set<ts.Node>(),
    ): boolean => {
      node = unwrap(node)
      if (
        ts.isCallExpression(node) &&
        imported(node.expression, '@angular/core', 'inject')
      )
        return (
          !!node.arguments[0] &&
          imported(node.arguments[0], '@angular/common/http', 'HttpClient')
        )
      const declared = declaration(node)
      if (!declared || seen.has(declared)) return false
      seen.add(declared)
      if (
        ts.isParameter(declared) &&
        declared.type &&
        ts.isTypeReferenceNode(declared.type)
      )
        return imported(
          declared.type.typeName,
          '@angular/common/http',
          'HttpClient',
        )
      return (
        (ts.isPropertyDeclaration(declared) ||
          ts.isVariableDeclaration(declared)) &&
        !!declared.initializer &&
        httpClient(declared.initializer, seen)
      )
    }
    const render = (
      expression: ts.Expression,
      seen = new Set<ts.Node>(),
    ): string => {
      const node = unwrap(expression)
      const text = literal(node)
      if (text !== undefined) return text
      if (ts.isTemplateExpression(node)) {
        let value = node.head.text
        for (const span of node.templateSpans) {
          if (value.includes('?') || value.includes('#')) break
          value += render(span.expression, new Set(seen)) + span.literal.text
        }
        return value
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.PlusToken
      )
        return (
          render(node.left, new Set(seen)) + render(node.right, new Set(seen))
        )
      if (ts.isConditionalExpression(node)) {
        const prefix = ts.isTemplateExpression(node.whenTrue)
          ? node.whenTrue.head.text
          : literal(node.whenTrue)
        if (prefix?.startsWith('?') && literal(node.whenFalse) === '')
          return '?'
        if (
          ts.isCallExpression(node.whenTrue) &&
          ts.isIdentifier(node.whenTrue.expression) &&
          ts.isIdentifier(node.whenFalse) &&
          node.whenTrue.expression.text === node.whenFalse.text &&
          ts.isBinaryExpression(node.condition) &&
          ts.isTypeOfExpression(node.condition.left) &&
          node.condition.left.expression.getText(file) ===
            node.whenFalse.text &&
          node.condition.operatorToken.kind ===
            ts.SyntaxKind.EqualsEqualsEqualsToken &&
          literal(node.condition.right) === 'function'
        )
          return render(node.whenFalse, seen)
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        ['encodeURIComponent', 'String'].includes(node.expression.text) &&
        !checker.getSymbolAtLocation(node.expression)?.valueDeclaration &&
        node.arguments.length === 1
      )
        return render(node.arguments[0], seen)
      const declared = declaration(node)
      if (declared && !seen.has(declared)) {
        seen.add(declared)
        if (ts.isParameter(declared) && ts.isIdentifier(declared.name))
          return `{${declared.name.text}}`
        if (
          (ts.isVariableDeclaration(declared) ||
            ts.isPropertyDeclaration(declared)) &&
          declared.initializer
        ) {
          if (
            ts.isVariableDeclaration(declared) &&
            !(declared.parent.flags & ts.NodeFlags.Const)
          )
            throw new Error('Mutable URL binding')
          if (
            ts.isPropertyDeclaration(declared) &&
            !declared.modifiers?.some(
              (modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword,
            )
          )
            throw new Error('Mutable URL property')
          return render(declared.initializer, seen)
        }
      }
      throw new Error(`Unsupported URL expression: ${node.getText(file)}`)
    }
    const parseIdentity = (method: string, url: ts.Expression) => {
      const rendered = render(url).split(/[?#]/, 1)[0]
      // Whole-URL parameters and external/configurable bases are not path placeholders.
      if (
        !rendered.startsWith('/') ||
        rendered.startsWith('//') ||
        rendered.includes('//') ||
        /[\\\s]/.test(rendered)
      )
        throw new Error(`Unsupported generated URL/base: ${rendered}`)
      return operationIdentitySchema.parse({
        method: method.toUpperCase(),
        path: rendered,
      })
    }
    type Owner =
      | ts.MethodDeclaration
      | ts.FunctionDeclaration
      | ts.VariableDeclaration
      | ts.PropertyDeclaration
    const ownerOf = (node: ts.Node): Owner | undefined => {
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (ts.isMethodDeclaration(parent) || ts.isFunctionDeclaration(parent))
          return parent
        if (
          (ts.isVariableDeclaration(parent) ||
            ts.isPropertyDeclaration(parent)) &&
          parent.initializer &&
          (ts.isArrowFunction(parent.initializer) ||
            ts.isFunctionExpression(parent.initializer))
        )
          return parent
      }
      return undefined
    }
    const symbolOf = (owner: Owner) => {
      const member = owner.name ? name(owner.name) : undefined
      const container = owner.parent
      const className = ts.isClassDeclaration(container)
        ? container.name?.text
        : undefined
      return className && member ? `${className}.${member}` : member
    }
    const publicExport = (owner: Owner) => {
      const exported = (node: ts.Node) =>
        ts.canHaveModifiers(node) &&
        ts
          .getModifiers(node)
          ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      if (ts.isMethodDeclaration(owner) || ts.isPropertyDeclaration(owner))
        return (
          ts.isClassDeclaration(owner.parent) &&
          exported(owner.parent) &&
          !owner.modifiers?.some((modifier) =>
            [
              ts.SyntaxKind.PrivateKeyword,
              ts.SyntaxKind.ProtectedKeyword,
            ].includes(modifier.kind),
          )
        )
      return exported(
        ts.isVariableDeclaration(owner) ? owner.parent.parent : owner,
      )
    }
    const returnedTransport = (call: ts.Node, owner: Owner) => {
      let returned = false
      for (
        let parent: ts.Node | undefined = call;
        parent && parent !== owner;
        parent = parent.parent
      ) {
        if (ts.isReturnStatement(parent)) returned = true
        if (ts.isFunctionLike(parent)) {
          if (
            (ts.isVariableDeclaration(owner) ||
              ts.isPropertyDeclaration(owner)) &&
            owner.initializer === parent
          )
            return (
              returned ||
              (ts.isArrowFunction(parent) && !ts.isBlock(parent.body))
            )
          return false
        }
      }
      return returned
    }
    const groups = new Map<
      Owner,
      {
        transport: GeneratedMethod['transport']
        identities: ReturnType<typeof parseIdentity>[]
        calls: SourceLocation[]
        unresolved: boolean
      }
    >()
    const resourceFactory = (
      expression: ts.Expression,
      seen = new Set<ts.Node>(),
    ): { variant: 'json' | 'text' | 'blob'; mutable: boolean } | undefined => {
      const node = unwrap(expression)
      if (imported(node, '@angular/common/http', 'httpResource'))
        return { variant: 'json', mutable: false }
      if (
        ts.isPropertyAccessExpression(node) &&
        (node.name.text === 'text' || node.name.text === 'blob')
      ) {
        const factory = resourceFactory(node.expression, new Set(seen))
        if (factory?.variant === 'json')
          return { ...factory, variant: node.name.text }
      }
      const declared = declaration(node)
      if (!declared || seen.has(declared)) return
      seen.add(declared)
      if (
        (ts.isVariableDeclaration(declared) ||
          ts.isPropertyDeclaration(declared)) &&
        declared.initializer
      ) {
        const factory = resourceFactory(declared.initializer, seen)
        if (factory)
          return {
            ...factory,
            mutable:
              factory.mutable ||
              (ts.isVariableDeclaration(declared)
                ? !(declared.parent.flags & ts.NodeFlags.Const)
                : !declared.modifiers?.some(
                    (modifier) =>
                      modifier.kind === ts.SyntaxKind.ReadonlyKeyword,
                  )),
          }
      }
    }
    visit(file, (node) => {
      if (!ts.isCallExpression(node)) return
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'fetch' &&
        !checker.getSymbolAtLocation(node.expression)?.valueDeclaration
      ) {
        issue(
          [location(node)],
          'Generated fetch transport is outside Angular HTTP extraction support',
        )
        return
      }
      const resource = resourceFactory(node.expression)
      const http =
        ts.isPropertyAccessExpression(node.expression) &&
        httpClient(node.expression.expression)
      if (!resource && !http) return
      const owner = ownerOf(node)
      const symbol = owner && symbolOf(owner)
      if (!owner || !symbol) {
        issue(
          [location(node)],
          'Generated HTTP implementation has no supported named API/function owner',
        )
        return
      }
      const transport = resource ? 'resource-helper' : 'observable'
      const group = groups.get(owner) ?? {
        transport,
        identities: [],
        calls: [],
        unresolved: false,
      }
      groups.set(owner, group)
      group.calls.push(location(node, symbol))
      try {
        if (!returnedTransport(node, owner))
          throw new Error(
            'Indirect/non-returned generated transport requires reconciliation',
          )
        if (group.transport !== transport)
          throw new Error(
            'One generated symbol mixes Observable and resource implementations',
          )
        if (resource) {
          if (resource.mutable)
            throw new Error('Mutable httpResource factory binding')
          const callback = node.arguments[0]
          if (
            !callback ||
            !(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
          )
            throw new Error('Unsupported httpResource callback')
          const requests: ts.Expression[] = []
          const returned = (expression: ts.Expression) => {
            if (ts.isIdentifier(expression) && expression.text === 'undefined')
              return
            requests.push(unwrap(expression))
          }
          if (ts.isBlock(callback.body)) {
            const returns = (child: ts.Node) => {
              if (child !== callback.body && ts.isFunctionLike(child)) return
              if (ts.isReturnStatement(child) && child.expression)
                returned(child.expression)
              child.forEachChild(returns)
            }
            returns(callback.body)
          } else returned(callback.body)
          if (!requests.length)
            throw new Error('httpResource has no request return')
          for (const request of requests) {
            let method = 'GET'
            let url: ts.Expression = request
            if (ts.isObjectLiteralExpression(request)) {
              for (const entry of request.properties) {
                if (ts.isSpreadAssignment(entry))
                  throw new Error(
                    'Resource request object spread is unsupported',
                  )
                if (ts.isComputedPropertyName(entry.name))
                  throw new Error(
                    'Computed resource request property is unsupported',
                  )
              }
              const property = (key: string) => {
                const entries = request.properties.filter(
                  (entry) =>
                    !ts.isSpreadAssignment(entry) && name(entry.name) === key,
                )
                if (!entries.length) return
                if (
                  entries.length !== 1 ||
                  !ts.isPropertyAssignment(entries[0])
                )
                  throw new Error(
                    `Unsupported or duplicate resource ${key} property`,
                  )
                return entries[0]
              }
              const urlProperty = property('url')
              if (!urlProperty)
                throw new Error('Resource request has no supported URL')
              url = urlProperty.initializer
              const methodProperty = property('method')
              if (methodProperty) {
                const value = literal(methodProperty.initializer)
                if (!value) throw new Error('Dynamic resource HTTP method')
                method = value
              }
            }
            group.identities.push(parseIdentity(method, url))
          }
        } else if (ts.isPropertyAccessExpression(node.expression)) {
          let method = node.expression.name.text
          let url = node.arguments[0]
          if (method === 'request') {
            const value = url && literal(url)
            if (!value)
              throw new Error(
                'Unsupported HttpClient.request method/HttpRequest overload',
              )
            method = value
            url = node.arguments[1]
          }
          if (!url) throw new Error('HTTP implementation has no URL argument')
          group.identities.push(parseIdentity(method, url))
        }
      } catch (error) {
        group.unresolved = true
        issue(
          [location(node, symbol)],
          String(error instanceof Error ? error.message : error),
        )
      }
    })
    // A generated wrapper/declaration without an indexed implementation is not evidence of absence.
    visit(file, (node) => {
      if (
        !(
          ts.isMethodDeclaration(node) ||
          ts.isFunctionDeclaration(node) ||
          ts.isVariableDeclaration(node) ||
          ts.isPropertyDeclaration(node)
        ) ||
        groups.has(node)
      )
        return
      const callable =
        ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)
          ? node
          : node.initializer &&
              (ts.isArrowFunction(node.initializer) ||
                ts.isFunctionExpression(node.initializer))
            ? node.initializer
            : undefined
      if (!callable?.body) return
      const returnName =
        callable.type && ts.isTypeReferenceNode(callable.type)
          ? callable.type.typeName
          : undefined
      if (
        !returnName ||
        !(
          imported(returnName, 'rxjs', 'Observable') ||
          imported(returnName, '@angular/common/http', 'HttpResourceRef')
        )
      ) {
        if (
          (ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node)) &&
          ts.isClassDeclaration(node.parent) &&
          node.parent.name?.text.endsWith('Api') &&
          publicExport(node)
        )
          issue(
            [location(node, symbolOf(node))],
            'Unrecognized public generated API implementation requires transport reconciliation',
          )
        return
      }
      const symbol = symbolOf(node)
      if (!symbol) return
      const transport = imported(returnName, 'rxjs', 'Observable')
        ? 'observable'
        : 'resource-helper'
      groups.set(node, {
        transport,
        identities: [],
        calls: [location(node, symbol)],
        unresolved: true,
      })
      issue(
        [location(node, symbol)],
        'Generated transport declaration has an unsupported delegated/indirect implementation',
      )
    })
    for (const [owner, group] of groups) {
      const symbol = symbolOf(owner)!
      const duplicateSymbol =
        [...groups.keys()].filter((candidate) => symbolOf(candidate) === symbol)
          .length > 1
      if (duplicateSymbol)
        issue(
          group.calls,
          `Duplicate generated implementation symbol: ${symbol}`,
        )
      if (!publicExport(owner)) {
        group.unresolved = true
        issue(
          [location(owner, symbol)],
          'HTTP transport is not on a supported exported/public generated API surface',
        )
      }
      const identities = [
        ...new Map(
          group.identities.map((identity) => [identityId(identity), identity]),
        ).values(),
      ].sort((a, b) => identityId(a).localeCompare(identityId(b), 'en'))
      const candidates = operations.filter((operation) =>
        identities.some(
          (identity) => shape(operation.id) === shape(identityId(identity)),
        ),
      )
      const exact =
        !duplicateSymbol &&
        !group.unresolved &&
        identities.length === 1 &&
        candidates.length === 1 &&
        candidates[0].id === identityId(identities[0])
      const ambiguous =
        duplicateSymbol ||
        identities.length > 1 ||
        (!group.unresolved && candidates.length > 0 && !exact)
      const mapping = exact
        ? 'resolved'
        : ambiguous
          ? 'ambiguous'
          : 'unresolved'
      const reason = exact
        ? 'Actual HTTP method/path matches one independent server operation; availability does not establish adoption or wire compatibility'
        : group.unresolved
          ? 'Unsupported generated implementation prevents an exclusive transport mapping'
          : ambiguous
            ? 'Multiple transport identities or distinct server template candidates remain ambiguous'
            : 'Actual generated identity has no independent server match; retain it without adding it to the server denominator'
      const record: GeneratedMethod = {
        id: `${file.fileName}#${symbol}:${owner.getStart(file)}`,
        symbol,
        location: location(owner.name ?? owner, symbol),
        transport: group.transport,
        operationIds: candidates.map((operation) => operation.id).sort(),
        mapping,
        reason,
        identities: identities.map((identity) => ({
          ...identity,
          specification: reconcileSpecification(
            identityId(identity),
            specification,
            specRevisionMatches,
          ),
        })),
        implementations: group.calls,
      }
      result.methods.push(record)
      if (identities.length > 1)
        issue(
          group.calls,
          'One generated symbol contains multiple HTTP identities; reconcile branches before selecting a mapping',
        )
    }
  }
  if (!sources.length)
    issue(
      [],
      'Generated output contains no assessable TypeScript implementations',
    )
  result.methods.sort((a, b) => a.id.localeCompare(b.id, 'en'))
  return result
}

export function reconcileGenerated(
  id: string,
  inventory: GeneratedInventory | undefined,
): Operation['generatedTransport'] {
  if (!inventory)
    return {
      state: 'unknown',
      reason: 'Committed generated output is unavailable',
    }
  const candidates = inventory.methods.filter((method) =>
    method.operationIds.includes(id),
  )
  const resolved = candidates.filter((method) => method.mapping === 'resolved')
  if (resolved.length)
    return {
      state: 'available',
      methodIds: resolved.map((method) => method.id),
      evidence: resolved.flatMap(
        (method) => method.implementations ?? [method.location],
      ),
      reason:
        'At least one actual generated implementation resolves to this identity; production adoption and runtime compatibility remain unassessed',
    }
  if (candidates.some((method) => method.mapping === 'ambiguous'))
    return {
      state: 'ambiguous',
      methodIds: candidates.map((method) => method.id),
      evidence: candidates.map((method) => method.location),
      reason:
        'Generated implementations have multiple identities or structurally similar server templates',
    }
  return inventory.complete
    ? {
        state: 'missing',
        methodIds: [],
        evidence: inventory.evidence.slice(0, 1),
        scanEvidenceId: 'generated-source-scan',
        reason:
          'No implementation for this identity in the complete parsed committed generated-output scope; the generation cause is unknown',
      }
    : {
        state: 'incomplete-analysis',
        evidence: inventory.evidence.length ? inventory.evidence : undefined,
        reason:
          'Unsupported or unparseable generated implementations prevent an absence claim; inspect generated diagnostics',
      }
}
