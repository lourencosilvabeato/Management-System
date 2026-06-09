import type { BasePayload } from 'payload'
import type { Proposal } from '../../payload-types'

export interface EstimateResult {
  conversaIA: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>
  estimativaAtual: Record<string, unknown>
  abordagemTecnica: string
  nivelConfianca: 'Alto' | 'Medio' | 'Baixo'
  nivelConfiancaJustificacao: string
  inputsUsados: Record<string, unknown>
}

// TODO: implement fully in Prompt 05 — will call mock/real AI clients
export async function generateInitialEstimate(
  _proposal: Proposal,
  _payload: BasePayload,
): Promise<EstimateResult> {
  throw new Error('generateInitialEstimate not yet implemented — coming in Prompt 05')
}

// TODO: implement fully in Prompt 05
export async function continueConversation(
  _proposal: Proposal,
  _sessaoId: string,
  _newMessage: string,
  _payload: BasePayload,
): Promise<EstimateResult> {
  throw new Error('continueConversation not yet implemented — coming in Prompt 05')
}
