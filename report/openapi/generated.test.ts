import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import type { Operation } from '../../src/features/openapi/model'
import { analyzeGenerated, reconcileGenerated } from './generated'
import { parseSpecification } from './spec'

const sources = await Promise.all(
  ['api.ts', 'resources.ts'].map(async (file) => ({
    path: `client/openapi/${file}`,
    content: await readFile(
      new URL(`./fixtures/generated/${file}`, import.meta.url),
      'utf8',
    ),
  })),
)
// Only identities are inspected by the join; snapshot/schema tests cover full operation records.
const operations = [
  'GET /api/items/{id}',
  'POST /api/items',
  'DELETE /api/users/{login}',
  'HEAD /api/headers',
  'GET /api/text',
  'GET /api/blob',
  'POST /api/quiz/live',
].map((id) => ({ id })) as Operation[]
const spec = parseSpecification(
  JSON.stringify({
    openapi: '3.1.0',
    paths: {
      '/api/items/{id}': { get: {} },
      '/api/items': { post: {} },
      '/api/users/{login}': { delete: {} },
      '/api/quiz/live': { post: {} },
    },
  }),
  'specification',
  'spec.yaml',
)
const collect = (source: string, identities = operations) =>
  analyzeGenerated(
    [{ path: 'client/openapi/probe.ts', content: source }],
    identities,
    spec,
  )
const imports = `import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject } from '@angular/core'; import { Observable } from 'rxjs';`
const api = (body: string) =>
  `${imports} export class Api { private readonly http = inject(HttpClient); ${body} }`

test('generated Observable implementations resolve aliases, injection, constructors, encoded paths, queries and request methods', () => {
  const inventory = analyzeGenerated(sources, operations, spec)
  assert.equal(inventory.complete, true)
  assert.equal(inventory.methods.length, 9)
  const read = inventory.methods.find((method) => method.symbol === 'Api.read')!
  assert.equal(read.mapping, 'resolved')
  assert.deepEqual(read.operationIds, ['GET /api/items/{id}'])
  assert.equal(read.location.line, 11)
  assert.equal(read.implementations![0].line, 14)
  assert.equal(
    reconcileGenerated('DELETE /api/users/{login}', inventory).state,
    'available',
  )
  assert.equal(
    reconcileGenerated('HEAD /api/headers', inventory).state,
    'available',
  )
  assert.equal(
    reconcileGenerated('POST /api/quiz/live', inventory).state,
    'missing',
  )
})

test('separate and inline resource helpers retain GET identities alongside duplicate Observable methods', () => {
  const inventory = analyzeGenerated(sources, operations, spec)
  const read = reconcileGenerated('GET /api/items/{id}', inventory)
  assert.equal(read.state, 'available')
  if ('methodIds' in read) assert.equal(read.methodIds.length, 3)
  assert.deepEqual(
    inventory.methods
      .filter((method) => method.transport === 'resource-helper')
      .map((method) => method.symbol),
    ['blobResource', 'readResource', 'textResource'],
  )
  assert.equal(
    reconcileGenerated('GET /api/text', inventory).state,
    'available',
  )
  assert.equal(
    reconcileGenerated('GET /api/blob', inventory).state,
    'available',
  )
  const inline =
    collect(`${api('get(): Observable<object> { return this.http.get("/api/text"); }')}
    export function getResource() { return httpResource(() => '/api/text'); }`)
  assert.equal(inline.complete, true)
  assert.equal(inline.methods.length, 2)
})

test('resource request methods default to GET only when the method is absent', () => {
  const identities = [...operations, { id: 'POST /api/text' } as Operation]
  const explicit = collect(
    `${imports} export function read() { return httpResource(() => ({url: '/api/text', method: 'POST'})); }`,
    identities,
  )
  assert.equal(explicit.complete, true)
  assert.equal(
    reconcileGenerated('POST /api/text', explicit).state,
    'available',
  )
  assert.equal(reconcileGenerated('GET /api/text', explicit).state, 'missing')

  for (const request of [
    "{url: '/api/text', method}",
    "{url: '/api/text', ['method']: 'POST'}",
    "{url: '/api/text', [key]: 'POST'}",
    "{url: '/api/text', get method() { return 'POST'; }}",
    "{url: '/api/text', method: 'GET', method: 'POST'}",
    "{url: '/api/text', url: '/api/blob'}",
  ]) {
    const inventory = collect(
      `${imports} const method = 'POST'; const key = 'method';
      export function read() { return httpResource(() => (${request})); }`,
      identities,
    )
    assert.equal(inventory.complete, false, request)
    assert.equal(inventory.methods.length, 1)
    assert.equal(inventory.methods[0].mapping, 'unresolved')
    assert.ok(inventory.issues.some((issue) => issue.evidence.length))
    assert.equal(
      reconcileGenerated('GET /api/text', inventory).state,
      'incomplete-analysis',
      request,
    )
    assert.equal(
      reconcileGenerated('POST /api/text', inventory).state,
      'incomplete-analysis',
      request,
    )
  }
})

test('constant resource factory aliases retain inferred exported helpers and mutable aliases prevent absence claims', () => {
  for (const source of [
    `${imports} const factory = httpResource;
      export function read() { return factory(() => '/api/text'); }`,
    `import * as http from '@angular/common/http'; const base = http.httpResource;
      const factory = base.text; export const read = () => factory(() => '/api/text');`,
    `${imports} const base = httpResource; const factory = base.blob;
      export function read() { return factory(() => '/api/text'); }`,
    `${imports} export class Api { readonly factory = httpResource;
      read() { return this.factory(() => '/api/text'); } }`,
  ]) {
    const inventory = collect(source)
    assert.equal(inventory.complete, true, source)
    assert.equal(inventory.methods.length, 1)
    assert.equal(inventory.methods[0].transport, 'resource-helper')
    assert.equal(
      reconcileGenerated('GET /api/text', inventory).state,
      'available',
    )
    assert.equal(
      reconcileGenerated('POST /api/quiz/live', inventory).state,
      'missing',
    )
  }
  for (const source of [
    `${imports} let factory = httpResource; factory = unknownFactory;
      export function read() { return factory(() => '/api/text'); }`,
    `${imports} let base = httpResource; const factory = base.text;
      export function read() { return factory(() => '/api/text'); }`,
    `${imports} export class Api { factory = httpResource;
      read() { return this.factory(() => '/api/text'); } }`,
  ]) {
    const inventory = collect(source)
    assert.equal(inventory.complete, false, source)
    assert.equal(inventory.methods[0].mapping, 'unresolved')
    assert.ok(
      inventory.issues.some((issue) => issue.reason.includes('Mutable')),
    )
    assert.equal(
      reconcileGenerated('GET /api/text', inventory).state,
      'incomplete-analysis',
    )
    assert.equal(
      reconcileGenerated('POST /api/quiz/live', inventory).state,
      'incomplete-analysis',
    )
  }
})

test('extra generated identities preserve their actual transport and specification classification without fabricating server operations', () => {
  const inventory = analyzeGenerated(sources, operations, spec)
  const extra = inventory.methods.find(
    (method) => method.symbol === 'Api.extra',
  )!
  assert.deepEqual(extra.operationIds, [])
  assert.equal(extra.mapping, 'unresolved')
  assert.equal(extra.identities![0].method, 'PATCH')
  assert.equal(extra.identities![0].path, '/api/extra')
  assert.equal(extra.identities![0].specification.state, 'missing')
  const specOnly = collect(
    api('orphan() { return this.http.post("/api/quiz/live", {}); }'),
    [],
  )
  assert.equal(
    specOnly.methods[0].identities![0].specification.state,
    'present',
  )
  assert.equal(specOnly.complete, true)
})

test('branches and structurally similar placeholder names remain ambiguous', () => {
  const duplicate = collect(
    api(
      'read() { return this.http.get("/api/text"); } read() { return this.http.get("/api/blob"); }',
    ),
  )
  assert.equal(duplicate.methods.length, 2)
  assert.ok(duplicate.methods.every((method) => method.mapping === 'ambiguous'))
  assert.equal(duplicate.complete, false)
  assert.equal(
    reconcileGenerated('GET /api/text', duplicate).state,
    'ambiguous',
  )
  const branched = collect(
    api(
      'read(flag: boolean, id: number) { if (flag) return this.http.get(`/api/items/${id}`); return this.http.post("/api/items", {}); }',
    ),
  )
  assert.equal(branched.methods[0].mapping, 'ambiguous')
  assert.equal(branched.methods[0].identities!.length, 2)
  assert.equal(branched.complete, false)
  assert.equal(
    reconcileGenerated('GET /api/items/{id}', branched).state,
    'ambiguous',
  )
  const templates = collect(
    api('read(id: number) { return this.http.get(`/api/items/${id}`); }'),
    [...operations, { id: 'GET /api/items/{other}' } as Operation],
  )
  assert.equal(templates.methods[0].mapping, 'ambiguous')
  assert.equal(
    reconcileGenerated('GET /api/items/{id}', templates).state,
    'ambiguous',
  )
  const different = collect(
    api(
      'read(itemId: number) { return this.http.get(`/api/items/${itemId}`); }',
    ),
  )
  assert.equal(different.methods[0].mapping, 'ambiguous')
})

test('unsupported specification evidence does not erase independently observed generated implementations', () => {
  const invalid = parseSpecification(
    'openapi: 3.0.3\nservers: [{url: /prefix}]\npaths: {}',
    'specification',
    'spec.yaml',
  )
  const inventory = analyzeGenerated(sources, operations, invalid)
  assert.equal(inventory.complete, true)
  assert.equal(
    reconcileGenerated('GET /api/items/{id}', inventory).state,
    'available',
  )
  assert.ok(
    inventory.methods.every((method) =>
      method.identities?.every(
        (identity) => identity.specification.state === 'incomplete-analysis',
      ),
    ),
  )
})

test('dynamic URLs, mutable bindings, external bases, parse failures and delegated implementations prevent absence claims', () => {
  for (const source of [
    api('read(url: string) { return this.http.get(url); }'),
    api(
      'read() { let url = "/api/text"; url = getUrl(); return this.http.get(url); }',
    ),
    api('read() { return this.http.get("https://other.invalid/api/text"); }'),
    api('read(): Observable<object> { return this.delegate(); }'),
    api('read() { return this.delegate("/api/text"); }'),
    `${imports} export function read() { return fetch('/api/text'); }`,
    api('read = (): Observable<object> => this.delegate();'),
    api('private read() { return this.http.get("/api/text"); }'),
    api('read() { this.http.get("/api/text"); return null; }'),
    api('read() { return values.map(() => this.http.get("/api/text")); }'),
    `${imports} export function read(): HttpResourceRef<object> { return unknownResource(); }`,
    api('read() { return this.http.request(dynamicMethod, "/api/text"); }'),
    `${imports} export function read() { return httpResource(() => ({ ...config, url: '/api/text' })); }`,
    api('read( { broken syntax ! }'),
  ]) {
    const inventory = collect(source)
    assert.equal(inventory.complete, false, source)
    assert.ok(
      inventory.issues.every(
        (issue) => issue.evidence.length && issue.nextStep.length > 10,
      ),
    )
    assert.equal(
      reconcileGenerated('POST /api/quiz/live', inventory).state,
      'incomplete-analysis',
    )
  }
  assert.equal(
    reconcileGenerated('POST /api/quiz/live', undefined).state,
    'unknown',
  )
})

test('shadowed/non-HTTP objects cannot fabricate generated transport or adoption', () => {
  const inventory = collect(`${imports}
    class Other { http = { get: (url: string) => url }; get() { return this.http.get('/api/text'); } }
    function shadow(httpResource: Function) { return httpResource(() => '/api/text'); }`)
  assert.equal(inventory.methods.length, 0)
})
