# Product Requirements Document

Product: Finserve OS

Version: Final V8 (Execution-Ready)

## 1. Product Definition

Finserve OS is a financial distribution platform that enables DSA agents to:

- Capture leads
- Process loans
- Manage documents
- Track lifecycle
- Earn commissions

Core Nature:
A closed-loop loan processing system

## 2. Objectives

Business

- Increase loan conversion rate
- Reduce document rejection
- Scale DSA network
- Improve processing speed

User

- Know what to do next instantly
- Complete leads faster
- Avoid mistakes
- Track earnings clearly

## 3. User Roles (RBAC)

Super Admin

- Manage system, lenders, commission logic

Admin / Ops

- Verify documents
- Manage issues
- Approve workflows

Team Leader

- Manage team
- Assign leads
- Monitor performance

DSA Agent

- Create leads
- Upload documents
- Resolve issues
- Track earnings

## 4. Platform Rules

- Mobile-first system
- Desktop constrained layout (max width 1200px)
- Responsive across devices
- Low-bandwidth friendly

## 5. Authentication (OTP Flow)

Flow

1. Enter mobile number
2. Receive OTP
3. Enter OTP
4. Redirect to Dashboard

Mandatory UX Behavior

- Back option (change number)
- Loading state during verification
- Error handling (invalid OTP)
- Success redirect

## 6. Dashboard (System Entry Point)

Purpose

Provide context and action priority

Responsibilities

- Show leads needing attention
- Show system state (KPI snapshot)
- Enable quick actions

Sections

1. Header (Greeting + Primary CTA)
2. KPI Summary
3. Action Required (highest priority)
4. Lead Work Area
5. Insights

Key Rule

Dashboard is the default landing after login
Never redirect to lead creation

## 7. Knowledge Hub

Purpose

Central scheme library for agents

Features

- Scheme categories
- Smart filtering
- Comparison
- WhatsApp sharing
- Auto checklist generation

## 8. CRM System

Lead Pipeline

NEW -> VERIFIED -> QUALIFIED -> DOCS_PENDING -> DOCS_UPLOADED -> VERIFIED_DOCS -> SUBMITTED -> APPROVED -> DISBURSED -> PAID

Features

- Lead creation
- Status tracking
- Assignment
- Activity timeline

## 9. Complete Lead Lifecycle

Stage 1: Lead Creation

- Name
- Mobile
- Loan type
- Location

Stage 2: Validation

- Mobile validation
- Duplicate detection
- Optional OTP verification

Stage 3: Qualification

- Income
- Business details
- CIBIL

System suggests eligible schemes and lenders

Stage 4: Checklist Generation

- Auto checklist created
- Shareable via WhatsApp

Stage 5: Document Collection

- Upload documents
- File size limit: 1MB
- Format validation
- Compression

Stage 6: Verification

Admin actions:

- Approve
- Reject
- Raise issue

Stage 7: Issue Resolution

- Agent resolves issues
- Re-upload documents

Stage 8: Submission

- Submit to lender
- Multi-lender support

Stage 9: Decision

- Approved or Rejected

Stage 10: Disbursement

- Loan disbursed

Stage 11: Commission Trigger

- Auto calculation

Stage 12: Payout

- Pending
- Approved
- Paid

## 10. Lead Detail (Execution Engine)

Purpose

Central workspace for managing a lead

Sections

- Overview
- Checklist
- Documents
- Issues
- Notes
- Timeline

Features

Checklist

- Auto-generated
- Progress tracking

Documents

- Upload
- Replace
- Validate

Issues

- Create
- Assign
- Resolve

Notes

- Add notes
- System logs
- Activity tracking

Timeline

- Full audit trail

## 11. Document Management

Rules

- Max size: 1MB
- Allowed formats: image files
- Auto compression
- Upload validation

Future

- Document type detection
- OCR

## 12. CIBIL Module

- Manual entry
- Used for eligibility
- Future API integration

## 13. Commission & Payout System

Features

- Earnings dashboard
- Loan-level commission
- Payout tracking

Status

- Pending
- Approved
- Paid

Logic

- Based on loan amount
- Lender
- Commission rules

## 14. Social Distribution System

Features

- Message templates
- WhatsApp sharing
- Banner sharing

Purpose

Enable agents to generate leads independently

## 15. Team Management

Features

- Create teams
- Assign leads
- Role-based access
- Performance tracking

## 16. Multi-Lender System

Capabilities

- 427+ lenders
- Scheme mapping
- Submission tracking

## 17. Functional Requirements

- OTP authentication
- Lead CRUD
- Document upload
- Issue tracking
- Notes system
- Commission engine
- Sharing

## 18. Non-Functional Requirements

- Load time under 2 seconds
- Mobile-first performance
- Secure data handling
- Scalable architecture

## 19. Edge Cases

- Invalid OTP
- Duplicate leads
- Upload failure
- Network issues
- Partial data submission

## 20. Success Metrics

- Lead to approval conversion rate
- Time to disbursement
- Document rejection rate
- Agent earnings growth
- Daily active users

## 21. Product Philosophy

This system:

- Guides users step-by-step
- Reduces decision fatigue
- Eliminates process gaps
- Connects actions to earnings

Final Insight:

Most systems track work
This system completes work and drives revenue
