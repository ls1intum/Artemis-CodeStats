import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  callSiteBucket,
  callerSchema,
  type Operation,
} from '../../src/features/openapi/model'
import { analyzeAdoption, reconcileAdoption } from './adoption'
import { analyzeGenerated } from './generated'

const scope = { clientRoot: 'client', generatedRoot: 'client/openapi' }
const operations = [
  'GET /api/items/{id}',
  'POST /api/items',
  'GET /api/text',
  'GET /api/blob',
  'DELETE /api/users/{login}',
  'HEAD /api/headers',
].map((id) => ({ id })) as Operation[]
const generated = await Promise.all(
  ['api.ts', 'resources.ts'].map(async (file) => ({
    path: `client/openapi/${file}`,
    content: await readFile(
      new URL(`./fixtures/generated/${file}`, import.meta.url),
      'utf8',
    ),
  })),
)
generated.push({
  path: 'client/openapi/index.ts',
  content: "export { Api as Items } from './api';",
})
const methods = analyzeGenerated(generated, operations).methods
const imports =
  "import { HttpClient } from '@angular/common/http'; import { inject } from '@angular/core'; import { Api } from 'app/openapi/api';"
const collect = (content: string, ids = operations) =>
  analyzeAdoption(
    [...generated, { path: 'client/shared-ui/probe.ts', content }],
    ids,
    methods,
    scope,
  )
const client = await readFile(
  new URL('./fixtures/adoption/client.ts', import.meta.url),
  'utf8',
)
const inventory = collect(client)

test('direct generated calls resolve import aliases, constructor/field DI, namespaces, barrels and resource functions', () => {
  assert.equal(
    inventory.callers.filter((caller) => caller.transport === 'generated')
      .length,
    4,
  )
  const reads = inventory.callers.filter(
    (caller) =>
      caller.generatedMethodId &&
      caller.operationIds.includes('GET /api/items/{id}'),
  )
  assert.equal(reads.length, 3)
  assert.ok(
    reads.every(
      (caller) =>
        caller.area === 'shared-ui' &&
        caller.symbol === 'Consumer.read' &&
        caller.mapping === 'resolved',
    ),
  )
  assert.ok(
    reads.some(
      (caller) =>
        methods.find((method) => method.id === caller.generatedMethodId)
          ?.transport === 'resource-helper',
    ),
  )
  for (const caller of inventory.callers)
    assert.equal(callerSchema.safeParse(caller).success, true)
})

test('ordinary manual URLs normalize relative paths, concatenation, parameters and queries; mixed operations keep all call sites', () => {
  const callers = inventory.callers.filter(
    (caller) => callSiteBucket(caller) === 'manual',
  )
  assert.equal(callers.length, 3)
  assert.equal(
    callers.filter((caller) =>
      caller.operationIds.includes('GET /api/items/{id}'),
    ).length,
    2,
  )
  const operation = { id: 'GET /api/items/{id}' } as Operation
  reconcileAdoption(operation, inventory)
  assert.equal(operation.adoption.state, 'mixed')
  assert.equal(operation.webRelevance.state, 'relevant')
  if ('callerIds' in operation.adoption) {
    assert.equal(operation.adoption.callerIds.length, 5)
    assert.equal(operation.adoption.analysis, 'incomplete-analysis')
  }
})

test('external, asset and websocket traffic are retained separately and excluded from REST measurements', () => {
  for (const traffic of ['external-api', 'asset', 'websocket']) {
    const caller = inventory.callers.find(
      (caller) => caller.traffic === traffic,
    )!
    assert.ok(caller)
    assert.equal(callSiteBucket(caller), undefined)
    assert.deepEqual(caller.operationIds, [])
  }
  assert.equal(
    inventory.callers.filter(
      (caller) => callSiteBucket(caller) === 'unresolved',
    ).length,
    1,
  )
  assert.equal(inventory.issues.length, 1)
})

test('unused imports/injections and excluded source implementations never count; local shadowing does not become transport', () => {
  assert.equal(
    collect(
      `${imports} class Unused { api = inject(Api); constructor(private http: HttpClient) {} }`,
    ).callers.length,
    0,
  )
  const sources = [
    'client/core/probe.spec.ts',
    'client/mocks/probe.ts',
    'client/__mocks__/probe.ts',
    'client/fixtures/probe.ts',
    'client/core/probe.mock.ts',
    'client/openapi/probe.ts',
  ].map((path) => ({
    path,
    content: `${imports} export class Api { http = inject(HttpClient); read() { return this.http.get('/api/items/123'); } }`,
  }))
  assert.equal(
    analyzeAdoption([...generated, ...sources], operations, methods, scope)
      .callers.length,
    0,
  )
  assert.equal(
    collect(
      `${imports} function work(inject: (x: unknown) => unknown) { const api = inject(Api); api.read(1); }`,
    ).callers.length,
    0,
  )
})

test('unsupported URLs/methods, receiver aliases, fetch and inherited helpers retain actionable records', () => {
  const result = collect(`${imports}
    class Service extends BaseApiHttpService {
      private http = inject(HttpClient); private root = '/api/items';
      work(url: string, method: string) {
        this.http.get(getUrl()); this.http.request(method, url);
        this.root = url; this.http.get(this.root);
        const alias = this.http; alias.get('/api/items');
        this.get('quiz/leaderboard-settings'); fetch(url);
      }
    }`)
  assert.equal(result.callers.length, 6)
  assert.equal(result.issues.length, 6)
  assert.ok(
    result.callers.every(
      (caller) =>
        caller.mapping === 'unresolved' && caller.operationIds.length === 0,
    ),
  )
  assert.ok(result.issues.some((issue) => issue.reason.includes('Inherited')))
  assert.ok(result.callers.some((caller) => caller.traffic === 'artemis-rest'))
  assert.ok(
    result.issues.every(
      (issue) =>
        issue.evidence[0].line > 0 && issue.nextStep.includes('recorded chain'),
    ),
  )
})

test('template ambiguity and server/spec gaps are preserved without inventing an operation', () => {
  const ids = [...operations, { id: 'GET /api/items/{otherId}' } as Operation]
  const ambiguous = collect(
    imports +
      ' class Service { http = inject(HttpClient); work(id: number) { this.http.get(`/api/items/${id}`); } }',
    ids,
  )
  assert.equal(ambiguous.callers[0].mapping, 'ambiguous')
  assert.equal(ambiguous.callers[0].operationIds.length, 2)
  assert.equal(callSiteBucket(ambiguous.callers[0]), 'unresolved')
  const extra = collect(
    `${imports} class Service { http = inject(HttpClient); work() { this.http.get('/api/missing'); } }`,
  )
  assert.equal(extra.callers[0].traffic, 'artemis-rest')
  assert.equal(extra.callers[0].mapping, 'unresolved')
  const generatedGap = collect(
    `${imports} class Service { api = inject(Api); work() { this.api.notIndexed(); } }`,
  )
  assert.equal(generatedGap.callers[0].transport, 'unresolved')
  assert.match(generatedGap.callers[0].reason, /0 indexed/)
})

test('generated detection stays nonexclusive and absence of calls does not establish server-only or migration', () => {
  const operation = { id: 'GET /api/items/{id}' } as Operation
  const direct = collect(
    `${imports} class Service { api = inject(Api); work(id: number) { this.api.read(id, ''); this.api.read(id, ''); } }`,
  )
  reconcileAdoption(operation, direct)
  assert.equal(operation.adoption.state, 'generated-detected')
  if ('callerIds' in operation.adoption)
    assert.equal(operation.adoption.callerIds.length, 2)
  const absent = {
    id: 'GET /api/text',
    webRelevance: { state: 'unassessed', reason: 'No supporting metadata' },
  } as Operation
  reconcileAdoption(absent, direct)
  assert.equal(absent.adoption.state, 'unassessed')
  assert.equal(absent.webRelevance.state, 'unassessed')
})

test('syntax failures remain visible analysis limitations', () => {
  const result = collect('class Broken { read( {')
  assert.equal(result.callers.length, 0)
  assert.ok(
    result.issues.some((issue) => issue.reason.includes('parse failure')),
  )
})

test('static parameter values, encoded parameters, namespace injection and query values match without conflating fixed routes', () => {
  const result = collect(
    "import * as http from '@angular/common/http'; import * as core from '@angular/core'; class Service { client = core.inject(http.HttpClient); work(login: string) { this.client.get('/api/items/123'); this.client.delete(`/api/users/${encodeURIComponent(login)}?q=${calculateQuery()}`); this.client.request('get', '/api/text'); } }",
  )
  assert.deepEqual(
    result.callers.map((caller) => caller.operationIds[0]).sort(),
    ['DELETE /api/users/{login}', 'GET /api/items/{id}', 'GET /api/text'],
  )
  const exact = collect(
    `${imports} class Service { http = inject(HttpClient); work() { this.http.get('/api/items/all'); } }`,
    [...operations, { id: 'GET /api/items/all' } as Operation],
  )
  assert.deepEqual(exact.callers[0].operationIds, ['GET /api/items/all'])
  const property = collect(
    `${imports} class Service { http = inject(HttpClient); work(item: { id: number }) { this.http.get('/api/items/' + item.id); } }`,
  )
  assert.deepEqual(property.callers[0].operationIds, ['GET /api/items/{id}'])
})

test('computed API access and unresolved export bindings cannot silently disappear', () => {
  const computed = collect(
    `${imports} class Service { api = inject(Api); http = inject(HttpClient); work(method: string) { this.api[method](); this.http[method]('/api/items'); } }`,
  )
  assert.equal(computed.callers.length, 2)
  assert.ok(
    computed.callers.every((caller) => callSiteBucket(caller) === 'unresolved'),
  )
  const broken = collect(
    "import { NotExported } from 'app/openapi/api'; import { inject } from '@angular/core'; class Service { api = inject(NotExported); work() { this.api.read(); } }",
  )
  assert.equal(broken.callers.length, 1)
  assert.match(broken.callers[0].reason, /import\/export/)
})

test('bracket, destructuring and computed writes invalidate URL and injected receiver bindings', () => {
  for (const assignment of [
    "this['root'] = url",
    '({ root: this.root } = { root: url })',
    '[this.root] = [url]',
    '({ root: this.root = url } = {})',
    'this[key] = url',
  ]) {
    const result = collect(`${imports} class Service {
      http = inject(HttpClient); root = '/api/text';
      work(url: string, key: string) { ${assignment}; this.http.get(this.root); }
    }`)
    assert.equal(result.callers.length, 1, assignment)
    assert.equal(callSiteBucket(result.callers[0]), 'unresolved', assignment)
    assert.deepEqual(result.callers[0].operationIds, [], assignment)
    assert.equal(result.issues.length, 1, assignment)
  }
  for (const assignment of [
    "this['api'] = other",
    '({ api: this.api } = { api: other })',
    '[this.api] = [other]',
  ]) {
    const result = collect(`${imports} class Service {
      api = inject(Api);
      work(other: Api) { ${assignment}; this.api.read(1, ''); }
    }`)
    assert.equal(result.callers.length, 1, assignment)
    assert.equal(callSiteBucket(result.callers[0]), 'unresolved', assignment)
    assert.match(result.callers[0].reason, /reassigned/)
  }
  const local = collect(`${imports} class Service {
    http = inject(HttpClient);
    work(url: string) {
      let root = '/api/text'; ({ root } = { root: url }); this.http.get(root);
    }
  }`)
  assert.equal(local.callers.length, 1)
  assert.equal(callSiteBucket(local.callers[0]), 'unresolved')
  assert.deepEqual(local.callers[0].operationIds, [])
})

test('missing generated files and directories retain actual calls through named, namespace and barrel imports', () => {
  const consumer = {
    path: 'client/shared-ui/probe.ts',
    content: `import { inject } from '@angular/core';
      import { Api as Items } from 'app/openapi/api';
      import * as services from '../openapi/api';
      import { readResource } from 'app/openapi/resources';
      import { Items as BarrelApi } from './barrel';
      class Service {
        api = inject(Items); unused = inject(Items);
        constructor(private namespace: services.Api, private barrel: BarrelApi) {}
        work(method: string) {
          this.api.read(1); this.namespace.read(2); this.barrel.read(3);
          readResource(4); this.api[method](5);
        }
      }`,
  }
  const barrel = {
    path: 'client/shared-ui/barrel.ts',
    content: "export { Api as Items } from '../openapi/api';",
  }
  for (const available of [
    [],
    generated.filter((file) => !file.path.endsWith('/api.ts')),
  ]) {
    const result = analyzeAdoption(
      [consumer, barrel, ...available],
      operations,
      [],
      scope,
    )
    assert.equal(result.callers.length, 5)
    assert.equal(result.issues.length, 5)
    assert.ok(
      result.callers.every(
        (caller) =>
          callSiteBucket(caller) === 'unresolved' &&
          caller.mapping === 'unresolved' &&
          caller.operationIds.length === 0 &&
          !caller.generatedMethodId &&
          caller.location.path === consumer.path,
      ),
    )
    assert.ok(result.issues.every((issue) => issue.evidence[0].line > 0))
  }
})

test('generated receiver aliases resolve when stable; computed/reassigned/missing bindings remain actionable', () => {
  const content = `${imports} class Service {
    api = inject(Api); fieldAlias = this.api;
    work(other: unknown, method: string) {
      const unused = this.api; const alias = this.api; const second = alias;
      second.read(1); this.fieldAlias.read(2); alias[method](3);
      let reassigned = this.api; reassigned = other; reassigned.read(4);
      { const alias = other; alias.read(5); }
      let cycle = other; let cycle2 = cycle; cycle = cycle2; cycle.read(6);
    }
  }`
  for (const available of [generated, []]) {
    const result = analyzeAdoption(
      [...available, { path: 'client/shared-ui/probe.ts', content }],
      operations,
      methods,
      scope,
    )
    assert.equal(result.callers.length, 4)
    assert.equal(result.issues.length, available.length ? 2 : 4)
    assert.equal(
      result.callers.filter((caller) => callSiteBucket(caller) === 'generated')
        .length,
      available.length ? 2 : 0,
    )
    assert.ok(
      result.issues.every((issue) => issue.nextStep.includes('recorded chain')),
    )
    assert.ok(result.callers.some((caller) => /reassigned/.test(caller.reason)))
  }
})

test('inherited wrappers and generated adapters retain source chains without counting implementation nodes as production sites', async () => {
  const wrappers = {
    path: 'client/shared/wrappers.ts',
    content: await readFile(
      new URL('./fixtures/adoption/wrappers.ts', import.meta.url),
      'utf8',
    ),
  }
  const content = `import { inject } from '@angular/core'; import { Leaderboard, GeneratedAdapter } from 'app/shared/wrappers';
    class Consumer { manual=inject(Leaderboard); generated=inject(GeneratedAdapter); read(id:number) { this.manual.read(id); this.generated.read(id); } }`
  const result = analyzeAdoption(
    [...generated, wrappers, { path: 'client/core/consumer.ts', content }],
    operations,
    methods,
    scope,
  )
  const production = result.callers.filter(
    (caller) => caller.kind === 'production',
  )
  assert.equal(production.length, 2)
  assert.deepEqual(production.map((caller) => caller.transport).sort(), [
    'generated',
    'manual',
  ])
  assert.ok(
    production.every(
      (caller) =>
        caller.operationIds[0] === 'GET /api/items/{id}' &&
        caller.via.some((location) => location.path === wrappers.path),
    ),
  )
  assert.ok(
    result.callers.some(
      (caller) =>
        caller.kind === 'wrapper-implementation' &&
        caller.location.path === wrappers.path,
    ),
  )
  const operation = { id: 'GET /api/items/{id}' } as Operation
  reconcileAdoption(operation, result)
  assert.equal(operation.adoption.state, 'mixed')
})

test('ordinary local forwarding functions resolve arguments; multiple branches and recursive chains stay unresolved', () => {
  const result = collect(`${imports}
    const http = inject(HttpClient);
    function forward(url:string) { return http.get(url); }
    function many() { http.get('/api/text'); http.get('/api/blob'); }
    function recursive(url:string) { recursive(url); return http.get(url); }
    forward('/api/text'); many(); recursive('/api/text');`)
  const production = result.callers.filter(
    (caller) => caller.kind === 'production',
  )
  assert.equal(production.length, 7)
  assert.equal(
    production.filter((caller) => caller.mapping === 'resolved').length,
    3,
  )
  assert.ok(
    production.some((caller) => /multiple branches/.test(caller.reason)),
  )
  assert.ok(
    production.some(
      (caller) => caller.via.length > 0 && caller.mapping !== 'resolved',
    ),
  )
})

test('arrow forwarders resolve stable aliases; dynamic wrapper dispatch and mutated arguments remain actionable', async () => {
  const wrappers = {
    path: 'client/shared/wrappers.ts',
    content: await readFile(
      new URL('./fixtures/adoption/wrappers.ts', import.meta.url),
      'utf8',
    ),
  }
  const content = `${imports} import { Leaderboard } from 'app/shared/wrappers';
    const http = inject(HttpClient);
    const forward = (url:string) => http.get(url);
    forward('/api/text');
    class Consumer {
      service = inject(Leaderboard);
      work(method:string,other:Leaderboard) {
        const alias = this.service; alias.read(1); alias[method](2);
        let changed = this.service; changed = other; const changedAlias = changed; changedAlias.read(3);
      }
    }
    function mutated(url:string) { url = calculate(); return http.get(url); }
    mutated('/api/text');`
  const result = analyzeAdoption(
    [...generated, wrappers, { path: 'client/core/consumer.ts', content }],
    operations,
    methods,
    scope,
  )
  const production = result.callers.filter(
    (caller) =>
      caller.kind === 'production' &&
      caller.location.path === 'client/core/consumer.ts',
  )
  assert.equal(production.length, 5)
  assert.equal(
    production.filter((caller) => callSiteBucket(caller) === 'manual').length,
    2,
  )
  assert.equal(
    production.filter((caller) => callSiteBucket(caller) === 'unresolved')
      .length,
    3,
  )
  assert.ok(production.some((caller) => caller.reason.includes('Computed')))
  assert.ok(production.some((caller) => caller.reason.includes('reassigned')))
  assert.equal(
    result.callers.find((caller) => caller.symbol === 'forward')!.kind,
    'wrapper-implementation',
  )
})

test('ambiguous caller candidates do not establish a positive adoption or web-relevance state', () => {
  const ids = [...operations, { id: 'GET /api/items/{otherId}' } as Operation]
  const result = collect(
    imports +
      ' class Service { http = inject(HttpClient); work(id: number) { this.http.get(`/api/items/${id}`); } }',
    ids,
  )
  const operation = {
    id: 'GET /api/items/{id}',
    webRelevance: { state: 'unassessed', reason: 'No supporting metadata' },
  } as Operation
  reconcileAdoption(operation, result)
  assert.equal(operation.adoption.state, 'incomplete-analysis')
  assert.equal(operation.webRelevance.state, 'incomplete-analysis')
})

test('known mixed usage stays mixed when additional indirect candidates are ambiguous', () => {
  const result = collect(
    `${imports} class Service { api=inject(Api); http=inject(HttpClient); read(id:number) { this.api.read(id,''); this.http.get('/api/items/'+id); } }`,
  )
  result.callers.push({
    ...result.callers[0],
    id: 'ambiguous-chain',
    transport: 'unresolved',
    traffic: 'unresolved',
    mapping: 'ambiguous',
    generatedMethodId: undefined,
    operationIds: ['GET /api/items/{id}', 'GET /api/text'],
    reason: 'Multiple terminals',
  })
  const operation = { id: 'GET /api/items/{id}' } as Operation
  reconcileAdoption(operation, result)
  assert.equal(operation.adoption.state, 'mixed')
  assert.ok(
    'callerIds' in operation.adoption &&
      operation.adoption.callerIds.includes('ambiguous-chain'),
  )
  assert.ok(
    'analysis' in operation.adoption &&
      operation.adoption.analysis === 'incomplete-analysis',
  )
})

test('nested declarations do not invent caller chains and transport callbacks keep unsupported dispatch visible', () => {
  const result = collect(`${imports} const http=inject(HttpClient);
    function unused() { function nested() { return http.get('/api/text'); } }
    function callback() { schedule(() => http.get('/api/blob')); }
    unused(); callback();`)
  assert.ok(
    !result.callers.some(
      (caller) =>
        caller.symbol === '<top-level>' && caller.mapping === 'resolved',
    ),
  )
  assert.equal(
    result.callers.filter((caller) => caller.mapping === 'resolved').length,
    2,
    'actual transport syntax remains independently visible',
  )
  assert.ok(
    result.callers.some(
      (caller) =>
        caller.symbol === '<top-level>' &&
        caller.mapping === 'unresolved' &&
        caller.via.length,
    ),
  )
})

test('reassigned source methods retain the call without using their original transport body', () => {
  const result = collect(`${imports} class Service {
    http=inject(HttpClient);
    request(url:string) { return this.http.get(url); }
    work(replacement:unknown) { this.request=replacement; this.request('/api/text'); }
  }`)
  const caller = result.callers.find(
    (caller) => caller.symbol === 'Service.work',
  )!
  assert.equal(caller.mapping, 'unresolved')
  assert.equal(callSiteBucket(caller), 'unresolved')
  assert.match(caller.reason, /method\/function is reassigned/)
  assert.ok(caller.via.length)
})

test('method writes on injected transports invalidate calls through receiver aliases without poisoning other instances', () => {
  for (const assignment of [
    'this.api.read = replacement',
    "this.api['read'] = replacement",
    'this.api[key] = replacement',
    'alias.read = replacement',
    '({ read: this.api.read } = { read: replacement })',
  ]) {
    const result = collect(`${imports} class Consumer {
      api=inject(Api); other=inject(Api);
      work(replacement: Api['read'], key: string) {
        const alias=this.api; ${assignment};
        alias.read(1,''); this.api.read(2,''); this.other.read(3,'');
      }
    }`)
    assert.equal(result.callers.length, 3, assignment)
    assert.equal(
      result.callers.filter((caller) => callSiteBucket(caller) === 'generated')
        .length,
      1,
      assignment,
    )
    assert.equal(
      result.callers.filter((caller) => callSiteBucket(caller) === 'unresolved')
        .length,
      2,
      assignment,
    )
    assert.equal(result.issues.length, 2, assignment)
    assert.ok(
      result.callers
        .filter((caller) => caller.transport === 'unresolved')
        .every((caller) => /reassigned/.test(caller.reason)),
      assignment,
    )
  }
  const http = collect(`${imports} class Consumer {
    http=inject(HttpClient);
    work(replacement: unknown) { this.http.get=replacement; this.http.get('/api/text'); }
  }`)
  assert.equal(callSiteBucket(http.callers[0]), 'unresolved')
  assert.deepEqual(http.callers[0].operationIds, [])
})

test('overwritten injected source-wrapper methods keep unresolved consumer evidence', async () => {
  const wrappers = {
    path: 'client/shared/wrappers.ts',
    content: await readFile(
      new URL('./fixtures/adoption/wrappers.ts', import.meta.url),
      'utf8',
    ),
  }
  const result = analyzeAdoption(
    [
      ...generated,
      wrappers,
      {
        path: 'client/core/consumer.ts',
        content: `${imports} import { GeneratedAdapter } from 'app/shared/wrappers';
      class Consumer { service=inject(GeneratedAdapter); work(replacement: unknown) {
        this.service.read=replacement; this.service.read(1);
      } }`,
      },
    ],
    operations,
    methods,
    scope,
  )
  const caller = result.callers.find((caller) => caller.area === 'core')!
  assert.equal(callSiteBucket(caller), 'unresolved')
  assert.match(caller.reason, /reassigned/)
  assert.ok(caller.via.some((location) => location.path === wrappers.path))
})

test('imported arrows and stable function aliases resolve while bound/extracted methods remain actionable', async () => {
  const wrappers = {
    path: 'client/shared/wrappers.ts',
    content: await readFile(
      new URL('./fixtures/adoption/wrappers.ts', import.meta.url),
      'utf8',
    ),
  }
  const result = analyzeAdoption(
    [
      ...generated,
      wrappers,
      {
        path: 'client/shared/forward.ts',
        content: `${imports} export const forward=(http: HttpClient, url:string)=>http.get(url);`,
      },
      {
        path: 'client/core/consumer.ts',
        content: `${imports} import { forward as imported } from 'app/shared/forward';
        import * as functions from 'app/shared/forward';
      import { Leaderboard, GeneratedAdapter } from 'app/shared/wrappers';
      class Consumer {
        http=inject(HttpClient); manual=inject(Leaderboard); generated=inject(GeneratedAdapter); api=inject(Api);
        work(other: Leaderboard) {
          const alias=imported; const second=alias; second(this.http, '/api/text');
          functions.forward(this.http, '/api/text');
          const bound=this.manual.read.bind(this.manual); const unused=this.manual.read.bind(this.manual); bound(1);
          const extracted=this.generated.read; extracted(2);
          const apiBound=this.api.read.bind(this.api); apiBound(3,'');
          let changed=this.manual; changed=other;
          const rebound=changed.read.bind(changed); rebound(4);
        }
      }`,
      },
    ],
    operations,
    methods,
    scope,
  )
  const production = result.callers.filter(
    (caller) => caller.area === 'core' && caller.kind === 'production',
  )
  assert.equal(production.length, 6)
  assert.equal(
    production.filter((caller) => callSiteBucket(caller) === 'manual').length,
    2,
  )
  assert.equal(
    production.filter((caller) => callSiteBucket(caller) === 'unresolved')
      .length,
    4,
  )
  assert.ok(
    production
      .filter((caller) => caller.transport === 'unresolved')
      .every((caller) => caller.via.length && /alias/.test(caller.reason)),
  )
  assert.equal(result.issues.length, 4)
  assert.equal(
    result.callers.find((caller) => caller.symbol === 'forward')!.kind,
    'wrapper-implementation',
  )
})

test('writes at an imported function declaration invalidate aliased consumers', () => {
  const result = analyzeAdoption(
    [
      ...generated,
      {
        path: 'client/shared/forward.ts',
        content: `${imports} export let forward=(http: HttpClient,url:string)=>http.get(url);
      forward=replacement;`,
      },
      {
        path: 'client/core/consumer.ts',
        content: `${imports} import { forward } from 'app/shared/forward';
      const http=inject(HttpClient); const alias=forward; alias(http,'/api/text');`,
      },
    ],
    operations,
    methods,
    scope,
  )
  const caller = result.callers.find((caller) => caller.area === 'core')!
  assert.equal(callSiteBucket(caller), 'unresolved')
  assert.match(caller.reason, /reassigned/)
  assert.equal(
    result.issues.filter((issue) =>
      issue.evidence.some(
        (location) => location.path === 'client/core/consumer.ts',
      ),
    ).length,
    1,
  )
})

test('abstract wrapper implementation nodes, reassigned DI and handwritten resources are retained without claiming production adoption', () => {
  const wrapper = collect(
    `${imports} abstract class Base { http = inject(HttpClient); request(url: string) { return this.http.get(url); } }`,
  )
  assert.equal(wrapper.callers[0].kind, 'wrapper-implementation')
  assert.equal(callSiteBucket(wrapper.callers[0]), undefined)
  const reassigned = collect(
    `${imports} class Service { api = inject(Api); work(other: Api) { this.api = other; this.api.read(1, ''); } }`,
  )
  assert.equal(reassigned.callers.length, 1)
  assert.equal(callSiteBucket(reassigned.callers[0]), 'unresolved')
  assert.match(reassigned.callers[0].reason, /reassigned/)
  const resource = collect(
    "import { httpResource } from '@angular/common/http'; class Image { image = httpResource.blob(() => this.src()); }",
  )
  assert.equal(resource.callers.length, 1)
  assert.match(resource.callers[0].reason, /Handwritten httpResource/)
  const params = collect(
    "import { HttpParams } from '@angular/common/http'; function adjust(options: HttpParams) { options = options.append('key', 'value'); return options.set('key', 'value'); }",
  )
  assert.equal(
    params.callers.length,
    0,
    'HttpParams configuration is not transport',
  )
})
