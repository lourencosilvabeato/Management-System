import { describe, it, expect } from 'vitest'
import { validateTransition } from '@/hooks/beforeChange/validateTransition'
import type { PayloadRequest } from 'payload'

type Estado = 'Recebida' | 'EmElaboracao' | 'EmOrcamentacao' | 'Enviada' | 'Ganha' | 'Perdida'

function mockReq(role: string): PayloadRequest {
  return {
    user: { role, id: 1 },
    context: {},
    payload: {},
  } as unknown as PayloadRequest
}

async function runTransition(
  from: Estado,
  to: Estado,
  role: string,
  extra: Record<string, unknown> = {},
) {
  return validateTransition({
    data: { estado: to, ...extra },
    operation: 'update',
    originalDoc: { estado: from },
    req: mockReq(role),
    collection: {} as never,
    context: {},
  })
}

// Payload ValidationError formats the message as:
// "The following field is invalid: {path}"
// Transition/role/terminal errors use path 'estado', motivoPerda errors use 'motivoPerda'.

describe('validateTransition', () => {
  // ─── Allowed transitions ───────────────────────────────────────────────────

  it('Recebida → EmElaboracao is allowed for account', async () => {
    const result = await runTransition('Recebida', 'EmElaboracao', 'account')
    expect(result).toMatchObject({ estado: 'EmElaboracao' })
  })

  it('Recebida → EmElaboracao is allowed for admin', async () => {
    const result = await runTransition('Recebida', 'EmElaboracao', 'admin')
    expect(result).toMatchObject({ estado: 'EmElaboracao' })
  })

  it('EmElaboracao → EmOrcamentacao is allowed for account', async () => {
    const result = await runTransition('EmElaboracao', 'EmOrcamentacao', 'account')
    expect(result).toMatchObject({ estado: 'EmOrcamentacao' })
  })

  it('EmElaboracao → EmOrcamentacao is allowed for criativo', async () => {
    const result = await runTransition('EmElaboracao', 'EmOrcamentacao', 'criativo')
    expect(result).toMatchObject({ estado: 'EmOrcamentacao' })
  })

  it('EmElaboracao → Recebida regression is allowed for account', async () => {
    const result = await runTransition('EmElaboracao', 'Recebida', 'account')
    expect(result).toMatchObject({ estado: 'Recebida' })
  })

  it('EmOrcamentacao → Enviada is allowed for producao', async () => {
    const result = await runTransition('EmOrcamentacao', 'Enviada', 'producao')
    expect(result).toMatchObject({ estado: 'Enviada' })
  })

  it('EmOrcamentacao → EmElaboracao regression is allowed for account', async () => {
    const result = await runTransition('EmOrcamentacao', 'EmElaboracao', 'account')
    expect(result).toMatchObject({ estado: 'EmElaboracao' })
  })

  it('Enviada → Ganha is allowed for account', async () => {
    const result = await runTransition('Enviada', 'Ganha', 'account')
    expect(result).toMatchObject({ estado: 'Ganha' })
  })

  it('Enviada → Perdida with motivoPerda is allowed for account', async () => {
    const result = await runTransition('Enviada', 'Perdida', 'account', { motivoPerda: 'Preco' })
    expect(result).toMatchObject({ estado: 'Perdida', motivoPerda: 'Preco' })
  })

  it('Enviada → EmOrcamentacao regression is allowed for account', async () => {
    const result = await runTransition('Enviada', 'EmOrcamentacao', 'account')
    expect(result).toMatchObject({ estado: 'EmOrcamentacao' })
  })

  it('no-op (same estado) passes through without error', async () => {
    const result = await runTransition('Recebida', 'Recebida', 'account')
    expect(result).toMatchObject({ estado: 'Recebida' })
  })

  it('same-estado from terminal state is a no-op and passes through', async () => {
    // Hook checks newEstado === originalDoc.estado → returns data unchanged (not a real transition)
    const result = await runTransition('Ganha', 'Ganha', 'admin')
    expect(result).toMatchObject({ estado: 'Ganha' })
  })

  it('create operation bypasses all validation', async () => {
    const result = await validateTransition({
      data: { estado: 'EmOrcamentacao' },
      operation: 'create',
      originalDoc: undefined,
      req: mockReq('account'),
      collection: {} as never,
      context: {},
    })
    expect(result).toMatchObject({ estado: 'EmOrcamentacao' })
  })

  // ─── Prohibited transitions ────────────────────────────────────────────────
  // Payload ValidationError message: "The following field is invalid: estado"

  it('Recebida → EmOrcamentacao is prohibited (not in state machine)', async () => {
    await expect(runTransition('Recebida', 'EmOrcamentacao', 'account')).rejects.toThrow(/estado/)
  })

  it('Recebida → Enviada is prohibited', async () => {
    await expect(runTransition('Recebida', 'Enviada', 'account')).rejects.toThrow(/estado/)
  })

  it('EmElaboracao → Ganha is prohibited', async () => {
    await expect(runTransition('EmElaboracao', 'Ganha', 'account')).rejects.toThrow(/estado/)
  })

  it('Recebida → EmElaboracao is prohibited for criativo role', async () => {
    await expect(runTransition('Recebida', 'EmElaboracao', 'criativo')).rejects.toThrow(/estado/)
  })

  it('EmOrcamentacao → Enviada is prohibited for criativo role', async () => {
    await expect(runTransition('EmOrcamentacao', 'Enviada', 'criativo')).rejects.toThrow(/estado/)
  })

  // ─── Terminal state ────────────────────────────────────────────────────────

  it('Ganha → any new state is rejected (terminal)', async () => {
    await expect(runTransition('Ganha', 'Enviada', 'admin')).rejects.toThrow(/estado/)
  })

  it('Perdida → any new state is rejected (terminal)', async () => {
    await expect(runTransition('Perdida', 'Recebida', 'admin')).rejects.toThrow(/estado/)
  })

  it('Ganha → EmElaboracao is rejected even for admin', async () => {
    await expect(runTransition('Ganha', 'EmElaboracao', 'admin')).rejects.toThrow(/estado/)
  })

  // ─── Perdida requires motivoPerda ──────────────────────────────────────────
  // Payload ValidationError message: "The following field is invalid: motivoPerda"

  it('Enviada → Perdida without motivoPerda is rejected', async () => {
    await expect(runTransition('Enviada', 'Perdida', 'account')).rejects.toThrow(/motivoPerda/)
  })

  it('Enviada → Perdida with motivoPerda on data passes', async () => {
    const result = await runTransition('Enviada', 'Perdida', 'account', { motivoPerda: 'Prazo' })
    expect(result).toMatchObject({ estado: 'Perdida' })
  })

  it('Enviada → Perdida with motivoPerda on originalDoc passes', async () => {
    const result = await validateTransition({
      data: { estado: 'Perdida' },
      operation: 'update',
      originalDoc: { estado: 'Enviada', motivoPerda: 'Concorrencia' },
      req: mockReq('account'),
      collection: {} as never,
      context: {},
    })
    expect(result).toMatchObject({ estado: 'Perdida' })
  })
})
