import {
  parseTemplate,
  TmplAstElement,
  TmplAstTemplate,
  ASTWithSource,
  Interpolation,
  BindingType,
  type TmplAstNode,
} from '@angular/compiler'
import ts from 'typescript'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, matchesGlob, posix } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  analyzerVersion,
  appRoot,
  sectionOf,
  type Detail,
  type InventoryEntry,
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
type TemplateResult = {
  tokens: Usage
  primeng: Usage
  ngBootstrap: Usage
  tumUi: Usage
  errors: string[]
}
type ScriptResult = {
  declarations: { kind: 'component' | 'directive'; selector?: string }[]
  templateUrl?: string
  template?: string
  styleUrls: string[]
  dependencies: string[]
  primeng: Usage
  ngBootstrap: Usage
  tumUi: Usage
  tokens: Usage
}

const kitSourceDirs = ['packages/tum-ui/src/lib', `${appRoot}/shared-ui/tum-ui`]
const bump = (usage: Usage, key: string, by = 1) => {
  usage[key] = (usage[key] ?? 0) + by
}
const sum = (usage: Usage) => Object.values(usage).reduce((a, b) => a + b, 0)
const isClassList = (name: string) =>
  name === 'class' || name === 'styleClass' || name.endsWith('StyleClass')
const stringText = (node: ts.Node) =>
  ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : undefined

export function parseLockGlobs(eslintConfig: string): string[] {
  const file = ts.createSourceFile(
    'eslint.config.mjs',
    eslintConfig,
    ts.ScriptTarget.Latest,
    true,
  )
  let globs: string[] | undefined
  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const property = (name: string) =>
        node.properties.find(
          (p): p is ts.PropertyAssignment =>
            ts.isPropertyAssignment(p) &&
            (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
            p.name.text === name,
        )
      const rules = property('rules')?.initializer
      const files = property('files')?.initializer
      if (
        rules &&
        ts.isObjectLiteralExpression(rules) &&
        rules.properties.some(
          (p) =>
            ts.isPropertyAssignment(p) &&
            ts.isStringLiteral(p.name) &&
            p.name.text === 'localRules/no-bootstrap-classes',
        ) &&
        files &&
        ts.isArrayLiteralExpression(files)
      )
        globs = files.elements.map((e) => {
          const text = stringText(e)
          if (text === undefined)
            throw new Error('Lock list contains a non-literal entry')
          return text
        })
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  if (!globs?.length) throw new Error('Regression lock block not found')
  return globs
}

export function parseTailwindSources(tailwindCss: string): string[] {
  return [...tailwindCss.matchAll(/^@source\s+'([^']+)'/gm)].map((m) =>
    posix.join('src/main/webapp', m[1]),
  )
}

export function readKit(root: string): Kit {
  const kit: Kit = { elements: new Set(), attributes: new Set(), components: 0 }
  const dir = kitSourceDirs.find((d) => existsSync(join(root, d)))
  if (!dir) throw new Error('TUM UI kit sources not found')
  for (const path of listFiles(root, dir).filter(
    (p) => p.endsWith('.ts') && !/\.(spec|stories|d)\.ts$/.test(p),
  )) {
    for (const { kind, selector } of analyzeScript(
      path,
      readFileSync(join(root, path), 'utf8'),
    ).declarations) {
      if (kind === 'component') kit.components++
      for (const part of selector?.split(',') ?? []) {
        const attribute = /\[(\w+)\]/.exec(part)?.[1]
        if (attribute) kit.attributes.add(attribute)
        else if (/^[\w-]+$/.test(part.trim())) kit.elements.add(part.trim())
      }
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
  }
  const classes = (value: string) => {
    for (const token of value.split(/\s+/))
      if (token && rule.isBanned(token)) bump(result.tokens, token)
  }
  const parsed = parseTemplate(text, path, { preserveWhitespaces: false })
  result.errors = parsed.errors?.map((e) => e.msg) ?? []
  const walk = (node: TmplAstNode | TmplAstNode[] | undefined): void => {
    if (!node) return
    if (Array.isArray(node)) return node.forEach(walk)
    if (node instanceof TmplAstElement || node instanceof TmplAstTemplate) {
      const name =
        node instanceof TmplAstElement ? node.name : (node.tagName ?? '')
      if (name.startsWith('p-')) bump(result.primeng, name)
      if (name.startsWith('ngb-')) bump(result.ngBootstrap, name)
      if (kit.elements.has(name)) bump(result.tumUi, name)
      // A structural directive's implicit template repeats the host element's attributes.
      const attrs =
        node instanceof TmplAstTemplate && node.tagName !== 'ng-template'
          ? node.templateAttrs
          : [...node.attributes, ...node.inputs, ...node.outputs]
      for (const attr of attrs) {
        if (/^p[A-Z]\w*$/.test(attr.name)) bump(result.primeng, attr.name)
        if (/^ngb[A-Z]\w*$/.test(attr.name)) bump(result.ngBootstrap, attr.name)
        if (kit.attributes.has(attr.name)) bump(result.tumUi, attr.name)
        if (!('value' in attr)) continue
        if (typeof attr.value === 'string') {
          if (isClassList(attr.name)) classes(attr.value)
          continue
        }
        // [class.btn] normalizes to the binding name; interpolations keep their static chunks.
        if ('type' in attr && attr.type === BindingType.Class)
          classes(attr.name)
        if (!isClassList(attr.name) && attr.name !== 'ngClass') continue
        const ast =
          attr.value instanceof ASTWithSource ? attr.value.ast : attr.value
        if (ast instanceof Interpolation) ast.strings.forEach(classes)
        else
          for (const token of rule.bannedClassesInBindingExpression(
            attr.value instanceof ASTWithSource
              ? (attr.value.source ?? '')
              : '',
          ))
            bump(result.tokens, token)
      }
    }
    // Control-flow blocks nest children under version-specific keys; descend into every child node.
    for (const [key, value] of Object.entries(node)) {
      if (/Span$|^i18n$/.test(key)) continue
      for (const child of Array.isArray(value) ? value : [value])
        if (
          child &&
          typeof child === 'object' &&
          'sourceSpan' in child &&
          typeof child.visit === 'function'
        )
          walk(child as TmplAstNode)
    }
  }
  walk(parsed.nodes)
  return result
}

export function analyzeScript(path: string, source: string): ScriptResult {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  const result: ScriptResult = {
    declarations: [],
    styleUrls: [],
    dependencies: [],
    primeng: {},
    ngBootstrap: {},
    tumUi: {},
    tokens: {},
  }
  const angular = new Map<string, string>()
  const namespaces = new Set<string>()
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue
    const pkg = statement.moduleSpecifier.text
    const bindings = statement.importClause?.namedBindings
    const names =
      bindings && ts.isNamedImports(bindings)
        ? bindings.elements.map((e) => ({
            local: e.name.text,
            exported: (e.propertyName ?? e.name).text,
          }))
        : []
    if (pkg === '@angular/core') {
      if (bindings && ts.isNamespaceImport(bindings))
        namespaces.add(bindings.name.text)
      for (const { local, exported } of names) angular.set(local, exported)
    }
    const library = /^primeng(?:\/|$)/.test(pkg)
      ? result.primeng
      : /^@ng-bootstrap\//.test(pkg)
        ? result.ngBootstrap
        : /^@tumaet\/ui-angular(?:\/|$)/.test(pkg) ||
            /(?:^|\/)tum-ui(?:\/|$)/.test(pkg)
          ? result.tumUi
          : undefined
    if (library)
      for (const { exported } of names.length ? names : [{ exported: pkg }])
        bump(library, exported)
  }
  const dependency = (specifier: string) => {
    const base = specifier.startsWith('.')
      ? posix.join(dirname(path), specifier)
      : specifier.startsWith('app/')
        ? `${appRoot}/${specifier.slice(4)}`
        : undefined
    if (base) result.dependencies.push(base)
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
  const literals = (node: ts.Node) => {
    const text = stringText(node)
    if (text !== undefined) classTokens(text)
    if (ts.isTemplateExpression(node)) {
      classTokens(node.head.text)
      node.templateSpans.forEach((span) => classTokens(span.literal.text))
    }
    ts.forEachChild(node, literals)
  }
  const metadata = (
    decorator: ts.Decorator,
    declaration: ScriptResult['declarations'][number],
  ) => {
    const argument = (decorator.expression as ts.CallExpression).arguments[0]
    if (!argument || !ts.isObjectLiteralExpression(argument)) return
    for (const property of argument.properties) {
      if (
        !ts.isPropertyAssignment(property) ||
        !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
      )
        continue
      const value = property.initializer
      const text = stringText(value)
      switch (property.name.text) {
        case 'selector':
          declaration.selector = text
          break
        case 'templateUrl':
          result.templateUrl = text
          break
        case 'template':
          result.template = text
          break
        case 'styleUrl':
          if (text) result.styleUrls.push(text)
          break
        case 'styleUrls':
          if (ts.isArrayLiteralExpression(value))
            for (const element of value.elements) {
              const url = stringText(element)
              if (url) result.styleUrls.push(url)
            }
          break
        case 'host':
          if (ts.isObjectLiteralExpression(value))
            for (const binding of value.properties) {
              if (!ts.isPropertyAssignment(binding)) continue
              const key = ts.isStringLiteral(binding.name)
                ? binding.name.text
                : ts.isIdentifier(binding.name)
                  ? binding.name.text
                  : ''
              const bound = /^\[?class\.([\w-]+)\]?$/.exec(key)?.[1]
              if (bound) classTokens(bound)
            }
      }
    }
  }
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      dependency(node.moduleSpecifier.text)
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const specifier = node.arguments[0] && stringText(node.arguments[0])
      if (specifier) dependency(specifier)
    }
    if (ts.isDecorator(node)) {
      const name = decoratorName(node)
      if (name === 'Component' || name === 'Directive') {
        const declaration = {
          kind: name === 'Component' ? 'component' : 'directive',
        } as const
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
    // Class lists assembled in TypeScript: `buttonClass = 'btn'`, `renderer.addClass(el, 'btn')`.
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      (node.expression.name.text === 'addClass' ||
        (['add', 'toggle'].includes(node.expression.name.text) &&
          ts.isPropertyAccessExpression(node.expression.expression) &&
          node.expression.expression.name.text === 'classList'))
    )
      node.arguments.forEach(literals)
    const named =
      ts.isPropertyDeclaration(node) ||
      ts.isVariableDeclaration(node) ||
      ts.isPropertyAssignment(node) ||
      ts.isParameter(node)
        ? { name: node.name, value: node.initializer }
        : ts.isBinaryExpression(node) &&
            node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isPropertyAccessExpression(node.left)
          ? { name: node.left.name, value: node.right }
          : undefined
    if (
      named?.value &&
      (ts.isIdentifier(named.name) || ts.isStringLiteral(named.name)) &&
      /class/i.test(named.name.text)
    )
      literals(named.value)
    ts.forEachChild(node, visit)
  }
  visit(file)
  return result
}

export function analyzeStyles(source: string): number {
  const text = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ' ')
  // The stylelint lock rejects --bs-* values, hex and rgb()/hsl() colors; Bootstrap Sass imports block removal.
  return (
    text.match(
      /var\(--bs-[\w-]+\)|#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\(|@(?:import|use|forward)\s+['"][^'"]*bootstrap[^'"]*['"]/g,
    )?.length ?? 0
  )
}

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

export async function loadRule(root: string) {
  const path = join(root, 'rules/no-bootstrap-classes.mjs')
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
  }
}

const inventory = (usages: Usage[]): InventoryEntry[] => {
  const entries = new Map<string, InventoryEntry>()
  for (const usage of usages)
    for (const [name, occurrences] of Object.entries(usage)) {
      const entry = entries.get(name) ?? { name, occurrences: 0, units: 0 }
      entry.occurrences += occurrences
      entry.units++
      entries.set(name, entry)
    }
  return [...entries.values()].sort(
    (a, b) => b.occurrences - a.occurrences || a.name.localeCompare(b.name),
  )
}

export async function analyzeTree(
  root: string,
  meta: { commit: string; date: string; subject: string },
): Promise<{ summary: Summary; detail: Detail }> {
  const { rule, sha } = await loadRule(root)
  const kit = readKit(root)
  const lockGlobs = parseLockGlobs(
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
  const styles = new Map<string, number>()
  const files = [
    ...listFiles(root, appRoot).filter(
      (p) => !p.startsWith(`${appRoot}/shared-ui/tum-ui/`),
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
  const units = new Map<string, Unit>()
  const owned = new Set<string>()
  const scriptTokens = (path: string) => {
    const tokens: Usage = {}
    for (const [token, n] of Object.entries(scripts.get(path)!.tokens))
      if (rule.isBanned(token)) tokens[token] = n
    return tokens
  }
  for (const [path, script] of scripts) {
    const declaration = script.declarations[0]
    if (!declaration) continue
    const tokens = scriptTokens(path)
    const resolve = (url: string) => posix.join(dirname(path), url)
    const template = script.templateUrl && resolve(script.templateUrl)
    const inline =
      script.template !== undefined
        ? analyzeTemplate(script.template, path, rule, kit)
        : undefined
    if (inline)
      diagnostics.push(...inline.errors.map((message) => ({ path, message })))
    const external = template ? templates.get(template) : undefined
    if (template) owned.add(template)
    const styleFiles = script.styleUrls
      .map(resolve)
      .filter((s) => styles.has(s))
    styleFiles.forEach((s) => owned.add(s))
    const usage = (key: 'primeng' | 'ngBootstrap' | 'tumUi') => {
      const merged: Usage = { ...script[key] }
      for (const source of [inline, external])
        for (const [name, n] of Object.entries(source?.[key] ?? {}))
          bump(merged, name, n)
      return merged
    }
    for (const source of [inline, external])
      for (const [token, n] of Object.entries(source?.tokens ?? {}))
        bump(tokens, token, n)
    const locked = isLocked(template ?? path.replace(/\.ts$/, '.html'))
    units.set(path, {
      id: path,
      kind: declaration.kind,
      selector: declaration.selector,
      section: sectionOf(path),
      template: external ? template : undefined,
      styles: styleFiles,
      status: locked ? 'locked' : 'clean',
      scanned: isScanned(template ?? path),
      classHits: sum(tokens),
      styleHits: styleFiles.reduce((n, s) => n + styles.get(s)!, 0),
      closureHits: 0,
      blocks: 0,
      blockers: [],
      tokens,
      primeng: usage('primeng'),
      ngBootstrap: usage('ngBootstrap'),
      tumUi: usage('tumUi'),
    })
  }
  if (!units.size || !templates.size)
    throw new Error('No Angular units found; refusing a false-green report')
  const ownHits = (unit: Unit) => unit.classHits + unit.styleHits
  for (const unit of units.values())
    if (unit.status !== 'locked' && ownHits(unit) > 0) unit.status = 'dirty'
  // Render closure: every unit reachable through imports (template children, dialogs, lazy routes).
  const edges = new Map<string, string[]>()
  for (const [path, script] of scripts) {
    if (!units.has(path)) continue
    edges.set(
      path,
      script.dependencies.flatMap((base) =>
        [`${base}.ts`, `${base}/index.ts`, base].filter(
          (candidate) => candidate !== path && units.has(candidate),
        ),
      ),
    )
  }
  const reachable = new Map<string, Set<string>>()
  for (const id of units.keys()) {
    const seen = new Set<string>()
    const stack = [...(edges.get(id) ?? [])]
    while (stack.length) {
      const next = stack.pop()!
      if (seen.has(next)) continue
      seen.add(next)
      stack.push(...(edges.get(next) ?? []))
    }
    seen.delete(id)
    reachable.set(id, seen)
  }
  for (const unit of units.values()) {
    const closure = [...reachable.get(unit.id)!].map((id) => units.get(id)!)
    unit.closureHits = closure.reduce((n, other) => n + ownHits(other), 0)
    if (ownHits(unit) === 0) {
      unit.blockers = closure
        .filter((other) => ownHits(other) > 0)
        .map((other) => other.id)
        .sort()
      for (const id of unit.blockers) units.get(id)!.blocks++
    }
  }
  const orphanFiles: Detail['files'] = []
  for (const [path, template] of templates)
    if (!owned.has(path) && sum(template.tokens) > 0)
      orphanFiles.push({
        path,
        section: sectionOf(path),
        classHits: sum(template.tokens),
        styleHits: 0,
        tokens: template.tokens,
      })
  for (const [path, hits] of styles)
    if (!owned.has(path) && hits > 0)
      orphanFiles.push({
        path,
        section: sectionOf(path),
        classHits: 0,
        styleHits: hits,
        tokens: {},
      })
  for (const path of scripts.keys()) {
    if (units.has(path)) continue
    const tokens = scriptTokens(path)
    if (sum(tokens) > 0)
      orphanFiles.push({
        path,
        section: sectionOf(path),
        classHits: sum(tokens),
        styleHits: 0,
        tokens,
      })
  }
  orphanFiles.sort((a, b) => a.path.localeCompare(b.path))
  // A directory is lockable when nothing under it, nor anything it renders, still carries Bootstrap.
  const dirs = new Map<
    string,
    { units: number; unlocked: number; clean: boolean }
  >()
  const ancestors = (path: string) => {
    const parts = dirname(path)
      .slice(appRoot.length + 1)
      .split('/')
    return parts.map((_, i) => `${appRoot}/${parts.slice(0, i + 1).join('/')}`)
  }
  for (const unit of units.values()) {
    if (!unit.id.startsWith(`${appRoot}/`)) continue
    for (const dir of ancestors(unit.id)) {
      const entry = dirs.get(dir) ?? { units: 0, unlocked: 0, clean: true }
      entry.units++
      if (unit.status !== 'locked') entry.unlocked++
      entry.clean &&= ownHits(unit) === 0 && unit.closureHits === 0
      dirs.set(dir, entry)
    }
  }
  for (const file of orphanFiles)
    if (file.path.startsWith(`${appRoot}/`))
      for (const dir of ancestors(file.path)) {
        const entry = dirs.get(dir)
        if (entry) entry.clean = false
      }
  const lockableDirs = new Set(
    [...dirs]
      .filter(
        ([dir, entry]) =>
          entry.clean && entry.unlocked > 0 && !isLocked(`${dir}/x.html`),
      )
      .map(([dir]) => dir),
  )
  const lockable = [...lockableDirs]
    .filter((dir) => !lockableDirs.has(dirname(dir)))
    .sort()
    .map((dir) => ({ dir, units: dirs.get(dir)!.units }))
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
    }
    sections.set(name, entry)
    return entry
  }
  const externalBlockers = new Map<string, Set<string>>()
  for (const unit of units.values()) {
    const entry = section(unit.section)
    entry.units++
    entry[unit.status]++
    entry.classHits += unit.classHits
    for (const blocker of unit.blockers)
      if (units.get(blocker)!.section !== unit.section) {
        const set = externalBlockers.get(unit.section) ?? new Set()
        set.add(blocker)
        externalBlockers.set(unit.section, set)
      }
  }
  for (const [path, hits] of styles) section(sectionOf(path)).styleHits += hits
  for (const file of orphanFiles)
    section(file.section).classHits += file.classHits
  for (const { dir } of lockable) section(sectionOf(`${dir}/x`)).lockableDirs++
  for (const [name, set] of externalBlockers) section(name).blockers = set.size
  const all = [...units.values()]
  const totals: Totals = {
    units: all.length,
    locked: all.filter((u) => u.status === 'locked').length,
    clean: all.filter((u) => u.status === 'clean').length,
    dirty: all.filter((u) => u.status === 'dirty').length,
    classHits: [...sections.values()].reduce((n, s) => n + s.classHits, 0),
    styleHits: [...styles.values()].reduce((n, h) => n + h, 0),
    lockedResidue: all
      .filter((u) => u.status === 'locked')
      .reduce((n, u) => n + ownHits(u), 0),
    lockedDirs: lockGlobs.length,
    lockableDirs: lockable.length,
    primeng: all.filter((u) => sum(u.primeng) > 0).length,
    ngBootstrap: all.filter((u) => sum(u.ngBootstrap) > 0).length,
    tumUi: all.filter((u) => sum(u.tumUi) > 0).length,
    kit: kit.components,
  }
  return {
    summary: { ...meta, totals },
    detail: {
      analyzerVersion,
      commit: meta.commit,
      rule: sha,
      kit: [...kit.elements, ...kit.attributes].sort(),
      lockGlobs,
      lockable,
      sections: [...sections.values()].sort(
        (a, b) =>
          b.classHits + b.styleHits - (a.classHits + a.styleHits) ||
          a.name.localeCompare(b.name),
      ),
      units: all.sort((a, b) => a.id.localeCompare(b.id)),
      files: orphanFiles,
      inventory: {
        bootstrap: inventory([
          ...all.map((u) => u.tokens),
          ...orphanFiles.map((f) => f.tokens),
        ]),
        primeng: inventory(all.map((u) => u.primeng)),
        ngBootstrap: inventory(all.map((u) => u.ngBootstrap)),
        tumUi: inventory(all.map((u) => u.tumUi)),
      },
      diagnostics,
    },
  }
}
