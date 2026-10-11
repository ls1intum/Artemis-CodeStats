// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Source analysis fixture.
// @ts-nocheck -- No Angular installation or runtime execution is needed.
import { inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Api } from 'app/openapi/api'

export enum Verb {
  Get = 'GET',
  Put = 'PUT',
}
export abstract class BaseTransport {
  private http = inject(HttpClient)
  protected baseUrl = 'api'
  protected get(url: string) {
    return this.request(Verb.Get, url)
  }
  protected put(url: string) {
    return this.request(Verb.Put, url)
  }
  private request(method: Verb, url: string) {
    return this.http.request(method, `${this.baseUrl}/${url}`)
  }
}
export class Leaderboard extends BaseTransport {
  read(id: number) {
    return this.get(`items/${id}`)
  }
}
export class GeneratedAdapter {
  private api = inject(Api)
  read(id: number) {
    const alias = this.api
    return alias.read(id, '')
  }
}
