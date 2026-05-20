---
name: finserveOS-dashboard
description: Master context for FinServe OS — Fintech LMS. Use when building, modifying, or debugging any part of the FinServe OS codebase. Loads full project context: design system, routes, data models, auth, conventions, known issues.
argument-hint: "[build | fix | review | explain] <feature or file>"
---

# /finserveOS-dashboard

> FinServe OS master AI context. Read this before touching any file in the project.

---

# FinServe OS — Master AI Context

> Read this first. Everything needed to work on this codebase without re-exploring.

---

## 1. Project Identity

- **Name**: FinServe OS — Fintech LMS for loan agents
- **Stack**: Next.js 14 App Router · TypeScript · Tailwind CSS · Zustand · React Query · Axios · Lato font
- **Dev port**: 3003
- **Node path**: `/Users/prashantshinde/.nvm/versions/node/v20.20.1/bin/node`
- **Status**: Active development, demo mode (no real backend, mock DB in-memory)

---

## 2. Design System

### Colors (`tailwind.config.ts`)

| Token | Hex | Use |
|---|---|---|
| `brand-500` / `primary` | `#D91B24` | Primary CTA, active nav, brand moments |
| `brand-50` | `#FEF2F2` | Tint bg — Secondary button, section highlights |
| `brand-100` | `#FECACA` | Tint border |
| `brand-700` | `#991016` | Hover state |
| `ink` | `#171717` | Primary text |
| `muted` | `#555555` | Secondary text |
| `subtle` | `#888888` | Labels, hints, placeholders |
| `surface` | `#F5F5F5` | Page background |
| `outline` | `#E0E0E0` | Card/section borders |
| `line` | `#D0D0D0` | Input borders (default) |

### Typography — Lato always

| Style | Size / Weight / Notes |
|---|---|
| Heading XL | 24px · 900 · tracking -0.02em |
| Heading L | 20px · 700 |
| Heading M | 16px · 700 |
| Body | 14px · 400 · lh 1.6 |
| Body sm | 12px · 400 · color: muted |
| Label (uppercase) | 10px · 700 · tracking 0.08em · UPPERCASE |
| Amount | 13px · 700 · brand red |

### Spacing — 4px base grid
`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48`

### Border Radius

| Class | px | Use |
|---|---|---|
| `rounded` | 8px | **Default** — buttons, inputs, cards |
| `rounded-full` | 999px | Pills, badges, avatars |
| `rounded-lg` | 12px | Modals, sheets |
| `rounded-xl` | 16px | Large overlays |

### Button Variants

| Variant | Classes |
|---|---|
| Primary | `bg-brand-500 text-white hover:bg-brand-700` |
| **Secondary** | `bg-[#FEF2F2] text-brand-700 border border-[#FECACA]` ← "tint bg · red text" |
| Outline | `bg-white text-ink border border-line` |
| Ghost | `bg-transparent text-brand-500` |
| Disabled | `bg-surface text-subtle border border-outline opacity-60 cursor-not-allowed` |

### Input States

| State | Classes |
|---|---|
| Default | `border border-line bg-white rounded-lg` |
| Focus | `border-brand-500 ring-2 ring-brand-50` |
| Error (soft) | `border-[#FEE2E2] bg-[#FEF9F9]` — **NO hard red border** |
| Error text | `text-[#DC2626]` with `<AlertCircle>` icon |

### Section Number Badge (form steps)
`bg-[#FEF2F2] text-[#D91B24] border border-[#FECACA] rounded-full` — NOT solid red/white

### Status Badges (`src/components/common/Badge.tsx`)

| Status | Classes |
|---|---|
| Approved / verified | `bg-green-50 text-green-800` |
| In Progress / uploaded | `bg-blue-50 text-blue-700` |
| Pending / docs pending | `bg-amber-50 text-amber-800` |
| Rejected / error / open | `bg-brand-50 text-brand-700` |
| New | `bg-surface text-muted` |

### Motion Tokens
`hover: 150ms ease` · `focus ring: 100ms` · `modal enter: 200ms ease-out` · `toast: 300ms slide-up`

### Design Rules (non-negotiable)
- ONE primary red CTA per view maximum
- Never red for decorative/info states
- All ₹ amounts: use `formatAmount()` from `src/lib/utils.ts` — Indian notation
- Same status = same color across all screens
- Raw `<select>` always paired with `<ChevronDown>` overlay icon
- Always `'use client'` at top of interactive components

---

## 3. Layout Architecture

### Route Groups
```
(auth)/login          → no sidebar, plain centered layout
(dashboard)/          → all app pages, sidebar + main
```

### Dashboard Layout (`src/app/(dashboard)/layout.tsx`)
```
<div> flex min-h-screen bg-surface max-w-[1400px] mx-auto
  <Sidebar>  260px · sticky · hidden on mobile
  <main>     flex-1 · px-5 py-4
<MobileNav>  bottom bar · mobile only
```

### Sidebar (`src/components/dashboard/Sidebar.tsx`)
- **Top**: F logo badge + "FinServe OS" + workspace search
- **Nav links**: Dashboard → `/dashboard` · All Leads → `/leads` · Issues → `/issues` · Documents → `/docs` · Alerts → `/alerts` · Settings → `/settings`
- **Active state**: `bg-brand-50 text-brand-700`
- **Bottom**: User card (avatar initial + name + role badge + logout button)
- **Role badge colors**: admin=`brand-50/red` · ops_manager=`blue-50` · agent=`green-50` · lead_generator=`amber-50` · viewer=`gray`

---

## 4. Routes

| URL | Page File | Client Component | Purpose |
|---|---|---|---|
| `/login` | `(auth)/login/page.tsx` | inline | Static credential login |
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | `DashboardClient` | Analytics + recent leads |
| `/leads` | `(dashboard)/leads/page.tsx` | `AllLeadsClient` | Lead pipeline list |
| `/leads/new` | `(dashboard)/leads/new/page.tsx` | `NewLeadForm` | Create lead (single screen) |
| `/leads/[id]` | `(dashboard)/leads/[id]/page.tsx` | `LeadTabs` + children | Lead detail with tabs |
| `/admin` | `(dashboard)/admin/page.tsx` | `AdminDashboardClient` | Admin pipeline |
| `/issues` | `(dashboard)/issues/page.tsx` | `IssuesPageClient` | Issue tracker |
| `/docs` | `(dashboard)/docs/page.tsx` | `DocumentsPageClient` | Documents view |
| `/alerts` | `(dashboard)/alerts/page.tsx` | `AlertsPageClient` | Alerts |
| `/settings` | `(dashboard)/settings/page.tsx` | inline + `AccessControlCenter` | Settings + RBAC |

### API Routes (all `/api/`)
```
GET  /leads                          → list all leads
POST /leads                          → create lead (validates customerName, customerMobile 10-digit, loanType, district)
GET  /leads/[id]                     → single lead
PUT  /leads/[id]                     → update lead
POST /leads/[id]/notes               → add note
POST /leads/[id]/issues              → raise issue
PATCH /leads/[id]/issues/[issueId]   → update issue status
POST /leads/[id]/documents           → upload document
PATCH /leads/[id]/checklist/[docId]  → update checklist item
PATCH /leads/[id]/admin              → update admin status (L1→L5)
PATCH /leads/[id]/cibil              → update CIBIL score
POST /leads/[id]/cibil/verify        → verify CIBIL document
POST /cibil/fetch                    → fetch CIBIL from API (mock)
```

---

## 5. Data Models (`src/types/lead.ts`)

### Lead (key fields)
```typescript
type Lead = {
  id: string              // 'L001', 'L002' — ALWAYS use .id, never _id or leadId
  leadCode: string | null // 'RF-PS-CSN-24-001'
  name: string
  loanType: string
  amount: number
  status: LeadStatus      // 'New' | 'In Progress' | 'Docs Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Draft'
  adminStatus: AdminLeadStatus  // 'L1: New Lead' → 'L5: Disbursed'
  checklist: ChecklistItem[]
  issues: LeadIssue[]
  notes: LeadNote[]
  activity: LeadActivity[]
  intake: NewLeadPayload | null
}
```

### UserRole
`'admin' | 'ops_manager' | 'agent' | 'lead_generator' | 'viewer'`

### AdminLeadStatus pipeline
`L1: New Lead` → `L2: Documentation` → `L3: Bank Login` → `L4: Sanctioned` → `L5: Disbursed`

---

## 6. State & Auth (`src/store/auth.store.ts`)

**Zustand store** — persisted to localStorage:
```
finserve-os-token   → session token string
finserve-os-role    → UserRole
finserve-os-user    → AuthUser JSON { name, mobile, role }
```

**Actions**: `setSession(token, role, user)` · `clearSession()`
**Helpers (non-hook)**: `getAuthUser()` · `getAuthRole()` · `getAuthToken()`

### Session Guard (`src/components/auth/DashboardDemoGate.tsx`)
- Every dashboard page → redirect `/login` if no session
- ⚠️ Has `useRef` guard — do NOT add `token` or `user` to `useEffect` deps (infinite loop bug)

### Static Login Credentials
| Username | Password | Role | Redirect |
|---|---|---|---|
| Prashant Shinde | 50555 | admin | `/admin` |
| Vrushal Shinde | 50555 | agent | `/dashboard` |
| Krishna P | 12345 | lead_generator | `/dashboard` |

---

## 7. Data Layer

### Mock DB (`src/lib/mock-db.ts`)
- **Persistence**: `globalThis.__finserve_leads` — survives Next.js HMR
- ⚠️ Never use `let leads = ...` at module level (resets on hot reload)
- Internal access via `getLeads()` / `setLeads()` only

### React Query Hooks (`src/hooks/useLead.ts`)
| Hook | QueryKey | Purpose |
|---|---|---|
| `useLeads()` | `['leads']` | Fetch all leads |
| `useLead(id)` | `['lead', id]` | Fetch single lead |
| `useCreateLead()` | — | POST + invalidates `['leads']` |
| `useAddNote(id)` | — | POST note |
| `useAddIssue(id)` | — | POST issue |
| `useUploadDoc(id)` | — | POST document |
| `useUpdateChecklistItem(id)` | — | PATCH checklist |
| `useUpdateAdminLeadStatus(id)` | — | PATCH L1→L5 |
| `useFetchCibil(id)` | — | POST CIBIL fetch |
| `useUpdateLeadCibil(id)` | — | PATCH CIBIL |
| `useVerifyLeadCibil(id)` | — | POST CIBIL verify |

All mutations → invalidate `['lead', id]` + `['leads']` on success.

**Service layer**: `src/services/lead.service.ts` → `src/services/api.ts` (axios)

---

## 8. Component Map

```
src/components/
  common/         Badge · EmptyState · Modal
  dashboard/      Sidebar · MobileNav
  forms/          NewLeadForm · new-lead-form.types.ts · StepBasic · StepReview
  leads/          DashboardClient · AllLeadsClient · LeadHeader · LeadTabs
                  lead-shared (LeadRow, StatCard) · CibilPanel · DocumentUpload
                  LeadWorkflowTimeline
  notes/          NotesTab
  issues/         IssueTracker · IssuesPageClient
  checklist/      ChecklistTab
  activity/       ActivityTimeline
  admin/          AdminDashboardClient
  settings/       AccessControlCenter
  auth/           DashboardDemoGate · AdminGuard
  ui/             button · card · input · skeleton · toast · use-toast
```

### Key Utilities
```
src/lib/utils.ts          cn() · formatAmount()
src/lib/demo-access.ts    getRoleLabel() · createDemoUser() · getDemoRedirect()
src/lib/mock-db.ts        All CRUD for leads + notifications
src/lib/lead-form.ts      buildEmptyLeadPayload() · buildDistrictCode() · LOAN_CATEGORY_OPTIONS
```

---

## 9. New Lead Form

**File**: `src/components/forms/NewLeadForm.tsx`
**Types**: `src/components/forms/new-lead-form.types.ts`
**Route**: `/leads/new`
**Pattern**: Single-screen, 6 numbered sections, no multi-step wizard

### Sections
1. **Basic Info** — First / Middle / Last name · Mobile (async duplicate check on blur, green=new, orange=existing) · Address Line1/Line2/Pincode (auto-fill city+state at 6 digits) / City / State
2. **Loan Intent** — Loan type dropdown · Quick chips (₹5L/10L/25L/50L/1Cr) · Manual ₹ input
3. **Loan Details** *(conditional — only for Home/Personal/Business/FPO)*

   | Loan Type | Dynamic Fields |
   |---|---|
   | Home Loan | propertyType · loanPurpose · propertyValue · employerName · workExperience · existingEMI |
   | Personal Loan | companyName · workExperience |
   | Business Loan | businessName · businessCategory · annualTurnover · yearsInBusiness · monthlyRevenue · **monthlyProfit** · gstRegistered (toggle) |
   | FPO Loan *(NEW)* | fpoName · registrationNumber · fpoBusinessType · loanPurpose · **annualTurnover** · yearsInOperation · landArea · memberCount |

4. **Qualification** — Monthly income · Employment type · CIBIL mode (manual/auto)
5. **Smart Eligibility** — Real-time slider

   | Loan Type | Formula |
   |---|---|
   | Home / Car / LAP / Other | `income × 60 × factor` |
   | Personal Loan | `income × 25 × factor` |
   | Business Loan | `monthlyProfit × 40` |
   | FPO Loan | `annualTurnover × 0.4` |

   CIBIL factors: ≥750→1.0 · 650–749→0.8 · <650→0.6 · null→0.7

6. **Upload Documents** — Dynamic checklist per loan type · Custom doc adder · Progress bar

### Document Checklists
| Loan Type | Required Docs |
|---|---|
| FPO Loan | FPO Registration Certificate · PAN Card · Bank Statement · Land Documents · Member List |
| Home Loan | Aadhaar Card · PAN Card · Salary Slips · Bank Statement · Property Documents |
| Personal Loan | Aadhaar Card · PAN Card · Bank Statement |
| Business Loan | Aadhaar Card · PAN Card · GST Certificate · Bank Statement · ITR |

### On Submit
- Maps `NewLeadIntakeForm` → `NewLeadPayload`
- POST via `useCreateLead()` mutation
- On success → redirect `/leads?new=<id>` (triggers highlight in AllLeadsClient for 2.5s)

---

## 10. Coding Conventions

### Always
- `cn()` for conditional Tailwind classes
- `formatAmount()` for all ₹ display
- `getRoleLabel()` for role display in UI
- Tailwind tokens, not raw hex in `className`
- `'use client'` directive on all components with state/hooks
- `@/` path alias (= `src/`)

### Never
- Hardcode leads in component state — use React Query + API
- Module-level `let` for server state — use `globalThis` pattern
- Two primary red buttons side by side
- Mix `id` / `_id` / `leadId` — always `lead.id`
- Add `token`/`user` to `useEffect` deps in `DashboardDemoGate` — infinite loop
- `<select>` without `<ChevronDown>` overlay
- Raw hex in Tailwind className when a token exists

### Patterns to Reuse
```typescript
// Class merging
import { cn } from '@/lib/utils'

// Amount display
import { formatAmount } from '@/lib/utils'
// formatAmount(4500000) → '₹45.0L'

// Role label
import { getRoleLabel } from '@/lib/demo-access'

// Auth (outside React)
import { getAuthUser } from '@/store/auth.store'

// Query invalidation after mutation
queryClient.invalidateQueries({ queryKey: ['leads'] })
queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
```

---

## 11. Known Issues / Watch Out

| Issue | Status | Notes |
|---|---|---|
| HMR resets mock DB | **Fixed** | `globalThis.__finserve_leads` pattern in `mock-db.ts` |
| DashboardDemoGate infinite loop | **Fixed** | `useRef` guard, deps = `[demoRole]` only |
| Lead highlight after create | Working | `?new=<id>` query param → 2.5s `bg-[#FEF2F2]` in `AllLeadsClient` |
| `/agent` `/lead-generator` routes | Not yet built | Both redirect to `/dashboard` for now |
| OTP auth | Not yet active | Placeholder note in login page, ready to wire |
