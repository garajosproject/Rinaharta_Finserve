import { NextResponse } from 'next/server'
import { assignLead, findLead, updateWorkflowStep } from '@/lib/mock-db'
import type { WorkflowStepName, WorkflowStepStatus, WorkflowStep } from '@/types/lead'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as {
      action: 'update_step' | 'assign'
      stepName?: WorkflowStepName
      status?: WorkflowStepStatus
      data?: Partial<WorkflowStep['data']>
      remarks?: string
      changedBy?: string
      assignedUser?: string
    }

    const existing = findLead(params.id)
    if (!existing) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
    }

    if (body.action === 'assign') {
      if (!body.assignedUser) {
        return NextResponse.json({ message: 'assignedUser is required' }, { status: 400 })
      }
      const lead = assignLead(params.id, body.assignedUser, body.changedBy ?? 'Agent')
      return NextResponse.json(lead)
    }

    if (body.action === 'update_step') {
      if (!body.stepName) {
        return NextResponse.json({ message: 'stepName is required' }, { status: 400 })
      }

      // Cannot complete without remarks if rejecting or holding
      if ((body.status === 'rejected' || body.status === 'on_hold') && !body.remarks?.trim()) {
        return NextResponse.json(
          { message: `${body.status === 'rejected' ? 'Rejection' : 'On-hold'} reason is required` },
          { status: 400 }
        )
      }

      const lead = updateWorkflowStep(params.id, body.stepName, {
        status: body.status,
        data: body.data,
        remarks: body.remarks,
        changedBy: body.changedBy,
      })

      if (!lead) {
        return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
      }

      return NextResponse.json(lead)
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ message: 'Invalid request payload' }, { status: 400 })
  }
}
