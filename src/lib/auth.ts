import type { UserRole } from '@/types/lead'

export function getRequestUserRole(request: Request) {
  const role = request.headers.get('x-user-role')
  return role as UserRole | null
}

export function isAuthenticatedRequest(request: Request) {
  const authHeader = request.headers.get('authorization')
  return Boolean(authHeader?.startsWith('Bearer '))
}
