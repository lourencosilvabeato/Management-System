import { ValidationError } from 'payload'
import type { CollectionBeforeChangeHook } from 'payload'
import type { AccessUser } from '../../lib/access'

type Estado = 'Recebida' | 'EmElaboracao' | 'EmOrcamentacao' | 'Enviada' | 'Ganha' | 'Perdida'

const TERMINAL: ReadonlySet<Estado> = new Set(['Ganha', 'Perdida'])

interface Transition {
  roles: ReadonlyArray<string>
}

const STATE_MACHINE: Record<Estado, Partial<Record<Estado, Transition>>> = {
  Recebida: {
    EmElaboracao: { roles: ['account', 'admin'] },
  },
  EmElaboracao: {
    EmOrcamentacao: { roles: ['account', 'criativo', 'admin'] },
    Recebida: { roles: ['account', 'admin'] },
  },
  EmOrcamentacao: {
    Enviada: { roles: ['account', 'producao', 'admin'] },
    EmElaboracao: { roles: ['account', 'admin'] },
  },
  Enviada: {
    Ganha: { roles: ['account', 'admin'] },
    Perdida: { roles: ['account', 'admin'] },
    EmOrcamentacao: { roles: ['account', 'admin'] },
  },
  Ganha: {},
  Perdida: {},
}

export const validateTransition: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update') return data

  const newEstado = data.estado as Estado | undefined
  if (!newEstado || newEstado === originalDoc?.estado) return data

  const previousEstado = originalDoc?.estado as Estado | undefined
  if (!previousEstado) return data

  const user = req.user as AccessUser | null
  const userRole = user?.role ?? 'account'

  // 1. Terminal state — no transitions allowed
  if (TERMINAL.has(previousEstado)) {
    throw new ValidationError({
      errors: [
        {
          message: 'This proposal is in a terminal state and cannot be changed.',
          path: 'estado',
        },
      ],
    })
  }

  // 2. Transition not in the state machine
  const transition = STATE_MACHINE[previousEstado]?.[newEstado]
  if (!transition) {
    throw new ValidationError({
      errors: [
        {
          message: `Transition from "${previousEstado}" to "${newEstado}" is not allowed.`,
          path: 'estado',
        },
      ],
    })
  }

  // 3. Role not authorised for this transition
  if (!transition.roles.includes(userRole)) {
    throw new ValidationError({
      errors: [
        {
          message: `Your role (${userRole}) is not authorised to make this transition.`,
          path: 'estado',
        },
      ],
    })
  }

  // 4. Perdida requires motivoPerda
  if (newEstado === 'Perdida') {
    const motivo = data.motivoPerda ?? originalDoc?.motivoPerda
    if (!motivo) {
      throw new ValidationError({
        errors: [
          {
            message: 'A reason is required when marking a proposal as Perdida.',
            path: 'motivoPerda',
          },
        ],
      })
    }
  }

  // 5. EmOrcamentacao requires estadoCriativo = Aprovado
  if (newEstado === 'EmOrcamentacao') {
    const estadoCriativo = data.estadoCriativo ?? originalDoc?.estadoCriativo
    if (estadoCriativo !== 'Aprovado') {
      throw new ValidationError({
        errors: [
          {
            message:
              'O estado criativo tem de ser "Aprovado" antes de avançar para Orçamentação.',
            path: 'estadoCriativo',
          },
        ],
      })
    }
  }

  return data
}
