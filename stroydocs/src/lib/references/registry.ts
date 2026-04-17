import type { ReferenceSchema } from './types';

export const REFERENCE_REGISTRY: Record<string, ReferenceSchema> = {};

export function getReferenceSchema(slug: string): ReferenceSchema | null {
  return REFERENCE_REGISTRY[slug] ?? null;
}

export function listReferenceSchemas(): ReferenceSchema[] {
  return Object.values(REFERENCE_REGISTRY);
}
