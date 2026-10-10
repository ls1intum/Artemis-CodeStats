// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Parser fixture, not compiled client code.
// @ts-nocheck -- source-analysis fixture; Angular dependencies are intentionally not compiled.
import { httpResource as resource } from '@angular/common/http'
import * as angularHttp from '@angular/common/http'
import { Signal } from '@angular/core'

const BASE_PATH = ''

export function readResource(id: Signal<number | undefined>) {
  return resource(() => {
    const idValue = typeof id === 'function' ? id() : id
    if (idValue === undefined) return undefined
    return { url: `${BASE_PATH}/api/items/${idValue}`, method: 'GET' }
  })
}

export function textResource() {
  return resource.text(() => '/api/text')
}

export function blobResource() {
  return angularHttp.httpResource.blob(() => ({ url: '/api/blob' }))
}
