export function getTenantId(): string {
  const id = process.env.DEFAULT_TENANT_ID
  if (!id) throw new Error('DEFAULT_TENANT_ID env var is not set')
  return id
}
