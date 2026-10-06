import {
  parseTemplate,
  tmplAstVisitAll,
  TmplAstRecursiveVisitor,
  TmplAstElement,
  TmplAstTemplate,
  ASTWithSource,
  Interpolation,
  BindingType,
} from '@angular/compiler'
import ts from 'typescript'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, matchesGlob, posix } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  analyzerVersion,
  appRoot,
  deriveClosures,
  sectionOf,
  stageOf,
  usesLibrary,
  webapp,
  unitPath,
  type Detail,
  type Section,
  type Summary,
  type Totals,
  type Unit,
} from '../../src/features/migrations/model'

// The exports of rules/no-bootstrap-classes.mjs, Artemis's own regression-lock matcher.
export type Rule = {
  isBanned(token: string): boolean
  bannedClassesInBindingExpression(source: string): string[]
}
export type Kit = {
  elements: Set<string>
  attributes: Set<string>
  components: number
}
type Usage = Record<string, number>
type Library = 'primeng' | 'ngBootstrap' | 'tumUi'
type TemplateResult = Record<Library | 'tokens', Usage> & {
  errors: string[]
  spacing: number
  tailwind: boolean
}
type Declaration = {
  kind: 'component' | 'directive'
  className?: string
  // Abstract base classes carry a decorator for inheritance but are never rendered themselves.
  abstract?: boolean
  selector?: string
  templateUrl?: string
  template?: string
  styleUrls: string[]
}
type ScriptResult = {
  declarations: Declaration[]
  // Value imports of app files with the imported names; dynamic imports carry no names.
  dependencies: { base: string; names?: string[] }[]
  // Route definitions found in this file, keyed by the array that holds them.
  routes: Map<string, RouteNode[]>
  services: Record<Library, Usage>
  tokens: Usage
  // String enums declared here: enum name → member → value (route paths use them).
  enums: Map<string, Map<string, string>>
  // Imported names with the module they come from, to follow route arrays and enums across files.
  imports: Map<string, { base: string; name: string }>
}
export type StyleResult = { variables: number; colors: number; imports: number }
type Reference = { base: string; name?: string }
export type RouteNode = {
  // `undefined` when the path is not a string literal.
  path?: string
  outlet: boolean
  component?: Reference
  children: RouteNode[]
  // `children: someArray` in the same file, or `loadChildren` into another file.
  // `children: name` (an array here or imported) and `...name` inside a routes array.
  childrenRef?: string
  spreads?: string[]
  // `path: Enum.MEMBER`, resolved once all files are read.
  pathRef?: { enumName: string; member: string }
  loadChildren?: Reference
}

// Where Artemis has kept its rule and its kit over time; the newest location comes first. A move
// that is not listed here fails the analysis instead of silently changing the numbers.
export const rulePaths = [
  'config/eslint/rules/no-bootstrap-classes.mjs',
  'rules/no-bootstrap-classes.mjs',
]
const kitPackage = '@tumaet/ui-angular'
const legacyKitDir = `${appRoot}/shared-ui/tum-ui`

// The kit was renamed from TUM UI to TUM AET UI (Artemis #13981): `tum-ui-button` became
// `tumaet-ui-button` and `tumUiTooltip` became `tumAetUiTooltip`. Selectors are recorded under
// the current names so usage, inventories and kit targets stay continuous across the rename.
export const kitName = (selector: string) =>
  selector
    .replace(/^tum-ui-/, 'tumaet-ui-')
    .replace(/^tumUi(?=[A-Z])/, 'tumAetUi')
    .replace(/^TumUi(?=[A-Z])/, 'TumAetUi')

const libraryOf = (pkg: string): Library | undefined =>
  /^primeng(?:\/|$)/.test(pkg)
    ? 'primeng'
    : /^@ng-bootstrap\//.test(pkg)
      ? 'ngBootstrap'
      : pkg === kitPackage
        ? 'tumUi'
        : undefined

// A library class used as a dependency rather than in the template: injected with inject() or
// a constructor parameter, provided, or extended. Imports into a component's `imports` array,
// view queries and type annotations are not usage on their own.
const libraryUse = (identifier: ts.Identifier) => {
  let node: ts.Node = identifier
  while (ts.isPropertyAccessExpression(node.parent)) node = node.parent
  const parent = node.parent
  if (ts.isCallExpression(parent) && parent.arguments[0] === node)
    return (
      ts.isIdentifier(parent.expression) && parent.expression.text === 'inject'
    )
  if (ts.isExpressionWithTypeArguments(parent))
    return (
      ts.isHeritageClause(parent.parent) &&
      parent.parent.token === ts.SyntaxKind.ExtendsKeyword
    )
  if (ts.isTypeReferenceNode(parent))
    return (
      ts.isParameter(parent.parent) &&
      parent.parent.type === parent &&
      ts.isConstructorDeclaration(parent.parent.parent)
    )
  if (ts.isArrayLiteralExpression(parent))
    return (
      ts.isPropertyAssignment(parent.parent) &&
      propertyName(parent.parent.name) === 'providers'
    )
  return false
}
// Bootstrap's spacing scale keeps its class names under Tailwind but changes value; it is not banned.
const spacingClass = /^(?:[mp][tbsexy]?-(?:[0-5]|auto)|gap-[0-5])$/
// Utilities that exist only in Tailwind, as evidence that a template already uses it.
const tailwindClass =
  /^(?:(?:sm|md|lg|xl|2xl):)?(?:flex-(?:col|row|wrap|1|none)|inline-flex|grid-cols-\d+|col-span-\d+|items-(?:start|end|center|baseline|stretch)|justify-(?:start|end|center|between|around|evenly)|gap-(?:[6-9]|\d{2}|x-\d+|y-\d+)|(?:text|bg|border)-state-[a-z]+|w-full|h-full|hidden|truncate|rounded-(?:md|lg|xl|full)|shrink-0|grow|min-w-0)$/
const bump = (usage: Usage, key: string, by = 1) => {
  usage[key] = (usage[key] ?? 0) + by
}
const merge = (into: Usage, from: Usage | undefined) => {
  for (const [key, n] of Object.entries(from ?? {})) bump(into, key, n)
  return into
}
const sum = (usage: Usage) => Object.values(usage).reduce((a, b) => a + b, 0)
const isClassList = (name: string) =>
  name === 'class' || name === 'styleClass' || name.endsWith('StyleClass')
const stringText = (node: ts.Node) =>
  ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : undefined
const propertyName = (name: ts.PropertyName) =>
  ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined

export function parseLockGlobs(eslintConfig: string): string[] {
  const file = ts.createSourceFile(
    'eslint.config.mjs',
    eslintConfig,
    ts.ScriptTarget.Latest,
    true,
  )
  const blocks: string[][] = []
  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const property = (name: string) =>
        node.properties.find(
          (p): p is ts.PropertyAssignment =>
            ts.isPropertyAssignment(p) && propertyName(p.name) === name,
        )?.initializer
      const rules = property('rules')
      const files = property('files')
      if (
        rules &&
        ts.isObjectLiteralExpression(rules) &&
        rules.properties.some(
          (p) =>
            ts.isPropertyAssignment(p) &&
            propertyName(p.name) === 'localRules/no-bootstrap-classes',
        ) &&
        files &&
        ts.isArrayLiteralExpression(files)
      )
        blocks.push(
          files.elements.map((e) => {
            const text = stringText(e)
            if (text === undefined)
              throw new Error('Lock list contains a non-literal entry')
            return text
          }),
        )
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  if (blocks.length !== 1 || !blocks[0].length)
    throw new Error(
      `Expected one regression lock block, found ${blocks.length}`,
    )
  return blocks[0]
}

export function parseTailwindSources(tailwindCss: string): string[] {
  return [...tailwindCss.matchAll(/^@source\s+'([^']+)'/gm)].map((m) =>
    posix.join('src/main/webapp', m[1]),
  )
}

// The kit's sources: the workspace package published as @tumaet/ui-angular, or the in-app copy
// it started as.
export function kitDir(root: string) {
  const packages = join(root, 'packages')
  if (existsSync(packages))
    for (const entry of readdirSync(packages, { withFileTypes: true })) {
      const manifest = join(packages, entry.name, 'package.json')
      if (
        entry.isDirectory() &&
        existsSync(manifest) &&
        JSON.parse(readFileSync(manifest, 'utf8')).name === kitPackage
      )
        return `packages/${entry.name}/src/lib`
    }
  if (existsSync(join(root, legacyKitDir))) return legacyKitDir
  throw new Error(
    `Kit sources not found: no packages/*/package.json named ${kitPackage}`,
  )
}

// The paths of a commit the analysis reads: the client, the lint configuration with the rule,
// and each workspace package's manifest and library sources (one of them is the kit).
export function analyzedPaths(
  git: (...args: string[]) => string,
  commit: string,
  client = true,
) {
  const packages = git('ls-tree', '-d', '--name-only', commit, 'packages/')
    .split('\n')
    .filter(Boolean)
    .flatMap((p) => [
      `${p}/package.json`,
      `${p}/src/lib`,
      `${p}/src/public-api.ts`,
    ])
  return git(
    'ls-tree',
    '--name-only',
    commit,
    '--',
    ...(client
      ? ['src/main/webapp/app', 'src/main/webapp/content']
      : [legacyKitDir]),
    'src/main/webapp/tailwind.css',
    'eslint.config.mjs',
    ...rulePaths,
    ...packages,
  )
    .split('\n')
    .filter(Boolean)
}

// The class names the package exports from src/public-api.ts; undefined when it has none.
function publicApi(root: string, dir: string) {
  const path = join(root, dirname(dir), 'public-api.ts')
  if (!existsSync(path)) return undefined
  const file = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
  )
  const names = new Set<string>()
  for (const statement of file.statements)
    if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    )
      for (const element of statement.exportClause.elements)
        if (!element.isTypeOnly) names.add(element.name.text)
  return names.size ? names : undefined
}

export function readKit(root: string): Kit {
  const kit: Kit = { elements: new Set(), attributes: new Set(), components: 0 }
  const dir = kitDir(root)
  const exported = publicApi(root, dir)
  for (const path of listFiles(root, dir).filter(
    (p) => p.endsWith('.ts') && !/\.(spec|stories|d)\.ts$/.test(p),
  ))
    for (const { kind, selector, className } of analyzeScript(
      path,
      readFileSync(join(root, path), 'utf8'),
    ).declarations) {
      // Internal building blocks (chart axes, tooltip content) are not part of the kit.
      if (exported && !(className && exported.has(className))) continue
      if (kind === 'component') kit.components++
      for (const part of selector?.split(',') ?? []) {
        const attribute = /\[(\w+)\]/.exec(part)?.[1]
        if (attribute) kit.attributes.add(kitName(attribute))
        else if (/^[\w-]+$/.test(part.trim()))
          kit.elements.add(kitName(part.trim()))
      }
    }
  return kit
}

export function analyzeTemplate(
  text: string,
  path: string,
  rule: Rule,
  kit: Kit,
): TemplateResult {
  const result: TemplateResult = {
    tokens: {},
    primeng: {},
    ngBootstrap: {},
    tumUi: {},
    errors: [],
    spacing: 0,
    tailwind: false,
  }
  const classes = (value: string) => {
    for (const token of value.split(/\s+/)) {
      if (!token) continue
      if (rule.isBanned(token)) bump(result.tokens, token)
      if (spacingClass.test(token)) result.spacing++
      if (tailwindClass.test(token)) result.tailwind = true
    }
  }
  const inspect = (node: TmplAstElement | TmplAstTemplate) => {
    // `<p-x *ngIf>` is an implicit template around the element, which is visited itself.
    const name = node instanceof TmplAstElement ? node.name : ''
    if (name.startsWith('p-')) bump(result.primeng, name)
    if (name.startsWith('ngb-')) bump(result.ngBootstrap, name)
    if (kit.elements.has(kitName(name))) bump(result.tumUi, kitName(name))
    // A structural directive's implicit template repeats the host element's attributes.
    const attrs =
      node instanceof TmplAstTemplate && node.tagName !== 'ng-template'
        ? node.templateAttrs
        : [...node.attributes, ...node.inputs, ...node.outputs]
    for (const attr of attrs) {
      if (/^p[A-Z]\w*$/.test(attr.name)) bump(result.primeng, attr.name)
      if (/^ngb[A-Z]\w*$/.test(attr.name)) bump(result.ngBootstrap, attr.name)
      if (kit.attributes.has(kitName(attr.name)))
        bump(result.tumUi, kitName(attr.name))
      if (!('value' in attr)) continue
      if (typeof attr.value === 'string') {
        if (isClassList(attr.name)) classes(attr.value)
        continue
      }
      // [class.btn] normalizes to the binding name; interpolations keep their static chunks.
      if ('type' in attr && attr.type === BindingType.Class) classes(attr.name)
      if (!isClassList(attr.name) && attr.name !== 'ngClass') continue
      const value = attr.value instanceof ASTWithSource ? attr.value : undefined
      if (value?.ast instanceof Interpolation)
        value.ast.strings.forEach(classes)
      else
        for (const token of rule.bannedClassesInBindingExpression(
          value?.source ?? '',
        ))
          bump(result.tokens, token)
    }
  }
  class Visitor extends TmplAstRecursiveVisitor {
    override visitElement(element: TmplAstElement) {
      inspect(element)
      super.visitElement(element)
    }
    override visitTemplate(template: TmplAstTemplate) {
      inspect(template)
      super.visitTemplate(template)
    }
  }
  const parsed = parseTemplate(text, path, { preserveWhitespaces: false })
  result.errors = parsed.errors?.map((e) => e.msg) ?? []
  tmplAstVisitAll(new Visitor(), parsed.nodes)
  return result
}

export function analyzeScript(path: string, source: string): ScriptResult {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  const result: ScriptResult = {
    declarations: [],
    dependencies: [],
    routes: new Map(),
    services: { primeng: {}, ngBootstrap: {}, tumUi: {} },
    tokens: {},
    enums: new Map(),
    imports: new Map(),
  }
  const angular = new Map<string, string>()
  const namespaces = new Set<string>()
  const localImports = new Map<string, { specifier: string; name: string }>()
  // Library classes this file imports; used as values they are usage without template evidence.
  const libraryNames = new Map<string, { library: Library; name: string }>()
  const resolveBase = (specifier: string) =>
    specifier.startsWith('.')
      ? posix.join(dirname(path), specifier)
      : specifier.startsWith('app/')
        ? `${appRoot}/${specifier.slice(4)}`
        : undefined
  const dependency = (specifier: string, names?: string[]) => {
    const base = resolveBase(specifier)
    if (base) result.dependencies.push({ base, names })
  }
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.importClause?.isTypeOnly
    )
      continue
    const pkg = statement.moduleSpecifier.text
    const bindings = statement.importClause?.namedBindings
    const names =
      bindings && ts.isNamedImports(bindings)
        ? bindings.elements
            .filter((e) => !e.isTypeOnly)
            .map((e) => ({
              local: e.name.text,
              exported: (e.propertyName ?? e.name).text,
            }))
        : []
    if (pkg === '@angular/core') {
      if (bindings && ts.isNamespaceImport(bindings))
        namespaces.add(bindings.name.text)
      for (const { local, exported } of names) angular.set(local, exported)
    }
    for (const { local, exported } of names)
      localImports.set(local, { specifier: pkg, name: exported })
    const library = libraryOf(pkg)
    if (library)
      for (const { local, exported } of names)
        libraryNames.set(local, { library, name: kitName(exported) })
    const base = resolveBase(pkg)
    if (base)
      for (const { local, exported } of names)
        result.imports.set(local, { base, name: exported })
    dependency(
      pkg,
      bindings && ts.isNamespaceImport(bindings)
        ? undefined
        : names.map((n) => n.exported),
    )
  }
  const decoratorName = (decorator: ts.Decorator) => {
    if (!ts.isCallExpression(decorator.expression)) return
    const callee = decorator.expression.expression
    if (ts.isIdentifier(callee)) return angular.get(callee.text)
    if (
      ts.isPropertyAccessExpression(callee) &&
      ts.isIdentifier(callee.expression) &&
      namespaces.has(callee.expression.text)
    )
      return callee.name.text
  }
  const classTokens = (text: string) => {
    for (const token of text.split(/\s+/)) if (token) bump(result.tokens, token)
  }
  const metadata = (decorator: ts.Decorator, declaration: Declaration) => {
    const argument = (decorator.expression as ts.CallExpression).arguments[0]
    if (!argument || !ts.isObjectLiteralExpression(argument)) return
    for (const property of argument.properties) {
      if (!ts.isPropertyAssignment(property)) continue
      const value = property.initializer
      const text = stringText(value)
      switch (propertyName(property.name)) {
        case 'selector':
          declaration.selector = text
          break
        case 'templateUrl':
          declaration.templateUrl = text
          break
        case 'template':
          declaration.template = text
          break
        case 'styleUrl':
          if (text) declaration.styleUrls.push(text)
          break
        case 'styleUrls':
          if (ts.isArrayLiteralExpression(value))
            for (const element of value.elements) {
              const url = stringText(element)
              if (url) declaration.styleUrls.push(url)
            }
          break
        case 'host':
          if (ts.isObjectLiteralExpression(value))
            for (const binding of value.properties) {
              if (!ts.isPropertyAssignment(binding)) continue
              const key = propertyName(binding.name) ?? ''
              const bound = /^\[?class\.([\w-]+)\]?$/.exec(key)?.[1]
              if (bound) classTokens(bound)
              else if (key === 'class') {
                const text = stringText(binding.initializer)
                if (text) classTokens(text)
              }
            }
      }
    }
  }
  // `() => import('./x').then((m) => m.X)` → { base, name }; `() => import('./x')` → { base }.
  const lazy = (node: ts.Node): Reference | undefined => {
    let specifier: string | undefined
    let name: string | undefined
    const find = (n: ts.Node) => {
      if (
        ts.isCallExpression(n) &&
        n.expression.kind === ts.SyntaxKind.ImportKeyword
      )
        specifier = n.arguments[0] && stringText(n.arguments[0])
      if (
        ts.isArrowFunction(n) &&
        n.parameters[0] &&
        ts.isIdentifier(n.parameters[0].name)
      ) {
        const parameter = n.parameters[0].name.text
        const pick = (b: ts.Node) => {
          if (
            ts.isPropertyAccessExpression(b) &&
            ts.isIdentifier(b.expression) &&
            b.expression.text === parameter
          )
            name = b.name.text
          ts.forEachChild(b, pick)
        }
        pick(n.body)
      }
      ts.forEachChild(n, find)
    }
    find(node)
    const base = specifier && resolveBase(specifier)
    return base ? { base, name } : undefined
  }
  const routeNode = (literal: ts.ObjectLiteralExpression): RouteNode => {
    const node: RouteNode = { outlet: false, children: [] }
    for (const property of literal.properties) {
      if (!ts.isPropertyAssignment(property)) continue
      const value = property.initializer
      switch (propertyName(property.name)) {
        case 'path':
          node.path = stringText(value)
          if (
            node.path === undefined &&
            ts.isPropertyAccessExpression(value) &&
            ts.isIdentifier(value.expression)
          )
            node.pathRef = {
              enumName: value.expression.text,
              member: value.name.text,
            }
          break
        case 'outlet':
          node.outlet = true
          break
        case 'component':
          if (ts.isIdentifier(value)) {
            const target = localImports.get(value.text)
            const base = target && resolveBase(target.specifier)
            if (base) node.component = { base, name: target.name }
          }
          break
        case 'loadComponent':
          node.component = lazy(value)
          break
        case 'children':
          if (ts.isArrayLiteralExpression(value))
            node.children = routeNodes(value)
          else if (ts.isIdentifier(value)) node.childrenRef = value.text
          break
        case 'loadChildren':
          node.loadChildren = lazy(value)
      }
    }
    return node
  }
  // Route objects with a path, plus `...name` spreads of route arrays defined elsewhere, which
  // contribute siblings at the same level.
  const routeNodes = (array: ts.ArrayLiteralExpression): RouteNode[] =>
    array.elements.flatMap((element): RouteNode[] => {
      if (ts.isSpreadElement(element) && ts.isIdentifier(element.expression))
        return [
          {
            path: '',
            outlet: false,
            children: [],
            spreads: [element.expression.text],
          },
        ]
      return ts.isObjectLiteralExpression(element) &&
        element.properties.some(
          (p) => ts.isPropertyAssignment(p) && propertyName(p.name) === 'path',
        )
        ? [routeNode(element)]
        : []
    })
  // Every array of route objects declared at the top level, by variable name.
  for (const statement of file.statements)
    if (ts.isVariableStatement(statement))
      for (const declaration of statement.declarationList.declarations)
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.initializer &&
          ts.isArrayLiteralExpression(declaration.initializer)
        ) {
          const nodes = routeNodes(declaration.initializer)
          if (nodes.length) result.routes.set(declaration.name.text, nodes)
        }
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const specifier = node.arguments[0] && stringText(node.arguments[0])
      if (specifier) dependency(specifier)
    }
    if (
      ts.isIdentifier(node) &&
      libraryNames.has(node.text) &&
      !ts.isImportSpecifier(node.parent) &&
      libraryUse(node)
    ) {
      const { library, name } = libraryNames.get(node.text)!
      used.add(`${library}\0${name}`)
    }
    if (ts.isDecorator(node)) {
      const name = decoratorName(node)
      if (name === 'Component' || name === 'Directive') {
        const declaration: Declaration = {
          kind: name === 'Component' ? 'component' : 'directive',
          className: ts.isClassDeclaration(node.parent)
            ? node.parent.name?.text
            : undefined,
          abstract:
            ts.isClassDeclaration(node.parent) &&
            !!node.parent.modifiers?.some(
              (m) => m.kind === ts.SyntaxKind.AbstractKeyword,
            ),
          styleUrls: [],
        }
        result.declarations.push(declaration)
        metadata(node, declaration)
      }
      if (name === 'HostBinding') {
        const target = (node.expression as ts.CallExpression).arguments[0]
        const bound =
          target && /^class\.([\w-]+)$/.exec(stringText(target) ?? '')?.[1]
        if (bound) classTokens(bound)
      }
    }
    // Classes applied from code: `renderer.addClass(el, 'btn')`, `classList.add('btn')`.
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      (node.expression.name.text === 'addClass' ||
        (['add', 'toggle'].includes(node.expression.name.text) &&
          ts.isPropertyAccessExpression(node.expression.expression) &&
          node.expression.expression.name.text === 'classList'))
    )
      for (const argument of node.arguments) {
        const text = stringText(argument)
        if (text) classTokens(text)
      }
    ts.forEachChild(node, visit)
  }
  const used = new Set<string>()
  visit(file)
  // Each library class used this way counts once per file.
  for (const key of used) {
    const [library, name] = key.split('\0') as [Library, string]
    bump(result.services[library], name)
  }
  for (const statement of file.statements)
    if (ts.isEnumDeclaration(statement)) {
      const members = new Map<string, string>()
      for (const member of statement.members) {
        const value = member.initializer && stringText(member.initializer)
        const name = propertyName(member.name)
        if (name && value !== undefined) members.set(name, value)
      }
      if (members.size) result.enums.set(statement.name.text, members)
    }
  return result
}

// The stylelint lock rejects --bs-* values, hex and rgb()/hsl() colors; Bootstrap Sass imports block removal.
export function analyzeStyles(source: string): StyleResult {
  const text = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ' ')
  const count = (re: RegExp) => text.match(re)?.length ?? 0
  return {
    variables: count(/var\(--bs-[\w-]+\)/g),
    colors: count(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\(/g),
    imports: count(/@(?:import|use|forward)\s+['"][^'"]*bootstrap[^'"]*['"]/g),
  }
}
export const styleHits = (s: StyleResult) => s.variables + s.colors + s.imports

function listFiles(root: string, directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(join(root, directory), {
    withFileTypes: true,
  }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) files.push(...listFiles(root, path))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

// Callers must extract each commit to its own directory: ESM caches modules by URL.
// Bootstrap is retired once eslint.config.mjs no longer enables the rule: nothing is banned and
// nothing is locked. A rule that is enabled but not found where we look is an error, not a retirement.
export const retiredRule = 'retired'
export async function loadRule(root: string) {
  const found = rulePaths.find((p) => existsSync(join(root, p)))
  const config = join(root, 'eslint.config.mjs')
  const enabled =
    existsSync(config) &&
    readFileSync(config, 'utf8').includes('no-bootstrap-classes')
  if (!found && enabled)
    throw new Error(
      `eslint.config.mjs enables no-bootstrap-classes but the rule is not at ${rulePaths.join(' or ')}`,
    )
  const path = found && join(root, found)
  if (!path || !enabled)
    return {
      rule: {
        isBanned: () => false,
        bannedClassesInBindingExpression: () => [],
      } satisfies Rule,
      sha: retiredRule,
      path: undefined,
    }
  const source = readFileSync(path)
  const rule = (await import(pathToFileURL(path).href)) as Partial<Rule>
  if (
    typeof rule.isBanned !== 'function' ||
    typeof rule.bannedClassesInBindingExpression !== 'function'
  )
    throw new Error('no-bootstrap-classes.mjs does not export the matcher')
  return {
    rule: rule as Rule,
    sha: createHash('sha1')
      .update(`blob ${source.length}\0`)
      .update(source)
      .digest('hex'),
    path: found,
  }
}

export async function analyzeTree(
  root: string,
  meta: Omit<Summary, 'totals' | 'sections' | 'rule'>,
): Promise<{ summary: Summary; detail: Detail }> {
  const { rule, sha, path: rulePath } = await loadRule(root)
  const kit = readKit(root)
  const lockGlobs =
    sha === retiredRule
      ? []
      : parseLockGlobs(
          readFileSync(join(root, 'eslint.config.mjs'), 'utf8'),
        ).filter((glob) => glob.startsWith(`${appRoot}/`))
  const sources = parseTailwindSources(
    readFileSync(join(root, 'src/main/webapp/tailwind.css'), 'utf8'),
  )
  const isLocked = (htmlPath: string) =>
    lockGlobs.some((glob) => matchesGlob(htmlPath, glob))
  const isScanned = (path: string) =>
    sources.some((s) => path === s || path.startsWith(`${s}/`))
  const diagnostics: Detail['diagnostics'] = []
  const scripts = new Map<string, ScriptResult>()
  const templates = new Map<string, TemplateResult>()
  const styles = new Map<string, StyleResult>()
  const files = [
    ...listFiles(root, appRoot).filter(
      (p) => !p.startsWith(`${legacyKitDir}/`),
    ),
    ...listFiles(root, 'src/main/webapp/content'),
  ].filter(
    (p) =>
      /\.(ts|html|scss|css)$/.test(p) &&
      !/\.(spec|test|stories|d)\.ts$/.test(p),
  )
  for (const path of files) {
    const source = readFileSync(join(root, path), 'utf8')
    if (path.endsWith('.ts')) scripts.set(path, analyzeScript(path, source))
    else if (path.endsWith('.html')) {
      const template = analyzeTemplate(source, path, rule, kit)
      templates.set(path, template)
      diagnostics.push(...template.errors.map((message) => ({ path, message })))
    } else styles.set(path, analyzeStyles(source))
  }
  // Class hits per file, counted once regardless of how many units share the file.
  const scriptTokens = new Map<string, Usage>()
  const fileTokens = new Map<string, Usage>()
  for (const [path, template] of templates)
    fileTokens.set(path, template.tokens)
  for (const [path, script] of scripts) {
    const tokens: Usage = {}
    for (const [token, n] of Object.entries(script.tokens))
      if (rule.isBanned(token)) tokens[token] = n
    scriptTokens.set(path, tokens)
    fileTokens.set(path, { ...tokens })
  }
  const units = new Map<string, Unit>()
  const classNames = new Map<string, Map<string, string>>()
  const owned = new Set<string>()
  for (const [path, script] of scripts) {
    const resolve = (url: string) => posix.join(dirname(path), url)
    script.declarations.forEach((declaration, index) => {
      if (declaration.abstract) return
      const id = index ? `${path}#${index}` : path
      if (declaration.className)
        classNames.set(
          path,
          (classNames.get(path) ?? new Map()).set(declaration.className, id),
        )
      const template =
        declaration.templateUrl && resolve(declaration.templateUrl)
      const external = template ? templates.get(template) : undefined
      if (template) owned.add(template)
      const inline =
        declaration.template !== undefined
          ? analyzeTemplate(declaration.template, path, rule, kit)
          : undefined
      if (inline) {
        diagnostics.push(...inline.errors.map((message) => ({ path, message })))
        merge(fileTokens.get(path)!, inline.tokens)
      }
      const styleFiles = declaration.styleUrls
        .map(resolve)
        .filter((s) => styles.has(s))
      styleFiles.forEach((s) => owned.add(s))
      // Script-level evidence (host bindings, addClass, services) belongs to the file's first unit.
      const tokens = merge(
        merge({ ...(index ? {} : scriptTokens.get(path)) }, external?.tokens),
        inline?.tokens,
      )
      const usage = (library: Library) =>
        merge(
          merge(
            index ? {} : { ...script.services[library] },
            external?.[library],
          ),
          inline?.[library],
        )
      const locked = isLocked(template ?? path.replace(/\.ts$/, '.html'))
      units.set(id, {
        id,
        kind: declaration.kind,
        selector: declaration.selector,
        section: sectionOf(path),
        template: external ? template : undefined,
        styles: styleFiles,
        status: locked ? 'locked' : 'clean',
        scanned: isScanned(template ?? path),
        tailwind: !!(external?.tailwind || inline?.tailwind),
        spacing: (external?.spacing ?? 0) + (inline?.spacing ?? 0),
        classHits: sum(tokens),
        styleHits: styleFiles.reduce(
          (n, s) => n + styleHits(styles.get(s)!),
          0,
        ),
        imports: [],
        tokens,
        primeng: usage('primeng'),
        ngBootstrap: usage('ngBootstrap'),
        tumUi: usage('tumUi'),
      })
    })
  }
  if (!units.size || !templates.size)
    throw new Error('No Angular units found; refusing a false-green report')
  const ownHits = (unit: Unit) => unit.classHits + unit.styleHits
  for (const unit of units.values())
    if (unit.status !== 'locked' && ownHits(unit) > 0) unit.status = 'dirty'
  // Render closure: units whose class this file imports (standalone `imports`, dialogs, lazy loads).
  const edges = new Map<string, string[]>()
  for (const [path, script] of scripts)
    for (const id of classNames.get(path)?.values() ?? [])
      edges.set(
        id,
        script.dependencies.flatMap(({ base, names }) => {
          const target = [`${base}.ts`, `${base}/index.ts`, base].find((c) =>
            classNames.has(c),
          )
          if (!target || target === path) return []
          return [...classNames.get(target)!]
            .filter(([name]) => !names || names.includes(name))
            .map(([, id]) => id)
        }),
      )
  for (const unit of units.values())
    unit.imports = [...new Set(edges.get(unit.id) ?? [])].sort()
  // Routed pages: walk the route tree from app.routes.ts through children and loadChildren,
  // joining paths and remembering the route components a page renders inside.
  const resolveFile = (base: string) =>
    [`${base}.ts`, `${base}/index.ts`, base].find((c) => scripts.has(c))
  const unitFor = ({ base, name }: Reference) => {
    const target = resolveFile(base)
    const classes = target && classNames.get(target)
    if (!classes) return undefined
    return name ? classes.get(name) : classes.values().next().value
  }
  const visitedRoutes = new Set<string>()
  // A route array by name: declared in this file or imported from another one.
  const routeArray = (file: string, name: string) => {
    const local = scripts.get(file)!.routes.get(name)
    if (local) return { file, nodes: local }
    const imported = scripts.get(file)!.imports.get(name)
    const target = imported && resolveFile(imported.base)
    const nodes = target && scripts.get(target)!.routes.get(imported.name)
    return nodes ? { file: target, nodes } : undefined
  }
  const enumValue = (
    file: string,
    { enumName, member }: { enumName: string; member: string },
  ) => {
    const local = scripts.get(file)!.enums.get(enumName)
    if (local) return local.get(member)
    const imported = scripts.get(file)!.imports.get(enumName)
    const target = imported && resolveFile(imported.base)
    return target
      ? scripts.get(target)!.enums.get(imported.name)?.get(member)
      : undefined
  }
  const walkRoutes = (
    file: string,
    nodes: RouteNode[],
    prefix: string,
    ancestors: string[],
  ) => {
    for (const node of nodes) {
      if (node.outlet) continue
      for (const name of node.spreads ?? []) {
        const spread = routeArray(file, name)
        if (spread && !visitedRoutes.has(`${spread.file}#${name}@${prefix}`)) {
          visitedRoutes.add(`${spread.file}#${name}@${prefix}`)
          walkRoutes(spread.file, spread.nodes, prefix, ancestors)
        }
      }
      if (node.spreads) continue
      const literal =
        node.path ?? (node.pathRef && enumValue(file, node.pathRef))
      const segment =
        literal === undefined ? ':dynamic' : literal.replace(/^\/+/, '')
      const path = [prefix, segment].filter(Boolean).join('/')
      const unitId = node.component && unitFor(node.component)
      const unit = unitId ? units.get(unitId) : undefined
      if (unit && unit.route === undefined) {
        unit.route = `/${path}`
        if (ancestors.length) unit.routeParents = ancestors
      }
      const parents = unitId ? [...ancestors, unitId] : ancestors
      const children = node.childrenRef
        ? routeArray(file, node.childrenRef)
        : { file, nodes: node.children }
      if (children) walkRoutes(children.file, children.nodes, path, parents)
      if (node.loadChildren) {
        const target = resolveFile(node.loadChildren.base)
        const routes = target && scripts.get(target)!.routes
        const key = `${target}#${node.loadChildren.name ?? ''}`
        if (!routes || visitedRoutes.has(key)) continue
        visitedRoutes.add(key)
        const array =
          (node.loadChildren.name
            ? routes.get(node.loadChildren.name)
            : undefined) ??
          routes.get('routes') ??
          [...routes.values()][0] ??
          []
        walkRoutes(target!, array, path, parents)
      }
    }
  }
  const appRoutes = scripts.get(`${appRoot}/app.routes.ts`)?.routes
  if (appRoutes)
    walkRoutes(
      `${appRoot}/app.routes.ts`,
      appRoutes.get('routes') ?? [...appRoutes.values()][0] ?? [],
      '',
      [],
    )
  // Closure metrics are derived from the stored edges, on the server and the client alike.
  const derived = deriveClosures([...units.values()])
  const closureHits = (unit: Unit) => derived.get(unit.id)!.closureHits
  const routeHits = (unit: Unit) => derived.get(unit.id)!.routeHits
  const orphanFiles: Detail['files'] = []
  for (const [path, tokens] of fileTokens)
    if (!owned.has(path) && !units.has(path) && sum(tokens) > 0)
      orphanFiles.push({
        path,
        section: sectionOf(path),
        classHits: sum(tokens),
        styleHits: 0,
        tokens,
      })
  for (const [path, result] of styles)
    if (!owned.has(path) && styleHits(result) > 0)
      orphanFiles.push({
        path,
        section: sectionOf(path),
        classHits: 0,
        styleHits: styleHits(result),
        tokens: {},
      })
  const styleOwners = new Map<string, number>()
  for (const unit of units.values())
    for (const path of unit.styles)
      styleOwners.set(path, (styleOwners.get(path) ?? 0) + 1)
  const styleFiles: Detail['styles'] = [...styles]
    .filter(([, result]) => styleHits(result) > 0)
    .map(([path, result]) => ({
      path,
      section: sectionOf(path),
      ...result,
      units: styleOwners.get(path) ?? 0,
    }))
    .sort((a, b) => styleHits(b) - styleHits(a) || a.path.localeCompare(b.path))
  orphanFiles.sort((a, b) => a.path.localeCompare(b.path))
  // A directory is lockable when nothing under it carries Bootstrap: Artemis's own definition
  // (`migrate.mjs check`, which the lint and stylelint locks then enforce). Units that still
  // import Bootstrap from outside are counted, because they render it until those are migrated.
  const dirs = new Map<
    string,
    {
      units: number
      unlocked: number
      templates: number
      clean: boolean
      blocked: number
    }
  >()
  const ancestors = (path: string) => {
    const relative = dirname(path).slice(appRoot.length + 1)
    if (!path.startsWith(`${appRoot}/`) || !relative) return []
    const parts = relative.split('/')
    return parts.map((_, i) => `${appRoot}/${parts.slice(0, i + 1).join('/')}`)
  }
  for (const unit of units.values())
    for (const dir of ancestors(unitPath(unit.id))) {
      const entry = dirs.get(dir) ?? {
        units: 0,
        unlocked: 0,
        templates: 0,
        clean: true,
        blocked: 0,
      }
      entry.units++
      if (unit.status !== 'locked') entry.unlocked++
      if (unit.template) entry.templates++
      entry.clean &&= ownHits(unit) === 0
      if (closureHits(unit) > 0) entry.blocked++
      dirs.set(dir, entry)
    }
  for (const file of orphanFiles)
    for (const dir of ancestors(file.path)) {
      const entry = dirs.get(dir)
      if (entry) entry.clean = false
    }
  const lockableDirs = new Set(
    [...dirs]
      .filter(
        ([dir, entry]) =>
          entry.clean &&
          entry.unlocked > 0 &&
          entry.templates > 0 &&
          !isLocked(`${dir}/x.html`),
      )
      .map(([dir]) => dir),
  )
  const lockable = [...lockableDirs]
    .filter((dir) => !lockableDirs.has(dirname(dir)))
    .sort()
    .map((dir) => ({
      dir,
      units: dirs.get(dir)!.units,
      blocked: dirs.get(dir)!.blocked,
    }))
  const sections = new Map<string, Section>()
  const section = (name: string) => {
    const entry = sections.get(name) ?? {
      name,
      units: 0,
      locked: 0,
      clean: 0,
      dirty: 0,
      classHits: 0,
      styleHits: 0,
      lockableDirs: 0,
      blockers: 0,
      legacyFree: 0,
      bootstrapUnits: 0,
      primeng: 0,
      ngBootstrap: 0,
      tumUi: 0,
    }
    sections.set(name, entry)
    return entry
  }
  const externalBlockers = new Map<string, Set<string>>()
  for (const unit of units.values()) {
    const entry = section(unit.section)
    entry.units++
    entry[unit.status]++
    if (stageOf(unit) === 'modern') entry.legacyFree++
    if (ownHits(unit) > 0) entry.bootstrapUnits++
    if (usesLibrary(unit.primeng)) entry.primeng++
    if (usesLibrary(unit.ngBootstrap)) entry.ngBootstrap++
    if (usesLibrary(unit.tumUi)) entry.tumUi++
    for (const blocker of derived.get(unit.id)!.blockers)
      if (units.get(blocker)!.section !== unit.section) {
        const set = externalBlockers.get(unit.section) ?? new Set()
        set.add(blocker)
        externalBlockers.set(unit.section, set)
      }
  }
  for (const [path, tokens] of fileTokens)
    section(sectionOf(path)).classHits += sum(tokens)
  for (const [path, result] of styles)
    section(sectionOf(path)).styleHits += styleHits(result)
  for (const { dir } of lockable) section(sectionOf(`${dir}/x`)).lockableDirs++
  for (const [name, set] of externalBlockers) section(name).blockers = set.size
  const all = [...units.values()]
  const totals: Totals = {
    units: all.length,
    locked: all.filter((u) => u.status === 'locked').length,
    clean: all.filter((u) => u.status === 'clean').length,
    dirty: all.filter((u) => u.status === 'dirty').length,
    classHits: [...fileTokens.values()].reduce((n, t) => n + sum(t), 0),
    styleHits: [...styles.values()].reduce((n, r) => n + styleHits(r), 0),
    lockedResidue: all
      .filter((u) => u.status === 'locked')
      .reduce((n, u) => n + ownHits(u), 0),
    lockedDirs: lockGlobs.length,
    lockableDirs: lockable.length,
    primeng: all.filter((u) => usesLibrary(u.primeng)).length,
    ngBootstrap: all.filter((u) => usesLibrary(u.ngBootstrap)).length,
    tumUi: all.filter((u) => usesLibrary(u.tumUi)).length,
    kit: kit.components,
    pages: all.filter((u) => u.route !== undefined).length,
    pagesClean: all.filter(
      (u) =>
        u.route !== undefined &&
        ownHits(u) === 0 &&
        closureHits(u) === 0 &&
        routeHits(u) === 0,
    ).length,
    legacyFree: all.filter((u) => stageOf(u) === 'modern').length,
    bootstrapUnits: all.filter((u) => ownHits(u) > 0).length,
  }
  // Stored paths are relative to src/main/webapp/.
  const rel = (path: string) => path.slice(webapp.length)
  const rels = (paths: string[]) => paths.map(rel)
  return {
    summary: {
      ...meta,
      rule: sha,
      totals,
      sections: Object.fromEntries(
        [...sections.values()].map((s) => [
          s.name,
          [
            s.units,
            s.locked,
            s.clean,
            s.dirty,
            s.classHits,
            s.styleHits,
            s.legacyFree,
            s.primeng,
            s.ngBootstrap,
            s.tumUi,
            lockGlobs.filter((g) => sectionOf(g) === s.name).length,
            s.bootstrapUnits,
          ],
        ]),
      ),
    },
    detail: {
      analyzerVersion,
      commit: meta.commit,
      rule: sha,
      rulePath,
      kit: [...kit.elements, ...kit.attributes].sort(),
      lockGlobs,
      lockable: lockable.map((l) => ({ ...l, dir: rel(l.dir) })),
      sections: [...sections.values()].sort(
        (a, b) =>
          b.classHits + b.styleHits - (a.classHits + a.styleHits) ||
          a.name.localeCompare(b.name),
      ),
      units: all
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((u) => ({
          ...u,
          id: rel(u.id),
          template: u.template && rel(u.template),
          styles: rels(u.styles),
          imports: rels(u.imports),
          routeParents: u.routeParents && rels(u.routeParents),
        })),
      styles: styleFiles
        .map((f) => ({ ...f, path: rel(f.path) }))
        .sort((a, b) => a.path.localeCompare(b.path)),
      files: orphanFiles.map((f) => ({ ...f, path: rel(f.path) })),
      diagnostics: diagnostics.map((d) => ({ ...d, path: rel(d.path) })),
    },
  }
}
