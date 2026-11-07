export type EscolhaDeModeloNivel = 'haiku' | 'sonnet' | 'opus'

export type EscolhaDeModeloModo = 'auto' | 'fixo' | 'desligado' | 'manual'

export type EscolhaDeModeloEstado = {
  modo: EscolhaDeModeloModo
  fixo: EscolhaDeModeloNivel | null
  pedido: EscolhaDeModeloNivel | null
  motivo: string
  emUso: string | null
  mantido: boolean
  confirmado: boolean
  contexto: number
  mensagens: number
  saidaAcum: number
  passosAcum: number
  saidaMedia: number
  passosMedios: number
  ids: Partial<Record<EscolhaDeModeloNivel, string>>
}

declare module 'claude-code' {
  interface PluginState {
    'escolha-de-modelo': { estado: EscolhaDeModeloEstado }
  }
}
