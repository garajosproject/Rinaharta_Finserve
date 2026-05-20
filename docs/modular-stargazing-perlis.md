# Plan: FinServe OS — Master AI Context File (CLAUDE.md)

## Context

No CLAUDE.md exists at project root. Every new AI session re-explores the codebase from scratch — wastes tokens, risks inconsistency, may violate design rules it doesn't know. Goal: single authoritative file that any Claude session reads first and immediately understands the full project: stack, design system, layout, data models, conventions, do/don'ts.

---

## File Location

`/Users/prashantshinde/Documents/2.Finserve OS/CLAUDE.md`

---

## Structure of CLAUDE.md

### 1. Project Identity (5 lines)
- Name: FinServe OS — Fintech LMS for loan agents
- Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Zustand · React Query · Axios · Lato font
- Port: 3003 (dev)
- Node: `/Users/prashantshinde/.nvm/versions/node/v20.20.1/bin/node`
- Status: Active development, demo mode (no real backend)

---

### 2. Design System (core reference, always follow)

**Color tokens** (from tailwind.config.ts + style guide):
| Token | Value | Use |
|---|---|---|
| `brand-500` / `primary` | `#D91B24` | Primary CTA, active nav, brand moments |
| `brand-50` | `#FEF2F2` | Tint bg (Secondary button, section highlights) |
| `brand-100` | `#FECACA` | Tint border |
| `brand-700` | `#991016` | Hover state |
| `ink` | `#171717` | Primary text |
| `muted` | `#555555` | Secondary text |
| `subtle` | `#888888` | Labels, hints |
| `surface` | `#F5F5F5` | Page background |
| `outline` | `#E0E0E0` | Borders |
| `line` | `#D0D0D0` | Input borders |

**Typography** (Lato, always):
- Heading XL: 24px / 900 / -0.02em
- Heading L: 20px / 700
- Heading M: 16px / 700
- Body: 14px / 400
- Body sm: 12px / 400 / color: muted
- Label (uppercase): 10px / 700 / 0.08em tracking
- Amount: 13px / 700 / brand red

**Spacing**: 4px base grid (4, 8, 12, 16, 20, 24, 32, 40, 48)

**Border radius**:
- `rounded` (8px) — default: buttons, inputs, cards ← most common
- `rounded-full` (999px) — pills, badges, avatars
- `rounded-lg` (12px) — modals, sheets
- `rounded-xl` (16px) — large overlays

**Button variants**:
- Primary: `bg-brand-500 text-white` hover `bg-brand-700`
- Secondary: `bg-[#FEF2F2] text-brand-700 border border-[#FECACA]` ← "Secondary" style
- Outline: `bg-white text-ink border border-line`
- Ghost: `bg-transparent text-brand-500`
- Disabled: `bg-surface text-subtle border border-outline opacity-60`

**Input states**:
- Default: `border border-line bg-white` rounded-lg
- Focus: `border-brand-500 ring-2 ring-brand-50`
- Error (soft): `border-[#FEE2E2] bg-[#FEF9F9]` — NO hard red border
- Error text: `text-[#DC2626]`

**Section number badge** (form steps): `bg-[#FEF2F2] text-[#D91B24] border border-[#FECACA]` rounded-full — NOT solid red

**Status badges** (component: `src/components/common/Badge.tsx`):
- Approved/verified: `bg-green-50 text-green-800`
- In Progress/uploaded: `bg-blue-50 text-blue-700`
- Pending: `bg-amber-50 text-amber-800`
- Rejected/error/open: `bg-brand-50 text-brand-700`
- New: `bg-surface text-muted`

**Motion tokens**: hover 150ms ease · focus ring 100ms · modal 200ms ease-out

**Rules (from design guide do/don't)**:
- ONE primary red CTA per view max
- Never use red decoratively or for info states
- All amounts: ₹ prefix + Indian notation via `formatAmount()` in `src/lib/utils.ts`
- Same status = same color across ALL screens

---

### 3. Layout Architecture

**Route groups**:
```
(auth)/login          → login page, no sidebar
(dashboard)/          → all app pages, sidebar + main layout
```

**Dashboard layout** (`src/app/(dashboard)/layout.tsx`):
```
flex min-h-screen bg-surface max-w-[1400px] mx-auto
  Sidebar (260px, sticky, hidden on mobile)
  <main> flex-1 px-5 py-4
MobileNav (bottom bar, mobile only)
```

**Sidebar** (`src/components/dashboard/Sidebar.tsx`):
- Logo block (F badge + "FinServe OS")
- Search input
- Nav: Dashboard `/dashboard` · All Leads `/leads` · Issues `/issues` · Documents `/docs` · Alerts `/alerts` · Settings `/settings`
- Active state: `bg-brand-50 text-brand-700`
- Bottom: User profile card (name + role badge + logout)
- Role badge colors: admin=brand-50/red · ops_manager=blue-50 · agent=green-50 · lead_generator=amber-50 · viewer=gray

---

### 4. Routes Map

| URL | Component | Purpose |
|---|---|---|
| `/login` | `(auth)/login/page.tsx` | Static credential login |
| `/dashboard` | `(dashboard)/dashboard/page.tsx` → `DashboardClient` | Main dashboard |
| `/leads` | `(dashboard)/leads/page.tsx` → `AllLeadsClient` | Lead pipeline list |
| `/leads/new` | `(dashboard)/leads/new/page.tsx` → `NewLeadForm` | Create lead (single screen) |
| `/leads/[id]` | `(dashboard)/leads/[id]/page.tsx` → tabs | Lead detail |
| `/admin` | `(dashboard)/admin/page.tsx` → `AdminDashboardClient` | Admin only |
| `/issues` | `(dashboard)/issues/page.tsx` → `IssuesPageClient` | Issue tracker |
| `/docs` | `(dashboard)/docs/page.tsx` → `DocumentsPageClient` | Documents |
| `/alerts` | `(dashboard)/alerts/page.tsx` → `AlertsPageClient` | Alerts |
| `/settings` | `(dashboard)/settings/page.tsx` | Settings + RBAC + AccessControlCenter |

**API routes** (all under `/api/`):
- `GET/POST /leads` — list + create
- `GET/PUT /leads/[id]` — detail + update
- `POST /leads/[id]/notes` · `/issues` · `/documents`
- `PATCH /leads/[id]/issues/[issueId]` · `/checklist/[docId]` · `/admin` · `/cibil`
- `POST /leads/[id]/cibil/verify` · `/cibil/fetch`

---

### 5. Data Models

**Key types** (`src/types/lead.ts`):
- `Lead` — full lead object (id, name, loanType, amount, status, adminStatus, checklist[], issues[], notes[], activity[])
- `NewLeadPayload` — form submission payload (customerName, customerMobile, loanType, district are key fields)
- `UserRole` — `'admin' | 'ops_manager' | 'agent' | 'lead_generator' | 'viewer'`
- `AdminLeadStatus` — `'L1: New Lead' | 'L2: Documentation' | 'L3: Bank Login' | 'L4: Sanctioned' | 'L5: Disbursed'`
- `LeadStatus` — `'Draft' | 'New' | 'In Progress' | 'Docs Pending' | 'Under Review' | 'Approved' | 'Rejected'`

**ID convention**: always `lead.id` (string, e.g. `'L001'`). Never `_id` or `leadId` as identifier.

---

### 6. State & Auth

**Auth store** (`src/store/auth.store.ts` — Zustand):
- State: `token`, `role: UserRole`, `user: AuthUser`
- localStorage keys: `finserve-os-token` · `finserve-os-role` · `finserve-os-user`
- Actions: `setSession(token, role, user)` · `clearSession()`
- Helpers: `getAuthUser()` · `getAuthRole()` · `getAuthToken()`

**Session guard** (`src/components/auth/DashboardDemoGate.tsx`):
- Runs on every dashboard page
- No session → redirect `/login`
- Has `useRef` guard to prevent infinite re-render loop (do NOT add token/user to useEffect deps)

**Static login users**:
| Name | Password | Role | Redirect |
|---|---|---|---|
| Prashant Shinde | 50555 | admin | /admin |
| Vrushal Shinde | 50555 | agent | /dashboard |
| Krishna P | 12345 | lead_generator | /dashboard |

---

### 7. Data Layer

**Mock DB** (`src/lib/mock-db.ts`):
- Persistence: `globalThis.__finserve_leads` (survives Next.js HMR hot reloads)
- NOT module-level `let` (resets on hot reload — known bug, already fixed)
- Access via `getLeads()` / `setLeads()` internal functions only

**React Query** (`src/hooks/useLead.ts`):
- `useLeads()` — queryKey `['leads']`
- `useLead(id)` — queryKey `['lead', id]`
- `useCreateLead()` — POST + invalidates `['leads']`
- All mutations invalidate `['leads']` + `['lead', id]` on success

**Service layer** (`src/services/lead.service.ts`) → `src/services/api.ts` (axios instance).

---

### 8. Component Inventory

**Common**: `Badge` · `EmptyState` · `Modal`  
**Forms**: `NewLeadForm` (single-screen, 6 sections) · `new-lead-form.types.ts`  
**Leads**: `DashboardClient` · `AllLeadsClient` · `LeadHeader` · `LeadTabs` · `lead-shared` (LeadRow, StatCard)  
**Lead detail tabs**: `NotesTab` · `IssueTracker` · `ChecklistTab` · `CibilPanel` · `DocumentUpload` · `LeadWorkflowTimeline`  
**Layout**: `Sidebar` (dashboard) · `MobileNav`  
**Settings**: `AccessControlCenter` (full RBAC matrix with switches)  
**UI primitives**: `button` · `card` · `input` · `skeleton` · `toast`

---

### 9. New Lead Form (6 sections)

`src/components/forms/NewLeadForm.tsx` — single-screen, no steps:

1. **Basic Info** — firstName/middleName/lastName · mobile (async duplicate check on blur) · address (Line1, Line2, Pincode→auto-fill city/state, City, State)
2. **Loan Intent** — loanType (FPO/Home/Personal/Business/Car/LAP/Other) · amount chips + manual input
3. **Loan Details** — dynamic fields per loan type:
   - Home Loan: propertyType, propertyValue, loanPurpose, employerName, workExperience, existingEMI
   - Personal Loan: companyName, workExperience
   - Business Loan: businessName, businessCategory, annualTurnover, yearsInBusiness, monthlyRevenue, monthlyProfit, gstRegistered
   - FPO Loan: fpoName, registrationNumber, fpoBusinessType, loanPurpose, annualTurnover, yearsInOperation, landArea, memberCount
4. **Qualification** — monthlyIncome · employmentType · CIBIL (manual/auto toggle)
5. **Smart Eligibility** — auto-calc: Home/Car/LAP=income×60×factor · Personal=income×25×factor · Business=profit×40 · FPO=turnover×0.4
6. **Upload Documents** — dynamic checklist per loan type · custom doc adder · progress bar

**Eligibility CIBIL factors**: ≥750→1.0 · 650-749→0.8 · <650→0.6 · null→0.7

---

### 10. Coding Conventions

**Always**:
- `cn()` from `src/lib/utils.ts` for conditional classes
- `formatAmount()` from `src/lib/utils.ts` for all ₹ values
- `getRoleLabel()` from `src/lib/demo-access.ts` for role display
- Tailwind tokens — never raw hex in className (use `brand-500` not `#D91B24`)
- `'use client'` at top of all interactive components

**Never**:
- Hardcode leads in component state (use React Query + API)
- `module-level let` for server state (use `globalThis` pattern)
- Two primary red buttons side by side
- Mix `id` / `_id` / `leadId` — always `lead.id`
- Add `token` or `user` to `useEffect` deps in `DashboardDemoGate` (causes infinite loop)
- Raw `<select>` without `<ChevronDown>` overlay icon

**Imports path alias**: `@/` = `src/`

---

## Files to Create/Modify

| File | Action |
|---|---|
| `/Users/prashantshinde/Documents/2.Finserve OS/CLAUDE.md` | CREATE — master context file |

No other files modified.

---

## Verification

1. File exists at project root
2. Open new Claude session in this project → Claude reads CLAUDE.md first
3. Ask "what is the brand color?" → should answer `#D91B24` without exploring codebase
4. Ask "how does eligibility work?" → should answer from memory, no file reads needed
