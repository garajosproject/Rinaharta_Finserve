import { NextResponse } from 'next/server'
import { ADMIN_ALLOWED_ROLES, ADMIN_STATUS_OPTIONS } from '@/lib/admin-leads'
import { getRequestUserRole, isAuthenticatedRequest } from '@/lib/auth'
import { updateAdminLeadStatus } from '@/lib/mock-db'
import type { AdminLeadStatus } from '@/types/lead'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticatedRequest(request)) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
  }

  const role = getRequestUserRole(request)
  if (!role || !ADMIN_ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = (await request.json()) as { adminStatus?: AdminLeadStatus }
    const adminStatus = body.adminStatus

    if (!adminStatus || !ADMIN_STATUS_OPTIONS.includes(adminStatus)) {
      return NextResponse.json({ message: 'Invalid admin status' }, { status: 400 })
    }

    const lead = updateAdminLeadStatus(params.id, adminStatus)

    if (!lead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch {
    return NextResponse.json({ message: 'Invalid request payload' }, { status: 400 })
  }
}
