/**
 * auth-utils.ts — password hashing, token generation, OTP
 * Server-side only (bcryptjs)
 */

import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, 10)

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash)

export const generateToken = (): string =>
  randomBytes(32).toString('hex')

export const generateOTP = (): string =>
  String(Math.floor(100000 + Math.random() * 900000))

export const tokenExpiry = (hours = 24): string =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

export const otpExpiry = (): string =>
  new Date(Date.now() + 2 * 60 * 1000).toISOString() // 2 minutes
