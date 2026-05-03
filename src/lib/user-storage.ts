/**
 * user-storage.ts — Supabase CRUD for app_users.
 * Falls back to in-memory store when Supabase is unavailable.
 */

import { supabase, hasSupabase } from '@/lib/supabase'
import type { UserRole } from '@/types/lead'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppUser = {
  id: string
  name: string
  mobile: string
  email: string
  role: UserRole
  active: boolean
  onboardingStatus: 'pending' | 'active'
  createdAt: string
}

type AppUserRow = {
  id: string
  name: string
  mobile: string
  email: string
  role: string
  active: boolean
  password_hash: string | null
  onboarding_status: string
  setup_token: string | null
  token_expiry: string | null
  otp: string | null
  otp_expiry: string | null
  created_at: string
}

// ── In-memory fallback ────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __finserve_users: AppUserRow[] | undefined
}

function getMemUsers(): AppUserRow[] {
  if (!globalThis.__finserve_users) {
    globalThis.__finserve_users = [
      { id: 'u1', name: 'Prashant Shinde', mobile: '9876543210', email: '', role: 'super_admin',    active: true,  password_hash: null, onboarding_status: 'active',  setup_token: null, token_expiry: null, otp: null, otp_expiry: null, created_at: new Date().toISOString() },
      { id: 'u2', name: 'Vrushal Shinde',  mobile: '9876543211', email: '', role: 'agent',          active: true,  password_hash: null, onboarding_status: 'active',  setup_token: null, token_expiry: null, otp: null, otp_expiry: null, created_at: new Date().toISOString() },
      { id: 'u3', name: 'Krishna P',       mobile: '9876543212', email: '', role: 'lead_generator', active: true,  password_hash: null, onboarding_status: 'active',  setup_token: null, token_expiry: null, otp: null, otp_expiry: null, created_at: new Date().toISOString() },
    ]
  }
  return globalThis.__finserve_users
}

function rowToUser(r: AppUserRow): AppUser {
  return {
    id: r.id,
    name: r.name,
    mobile: r.mobile,
    email: r.email,
    role: r.role as UserRole,
    active: r.active,
    onboardingStatus: r.onboarding_status as 'pending' | 'active',
    createdAt: r.created_at,
  }
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function storageListUsers(): Promise<AppUser[]> {
  if (!hasSupabase()) {
    return getMemUsers().map(rowToUser)
  }
  const { data, error } = await supabase!
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as AppUserRow[]).map(rowToUser)
}

// ── Find by id / mobile / token ───────────────────────────────────────────────

export async function storageFindUserByMobile(mobile: string): Promise<AppUserRow | null> {
  if (!hasSupabase()) {
    return getMemUsers().find((u) => u.mobile === mobile) ?? null
  }
  const { data } = await supabase!
    .from('app_users')
    .select('*')
    .eq('mobile', mobile)
    .single()
  return (data as AppUserRow) ?? null
}

export async function storageFindUserByToken(token: string): Promise<AppUserRow | null> {
  if (!hasSupabase()) {
    return getMemUsers().find((u) => u.setup_token === token) ?? null
  }
  const { data } = await supabase!
    .from('app_users')
    .select('*')
    .eq('setup_token', token)
    .single()
  return (data as AppUserRow) ?? null
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function storageCreateUser(payload: {
  id: string
  name: string
  mobile: string
  email: string
  role: UserRole
  setup_token: string
  token_expiry: string
}): Promise<AppUser> {
  const row: AppUserRow = {
    ...payload,
    active: true,
    password_hash: null,
    onboarding_status: 'pending',
    otp: null,
    otp_expiry: null,
    created_at: new Date().toISOString(),
  }

  if (!hasSupabase()) {
    getMemUsers().push(row)
    return rowToUser(row)
  }

  const { data, error } = await supabase!
    .from('app_users')
    .insert(row)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return rowToUser(data as AppUserRow)
}

// ── Update role / active ──────────────────────────────────────────────────────

export async function storageUpdateUser(id: string, updates: {
  role?: UserRole
  active?: boolean
  name?: string
  email?: string
}): Promise<AppUser> {
  if (!hasSupabase()) {
    const users = getMemUsers()
    const idx = users.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error('User not found')
    users[idx] = { ...users[idx], ...updates }
    return rowToUser(users[idx])
  }

  const { data, error } = await supabase!
    .from('app_users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return rowToUser(data as AppUserRow)
}

// ── Set password ──────────────────────────────────────────────────────────────

export async function storageSetPassword(id: string, passwordHash: string): Promise<void> {
  if (!hasSupabase()) {
    const users = getMemUsers()
    const u = users.find((u) => u.id === id)
    if (u) { u.password_hash = passwordHash; u.onboarding_status = 'active'; u.setup_token = null; u.token_expiry = null }
    return
  }
  const { error } = await supabase!
    .from('app_users')
    .update({ password_hash: passwordHash, onboarding_status: 'active', setup_token: null, token_expiry: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Refresh invite token ──────────────────────────────────────────────────────

export async function storageRefreshToken(id: string, token: string, expiry: string): Promise<void> {
  if (!hasSupabase()) {
    const u = getMemUsers().find((u) => u.id === id)
    if (u) { u.setup_token = token; u.token_expiry = expiry; u.onboarding_status = 'pending' }
    return
  }
  const { error } = await supabase!
    .from('app_users')
    .update({ setup_token: token, token_expiry: expiry, onboarding_status: 'pending' })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ── OTP ───────────────────────────────────────────────────────────────────────

export async function storageSetOTP(mobile: string, otp: string, expiry: string): Promise<void> {
  if (!hasSupabase()) {
    const u = getMemUsers().find((u) => u.mobile === mobile)
    if (u) { u.otp = otp; u.otp_expiry = expiry }
    return
  }
  const { error } = await supabase!
    .from('app_users')
    .update({ otp, otp_expiry: expiry })
    .eq('mobile', mobile)
  if (error) throw new Error(error.message)
}

export async function storageClearOTP(mobile: string): Promise<void> {
  if (!hasSupabase()) {
    const u = getMemUsers().find((u) => u.mobile === mobile)
    if (u) { u.otp = null; u.otp_expiry = null }
    return
  }
  await supabase!.from('app_users').update({ otp: null, otp_expiry: null }).eq('mobile', mobile)
}
