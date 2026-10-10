// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Parser fixture, not compiled client code.
// @ts-nocheck -- Angular dependencies are intentionally not installed in this source-analysis fixture.
import { inject as provide } from '@angular/core'
import { HttpClient as Client } from '@angular/common/http'
import { Api as ItemsApi } from 'app/openapi/api'
import * as Generated from 'app/openapi/index'
import { readResource as loadItem } from 'app/openapi/resources'

export class Consumer {
  private readonly generated = provide(ItemsApi)
  private readonly unused = provide(ItemsApi)
  private readonly http = provide(Client)
  private readonly resourceUrl = 'api/items'

  constructor(
    private api: Generated.Items,
    private transport: Client,
  ) {}

  read(id: number) {
    this.generated.read(id, '')
    this.api.read(id, '')
    loadItem(() => id)
    this.http.get(`${this.resourceUrl}/${id}?page=1`)
    this.transport.request('GET', 'api/items/' + id)
  }

  create(body: object) {
    this.generated.create(body)
    this.http.post('/api/items', body)
  }

  separate(url: string) {
    this.http.get('https://example.org/api/items')
    this.http.get('/assets/settings.json')
    this.http.get(url)
    new WebSocket('wss://example.org/live')
  }
}
