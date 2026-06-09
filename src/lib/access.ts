import type { Access, FieldAccess } from 'payload'

export type UserRole = 'account' | 'criativo' | 'producao' | 'admin'
export type AccessUser = { id: string | number; role: UserRole }

const getUser = (req: { user?: unknown }): AccessUser | null => {
  const u = req.user as AccessUser | null
  if (!u) return null
  if (!['account', 'criativo', 'producao', 'admin'].includes(u.role)) return null
  return u
}

export const isAdmin: Access = ({ req }) => getUser(req)?.role === 'admin'

export const isAuthenticated: Access = ({ req }) => Boolean(req.user)

export const isAdminOrSelf: Access = ({ req }) => {
  const user = getUser(req)
  if (!user) return false
  if (user.role === 'admin') return true
  return { id: { equals: user.id } }
}

export const adminOrAccountWrite: Access = ({ req }) => {
  const role = getUser(req)?.role
  return role === 'admin' || role === 'account'
}

export const canReadProposals: Access = ({ req }) => Boolean(req.user)

export const canCreateProposal: Access = ({ req }) => {
  const role = getUser(req)?.role
  return role === 'admin' || role === 'account'
}

export const canUpdateProposal: Access = ({ req }) => Boolean(req.user)

// Field-level: creative zone — criativo and admin only
export const creativeZoneWrite: FieldAccess = ({ req }) => {
  const role = getUser(req)?.role
  return role === 'admin' || role === 'criativo'
}

// Field-level: budgeting zone — account, producao, admin
export const budgetingZoneWrite: FieldAccess = ({ req }) => {
  const role = getUser(req)?.role
  return role === 'admin' || role === 'account' || role === 'producao'
}

// Field-level: read-only (hooks write via overrideAccess)
export const neverWrite: FieldAccess = () => false

// Field-level: admin only write
export const adminOnlyWrite: FieldAccess = ({ req }) =>
  getUser(req)?.role === 'admin'
