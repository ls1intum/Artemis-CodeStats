import { LineCounter, isNode, parseDocument } from 'yaml'
import {
  operationIdentitySchema,
  type Operation,
  type SourceLocation,
} from '../../src/features/openapi/model'

const methods = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace',
]
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
export interface Specification {
  operations: Map<string, SourceLocation[]>
  issues: { reason: string; evidence: SourceLocation[] }[]
  complete: boolean
  duplicateKeys: boolean
  anchor: SourceLocation
}
const shape = (id: string) => id.replace(/\{[^}]+\}/g, '{}')

/** YAML parses JSON too. No regex extraction, external fetches, or silent reference fallback. */
export function parseSpecification(
  content: string,
  inputId: string,
  path: string,
): Specification {
  const lines = new LineCounter()
  const document = parseDocument(content, {
    lineCounter: lines,
    uniqueKeys: true,
  })
  const location = (keys: string[] = []): SourceLocation => {
    let node: unknown
    try {
      node = keys.length ? document.getIn(keys, true) : document.contents
    } catch {
      node = undefined
    }
    const offset = isNode(node) ? node.range?.[0] : undefined
    return {
      inputId,
      path,
      line: offset === undefined ? 1 : lines.linePos(offset).line,
      symbol: keys.length ? keys.join('.') : 'OpenAPI',
    }
  }
  const result: Specification = {
    operations: new Map(),
    issues: [],
    complete: true,
    duplicateKeys: false,
    anchor: location(),
  }
  const issue = (reason: string, keys: string[] = []) => {
    result.complete = false
    result.issues.push({ reason, evidence: [location(keys)] })
  }
  for (const error of [...document.errors, ...document.warnings]) {
    if (error.code === 'DUPLICATE_KEY') result.duplicateKeys = true
    issue(`${error.code}: ${error.message}`)
  }
  let data: unknown
  try {
    data = document.toJS({ maxAliasCount: 100 })
  } catch (error) {
    issue(`Cannot materialize specification: ${String(error)}`)
    return result
  }
  if (
    !object(data) ||
    typeof data.openapi !== 'string' ||
    !/^3\.[01]\./.test(data.openapi) ||
    !object(data.paths)
  ) {
    issue('Expected an OpenAPI 3.0/3.1 object with a paths object')
    return result
  }
  // Non-root bases need an evidenced relationship to the application's context path.
  // Keep them explicit until supported instead of treating a relative Paths key as absence.
  const validateServers = (servers: unknown, keys: string[]) => {
    if (!Array.isArray(servers)) {
      issue('Expected an OpenAPI servers array', keys)
      return
    }
    for (const [index, server] of servers.entries()) {
      const source = [...keys, String(index), 'url']
      if (!object(server) || typeof server.url !== 'string' || !server.url) {
        issue('Expected a nonempty OpenAPI server URL', source)
        continue
      }
      if (/[{}]/.test(server.url)) {
        issue(
          'OpenAPI server URL variables require explicit base-path reconciliation',
          source,
        )
        continue
      }
      try {
        const url = new URL(server.url, 'https://codestats.invalid')
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.pathname !== '/' ||
          url.search ||
          url.hash
        )
          issue(
            'Unsupported OpenAPI server base path or URL; reconcile the application context/prefix before matching operations',
            source,
          )
      } catch {
        issue('Invalid OpenAPI server URL', source)
      }
    }
  }
  if ('servers' in data) validateServers(data.servers, ['servers'])
  const pointer = (ref: string): unknown => {
    if (ref === '#') return data
    if (!ref.startsWith('#/')) return undefined
    let fragment: string
    try {
      fragment = decodeURIComponent(ref.slice(1))
    } catch {
      return undefined
    }
    let value: unknown = data
    for (const escaped of fragment.slice(1).split('/')) {
      if (/~(?:[^01]|$)/.test(escaped)) return undefined
      const key = escaped.replace(/~1/g, '/').replace(/~0/g, '~')
      if (!object(value) && !Array.isArray(value)) return undefined
      if (!Object.hasOwn(value, key)) return undefined
      value = (value as Record<string, unknown>)[key]
    }
    return value
  }
  const visited = new Set<unknown>()
  const validateRefs = (value: unknown, keys: string[]) => {
    if (!value || typeof value !== 'object' || visited.has(value)) return
    visited.add(value)
    if (object(value) && '$ref' in value) {
      if (typeof value.$ref !== 'string' || !object(pointer(value.$ref))) {
        issue(
          `Unresolved or unsupported external reference: ${String(value.$ref)}`,
          [...keys, '$ref'],
        )
      }
    }
    for (const [key, child] of Object.entries(value))
      validateRefs(child, [...keys, key])
  }
  validateRefs(data, [])
  const pathItems = (
    item: Record<string, unknown>,
    keys: string[],
    seen: Set<string>,
  ): { value: Record<string, unknown>; keys: string[] }[] => {
    const items = [{ value: item, keys }]
    if ('$ref' in item && typeof item.$ref === 'string') {
      if (seen.has(item.$ref)) {
        issue('Cyclic Path Item reference', keys)
        return items
      }
      const target = pointer(item.$ref)
      if (object(target)) {
        seen.add(item.$ref)
        items.push(
          ...pathItems(
            target,
            decodeURIComponent(item.$ref.slice(1))
              .slice(1)
              .split('/')
              .map((key) => key.replace(/~1/g, '/').replace(/~0/g, '~')),
            seen,
          ),
        )
      }
    }
    return items
  }
  for (const [declaredPath, item] of Object.entries(data.paths)) {
    if (declaredPath.startsWith('x-')) continue
    if (!object(item)) {
      issue('Path Item must be an object', ['paths', declaredPath])
      continue
    }
    for (const candidate of pathItems(
      item,
      ['paths', declaredPath],
      new Set(),
    )) {
      if ('servers' in candidate.value)
        validateServers(candidate.value.servers, [...candidate.keys, 'servers'])
      for (const [method, value] of Object.entries(candidate.value)) {
        if (
          !methods.includes(method.toLowerCase()) &&
          !['$ref', 'summary', 'description', 'servers', 'parameters'].includes(
            method,
          ) &&
          !method.startsWith('x-')
        ) {
          issue(`Unsupported Path Item property: ${method}`, [
            ...candidate.keys,
            method,
          ])
          continue
        }
        if (!methods.includes(method.toLowerCase())) continue
        const keys = [...candidate.keys, method]
        if (method !== method.toLowerCase() || !object(value)) {
          issue('Invalid operation method/object', keys)
          continue
        }
        if ('servers' in value)
          validateServers(value.servers, [...keys, 'servers'])
        const identity = operationIdentitySchema.safeParse({
          method: method.toUpperCase(),
          path: declaredPath,
        })
        if (!identity.success) {
          issue(
            `Unsupported operation identity ${method} ${declaredPath}`,
            keys,
          )
          continue
        }
        const id = `${identity.data.method} ${identity.data.path}`
        const evidence = location(
          typeof value.operationId === 'string'
            ? [...keys, 'operationId']
            : keys,
        )
        if (typeof value.operationId === 'string')
          evidence.symbol = value.operationId
        result.operations.set(id, [
          ...(result.operations.get(id) ?? []),
          evidence,
        ])
      }
    }
  }
  return result
}

export function reconcileSpecification(
  id: string,
  spec: Specification | undefined,
  revisionMatches: boolean,
): Operation['specification'] {
  if (!spec)
    return { state: 'unknown', reason: 'Specification input is unavailable' }
  if (!revisionMatches)
    return {
      state: 'unknown',
      evidence: [spec.anchor],
      reason:
        'Specification storage revision differs from the analyzed Artemis revision',
    }
  if (spec.duplicateKeys)
    return {
      state: 'ambiguous',
      evidence: [spec.anchor],
      reason:
        'Duplicate YAML/JSON keys prevent an exclusive specification match',
    }
  if (!spec.complete)
    return {
      state: 'incomplete-analysis',
      evidence: [spec.anchor],
      reason:
        'Invalid/unsupported specification content or references; absence and exclusive presence cannot be established',
    }
  const candidates = [...spec.operations.entries()].filter(
    ([key]) => shape(key) === shape(id),
  )
  if (
    candidates.length > 1 ||
    candidates.some(([key, evidence]) => key !== id || evidence.length > 1)
  ) {
    return {
      state: 'ambiguous',
      evidence: candidates.flatMap(([, evidence]) => evidence),
      reason:
        'Multiple or structurally similar identities remain distinct; no candidate is selected arbitrarily',
    }
  }
  const matched = spec.operations.get(id)
  return matched
    ? {
        state: 'present',
        evidence: matched,
        reason:
          'Exact method/path found in the audited specification; this does not establish wire compatibility',
      }
    : {
        state: 'missing',
        evidence: [spec.anchor],
        reason:
          'Absent from the complete parsed specification input, using the independent server inventory',
      }
}
