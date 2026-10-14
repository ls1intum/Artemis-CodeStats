import { z } from 'zod'
import type {
  SourceLocation,
  ModuleAssessment,
} from '../../src/features/openapi/model'

const relative = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith('/') &&
      !value.includes('\\') &&
      value.split('/').every((part) => part && part !== '.' && part !== '..'),
    'Expected a relative POSIX path',
  )
export const mappingSchema = z
  .object({
    version: z.string().min(1),
    serverRoot: relative,
    clientRoot: relative,
    generatedRoot: relative.optional(),
    roleOverrides: z.record(
      z
        .object({
          role: z.enum([
            'server-module',
            'shared-infrastructure',
            'client-only',
            'unresolved',
          ]),
          reason: z.string().min(1),
        })
        .strict(),
    ),
    ownershipOverrides: z.array(
      z
        .object({
          prefix: relative,
          moduleId: z.string().min(1),
          reason: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict()
  .refine(
    (mapping) =>
      new Set(mapping.ownershipOverrides.map((item) => item.prefix)).size ===
      mapping.ownershipOverrides.length,
    'Ownership prefixes must be unique',
  )
  .refine(
    (mapping) =>
      mapping.ownershipOverrides.every(
        (item) =>
          item.prefix === mapping.serverRoot ||
          item.prefix.startsWith(mapping.serverRoot + '/'),
      ),
    'Ownership overrides must be within the server source root',
  )
export type ModuleMapping = z.infer<typeof mappingSchema>
export type DiscoveredModule = Pick<
  ModuleAssessment,
  'id' | 'role' | 'roots'
> & {
  limitation?: string
}
export const mappingLocation: SourceLocation = {
  inputId: 'module-mapping',
  path: 'report/openapi/module-mapping.json',
  line: 1,
}

// Discover the union, not a list of currently known Artemis modules. Roots cite actual files.
export function discoverModules(
  files: string[],
  mapping: ModuleMapping,
  evidenceFiles: ReadonlySet<string> = new Set(files),
): DiscoveredModule[] {
  const modules = new Map<string, DiscoveredModule>()
  for (const [root, inputId] of [
    [mapping.serverRoot, 'server'],
    [mapping.clientRoot, 'client'],
  ]) {
    for (const file of [...files].sort()) {
      if (!file.startsWith(root + '/')) continue
      const suffix = file.slice(root.length + 1)
      const id = suffix.includes('/') ? suffix.split('/')[0] : 'server-root'
      const role =
        mapping.roleOverrides[id]?.role ??
        (inputId === 'server' ? 'server-module' : 'client-only')
      const existing = modules.get(id)
      const anchor = { inputId, path: file, line: 1 }
      if (!existing)
        modules.set(id, {
          id,
          role,
          roots: [
            ...(evidenceFiles.has(file) ? [anchor] : []),
            ...(mapping.roleOverrides[id] ? [mappingLocation] : []),
          ],
        })
      else {
        if (inputId === 'server' && !(id in mapping.roleOverrides))
          existing.role = 'server-module'
        if (
          evidenceFiles.has(file) &&
          !existing.roots.some((location) => location.inputId === inputId)
        )
          existing.roots.push(anchor)
      }
    }
  }
  if (!modules.size)
    throw new Error(
      'No module discovery evidence in the configured source roots',
    )
  for (const module of modules.values()) {
    if (
      !module.roots.some((location) => location.inputId !== 'module-mapping')
    ) {
      module.roots = [mappingLocation]
      module.limitation = `Discovered area ${module.id} contains only empty files under the configured source roots; no source line can establish an inventory or no-REST state`
    }
  }
  for (const override of mapping.ownershipOverrides) {
    if (!modules.has(override.moduleId))
      throw new Error(
        `Ownership override targets undiscovered module ${override.moduleId}`,
      )
    if (
      !files.some(
        (file) =>
          file === override.prefix || file.startsWith(override.prefix + '/'),
      )
    ) {
      throw new Error(
        `Ownership override prefix has no committed source: ${override.prefix}`,
      )
    }
  }
  return [...modules.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'))
}

export function ownerOf(
  path: string,
  mapping: ModuleMapping,
  mappingLocation: SourceLocation,
) {
  const override = [...mapping.ownershipOverrides]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((item) => path === item.prefix || path.startsWith(item.prefix + '/'))
  if (override)
    return {
      moduleId: override.moduleId,
      evidence: [mappingLocation],
      reason: override.reason,
    }
  const suffix = path.slice(mapping.serverRoot.length + 1)
  return {
    moduleId: suffix.includes('/') ? suffix.split('/')[0] : 'server-root',
    evidence: [],
    reason: 'Discovered server source directory',
  }
}
