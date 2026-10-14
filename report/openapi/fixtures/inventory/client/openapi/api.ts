// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Parser fixture, not compiled client code.
// @ts-nocheck -- committed-tree fixture for generated transport analysis.
import { HttpClient } from '@angular/common/http'
import { inject } from '@angular/core'

export class AlphaApi {
  private readonly http = inject(HttpClient)

  read(id: number) {
    return this.http.get(`/api/alpha/${id}`)
  }

  all() {
    return this.http.get('/api/alpha/all')
  }
}
