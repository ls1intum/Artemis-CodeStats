// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Parser fixture, not compiled client code.
// @ts-nocheck -- source-analysis fixture; Angular dependencies are intentionally not compiled.
import { HttpClient as Client } from '@angular/common/http'
import { inject as provide } from '@angular/core'
import { Observable } from 'rxjs'

export class Api {
  private readonly http = provide(Client)
  private readonly basePath = ''

  read(id: number, query: string): Observable<object> {
    const queryString = query
    const url = `${this.basePath}/api/items/${id}${queryString ? `?${queryString}` : ''}`
    return this.http.get(url)
  }

  duplicate(id: number): Observable<object> {
    return this.http.get(`/api/items/${id}`)
  }

  create(body: object): Observable<object> {
    return this.http.post('/api/items', body)
  }

  encoded(login: string): Observable<object> {
    const loginPath = encodeURIComponent(String(login))
    return this.http.delete(`/api/users/${loginPath}?view=full`)
  }

  extra(): Observable<object> {
    return this.http.request('PATCH', '/api/extra', {})
  }
}

export class ConstructorApi {
  constructor(private client: Client) {}
  head(): Observable<object> {
    const transport = this.client
    const url = '/api/' + 'headers'
    return transport.head(url)
  }
}
