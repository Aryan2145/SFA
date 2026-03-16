import { headers } from 'next/headers'

export function getTenantId(): string {
  const tenantId = headers().get('x-tenant-id')
  if (tenantId) return tenantId
  const id = process.env.DEFAULT_TENANT_ID
  if (!id) throw new Error('DEFAULT_TENANT_ID env var is not set')
  return id
}
