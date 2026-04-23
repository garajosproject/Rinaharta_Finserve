import type { AuthUser, UserRole } from '@/types/lead'

export type DemoRoleParam = 'admin' | 'agent' | 'ops' | 'lead_generator' | 'viewer'

const DEMO_ROLE_MAP: Record<DemoRoleParam, UserRole> = {
  admin:          'admin',
  agent:          'agent',
  ops:            'ops_manager',
  lead_generator: 'lead_generator',
  viewer:         'viewer',
}

export const DEMO_USER_DATA = {
  name: 'Demo User',
  mobile: '9999999999',
}

export function normalizeDemoRole(value: string | null): UserRole | null {
  if (!value) return null
  const normalized = value.toLowerCase() as DemoRoleParam
  return DEMO_ROLE_MAP[normalized] ?? null
}

export function createDemoUser(role: UserRole): AuthUser {
  return {
    ...DEMO_USER_DATA,
    role,
  }
}

export function getRoleLabel(role: UserRole) {
  switch (role) {
    case 'admin':          return 'Admin'
    case 'agent':          return 'Agent'
    case 'ops_manager':    return 'Ops Manager'
    case 'lead_generator': return 'Lead Generator'
    case 'viewer':         return 'Viewer'
  }
}

// Role-based post-login redirect
export function getDemoRedirect(role: UserRole): string {
  switch (role) {
    case 'admin':       return '/admin'
    case 'ops_manager': return '/admin'
    default:            return '/dashboard'
  }
}
