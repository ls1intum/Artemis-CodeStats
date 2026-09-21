import {
  parseTemplate,
  TmplAstElement,
  TmplAstTemplate,
  RecursiveAstVisitor,
  LiteralPrimitive,
  LiteralMap,
  Interpolation,
  BindingType,
  Conditional,
  Binary,
} from '@angular/compiler'
import ts from 'typescript'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bootstrapClasses } from './bootstrap'
import {
  emptyCounts,
  legacyKeys,
  type Dimension,
  type Finding,
  type Snapshot,
} from '../../src/features/migrations/model'

const appRoot = 'src/main/webapp/app'
const moduleName = (path: string) =>
  !path.startsWith(`${appRoot}/`)
    ? '_global-styles'
    : path.slice(appRoot.length + 1).includes('/')
      ? path.slice(appRoot.length + 1).split('/')[0]
      : '_app-root'
const tailwindClass =
  /^(?:[\w-]+:)*(?:flex|inline-flex|grid|hidden|items-(?:start|end|center|stretch)|justify-(?:start|end|center|between)|grid-cols-\d+|col-span-\d+|(?:bg|text|border)-(?:surface|state)-[\w-]+|(?:w|h)-full|rounded-(?:md|lg|xl))$/
const primeDirective =
  /^p(?:Tooltip|Button|ButtonIcon|ButtonLabel|InputText|InputTextarea|Textarea|Ripple|StyleClass|Draggable|Droppable|AutoFocus|FocusTrap|Template|Badge|SortableColumn|SelectableRow|TableCheckbox|TableRadioButton|FrozenColumn|ReorderableColumn|ResizableColumn|RowToggler|EditableColumn|InputMask|KeyFilter)$/

export function analyzeFile(
  path: string,
  source: string,
): { findings: Finding[]; errors: string[]; templates: number } {
  const findings: Finding[] = []
  const errors: string[] = []
  let templates = 0
  const module = moduleName(path)
  const add = (dimension: Dimension, offset: number, evidence: string) => {
    const line = source.slice(0, offset).split('\n').length
    if (
      !findings.some(
        (f) =>
          f.dimension === dimension &&
          f.line === line &&
          f.evidence === evidence,
      )
    )
      findings.push({ path, module, line, dimension, evidence })
  }
  const classes = (value: string, offset: number) => {
    for (const token of value.split(/\s+/)) {
      if (bootstrapClasses.some((rule) => rule.test(token)))
        add('bootstrap', offset, token)
      if (tailwindClass.test(token)) add('tailwind', offset, token)
    }
  }
  const template = (text: string, base = 0) => {
    templates++
    const parsed = parseTemplate(text, path, { preserveWhitespaces: false })
    if (parsed.errors?.length) errors.push(...parsed.errors.map((e) => e.msg))
    const walk = (node: unknown): void => {
      if (!node || typeof node !== 'object') return
      if (node instanceof TmplAstElement || node instanceof TmplAstTemplate) {
        const name =
          node instanceof TmplAstElement ? node.name : (node.tagName ?? '')
        const offset = base + node.sourceSpan.start.offset
        if (name.startsWith('p-')) add('primeng', offset, name)
        if (name.startsWith('ngb-')) add('ngBootstrap', offset, name)
        if (name.startsWith('tum-ui-')) add('tumUi', offset, name)
        for (const attr of [
          ...node.attributes,
          ...node.inputs,
          ...node.outputs,
          ...(node instanceof TmplAstTemplate ? node.templateAttrs : []),
        ]) {
          const attrOffset = base + attr.sourceSpan.start.offset
          if (primeDirective.test(attr.name))
            add('primeng', attrOffset, attr.name)
          if (/^ngb[A-Z]/.test(attr.name))
            add('ngBootstrap', attrOffset, attr.name)
          if (/^tumUi[A-Z]/.test(attr.name)) add('tumUi', attrOffset, attr.name)
          if ('value' in attr) {
            const value =
              typeof attr.value === 'string'
                ? attr.value
                : 'source' in attr.value &&
                    typeof attr.value.source === 'string'
                  ? attr.value.source
                  : ''
            if (
              attr.name === 'class' ||
              attr.name === 'ngClass' ||
              attr.name === 'styleClass' ||
              attr.name.endsWith('StyleClass')
            ) {
              if (typeof attr.value === 'string')
                classes(attr.value, attrOffset)
              else {
                class ClassVisitor extends RecursiveAstVisitor {
                  override visitLiteralPrimitive(ast: LiteralPrimitive) {
                    if (typeof ast.value === 'string')
                      classes(ast.value, attrOffset)
                  }
                  override visitLiteralMap(ast: LiteralMap) {
                    ast.keys.forEach((key) => {
                      if (key.kind === 'property') classes(key.key, attrOffset)
                    })
                  }
                  override visitConditional(
                    ast: Conditional,
                    context: unknown,
                  ) {
                    ast.trueExp.visit(this, context)
                    ast.falseExp.visit(this, context)
                  }
                  override visitBinary(ast: Binary, context: unknown) {
                    if (['&&', '||', '??'].includes(ast.operation)) {
                      ast.left.visit(this, context)
                      ast.right.visit(this, context)
                    }
                  }
                  override visitCall() {
                    // Arguments are not the computed class list returned by a function.
                  }
                  override visitInterpolation(
                    ast: Interpolation,
                    context: unknown,
                  ) {
                    ast.strings.forEach((value) => classes(value, attrOffset))
                    super.visitInterpolation(ast, context)
                  }
                }
                attr.value.visit(new ClassVisitor())
              }
            }
            // Angular normalizes [class.btn] to the binding name "btn".
            if ('type' in attr && attr.type === BindingType.Class)
              classes(attr.name, attrOffset)
            for (const match of `${attr.name} ${value}`.matchAll(
              /--(?:bs|p)-[\w-]+/g,
            ))
              add('legacyTokens', attrOffset, match[0])
          }
        }
      }
      for (const [key, value] of Object.entries(node)) {
        if (
          [
            'children',
            'branches',
            'cases',
            'empty',
            'placeholder',
            'loading',
            'error',
          ].includes(key)
        ) {
          if (Array.isArray(value)) value.forEach(walk)
          else walk(value)
        }
      }
    }
    parsed.nodes.forEach(walk)
  }
  if (path.endsWith('.html')) template(source)
  if (path.endsWith('.ts')) {
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
    const componentImports = new Set<string>()
    const angularNamespaces = new Set<string>()
    for (const statement of file.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== '@angular/core'
      )
        continue
      const bindings = statement.importClause?.namedBindings
      if (bindings && ts.isNamespaceImport(bindings))
        angularNamespaces.add(bindings.name.text)
      if (bindings && ts.isNamedImports(bindings))
        for (const binding of bindings.elements)
          if ((binding.propertyName ?? binding.name).text === 'Component')
            componentImports.add(binding.name.text)
    }
    const visit = (node: ts.Node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const pkg = node.moduleSpecifier.text
        if (/^primeng(?:\/|$)/.test(pkg))
          add('primeng', node.getStart(file), pkg)
        if (/^@ng-bootstrap\//.test(pkg))
          add('ngBootstrap', node.getStart(file), pkg)
        if (
          /^@tumaet\/ui-angular(?:\/|$)/.test(pkg) ||
          /(?:^|\/)tum-ui(?:\/|$)/.test(pkg)
        )
          add('tumUi', node.getStart(file), pkg)
      }
      if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
        const call = node.expression
        const callee = call.expression
        const isComponent = ts.isIdentifier(callee)
          ? componentImports.has(callee.text)
          : ts.isPropertyAccessExpression(callee) &&
            ts.isIdentifier(callee.expression) &&
            angularNamespaces.has(callee.expression.text) &&
            callee.name.text === 'Component'
        const metadata = call.arguments[0]
        if (isComponent && metadata && ts.isObjectLiteralExpression(metadata))
          for (const property of metadata.properties) {
            if (
              ts.isPropertyAssignment(property) &&
              (ts.isIdentifier(property.name) ||
                ts.isStringLiteral(property.name)) &&
              property.name.text === 'template' &&
              (ts.isStringLiteral(property.initializer) ||
                ts.isNoSubstitutionTemplateLiteral(property.initializer))
            )
              template(
                property.initializer.text,
                property.initializer.getStart(file) + 1,
              )
          }
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  if (/\.(scss|css)$/.test(path)) {
    // Preserve offsets while removing comments so source links remain exact.
    const text = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (match) =>
      match.replace(/[^\n]/g, ' '),
    )
    for (const match of text.matchAll(/--(?:bs|p)-[\w-]+/g))
      add('legacyTokens', match.index, match[0])
    for (const match of text.matchAll(
      /@(?:import|use|forward)\s+['"][^'"]*bootstrap[^'"]*['"]/g,
    ))
      add('bootstrap', match.index, match[0])
  }
  return { findings, errors, templates }
}

export function analyzeDirectory(root: string, commit: string, date: string) {
  const snapshot: Snapshot = {
    commit,
    date,
    files: 0,
    templates: 0,
    legacyFiles: 0,
    counts: emptyCounts(),
    modules: [],
    diagnostics: [],
  }
  const findings: Finding[] = []
  const scan = (directory: string) => {
    for (const entry of readdirSync(join(root, directory), {
      withFileTypes: true,
    }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = `${directory}/${entry.name}`
      if (path === `${appRoot}/shared-ui/tum-ui`) continue
      if (entry.isDirectory()) scan(path)
      else if (
        entry.isFile() &&
        /\.(ts|html|scss|css)$/.test(path) &&
        !/\.(spec|test|stories|d)\.ts$/.test(path)
      ) {
        const result = analyzeFile(path, readFileSync(join(root, path), 'utf8'))
        const name = moduleName(path)
        let module = snapshot.modules.find((m) => m.name === name)
        if (!module) {
          module = { name, files: 0, legacyFiles: 0, counts: emptyCounts() }
          snapshot.modules.push(module)
        }
        snapshot.files++
        module.files++
        snapshot.templates += result.templates
        const keys = new Set(result.findings.map((f) => f.dimension))
        for (const key of keys) {
          snapshot.counts[key]++
          module.counts[key]++
        }
        if (legacyKeys.some((key) => keys.has(key))) {
          snapshot.legacyFiles++
          module.legacyFiles++
        }
        findings.push(...result.findings)
        snapshot.diagnostics.push(
          ...result.errors.map((message) => ({ path, message })),
        )
      }
    }
  }
  scan('src/main/webapp/app')
  // Global stylesheet debt is visible separately, never attributed to feature teams.
  scan('src/main/webapp/content')
  if (!snapshot.files || !snapshot.templates)
    throw new Error(
      'No application files/templates found; refusing a false-green report',
    )
  return { snapshot, findings }
}
