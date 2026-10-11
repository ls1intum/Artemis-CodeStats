import type { Provenance, SourceLocation } from './model'

export function sourceUrl(provenance: Provenance, location: SourceLocation) {
  const input = provenance.inputs.find((input) => input.id === location.inputId)
  // Collector-local configuration has a content hash but no Artemis storage revision.
  if (input?.revision.state !== 'known' || input.content.state !== 'available')
    return undefined
  const repository = new URL(provenance.repositoryUrl)
  if (!['http:', 'https:'].includes(repository.protocol)) return undefined
  return `${repository.href.replace(/\/$/, '')}/blob/${input.revision.commit}/${location.path.split('/').map(encodeURIComponent).join('/')}#L${location.line}`
}
