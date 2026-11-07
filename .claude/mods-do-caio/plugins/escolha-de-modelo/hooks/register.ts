import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, TurnStepResult } from 'claude-code'

import type { EscolhaDeModeloEstado, EscolhaDeModeloNivel } from '../types'
import {
  NOMES,
  classificar,
  familia,
  lerNivel,
  nivelDe,
  nomeDe,
  normalizar,
  ordem,
  perguntaParaHaiku,
} from './classificar'

export const LONGA_TOKENS = 30000
export const LONGA_MENSAGENS = 40
const TEMPO_HAIKU = 4000

const INICIAL: EscolhaDeModeloEstado = {
  modo: 'auto',
  fixo: null,
  pedido: null,
  motivo: '',
  emUso: null,
  mantido: false,
  confirmado: false,
  contexto: 0,
  mensagens: 0,
  ids: {},
}

const ESTADO = atom({ plugin: 'escolha-de-modelo', key: 'estado' } as const, INICIAL)

function completo(estado: Partial<EscolhaDeModeloEstado>): EscolhaDeModeloEstado {
  return { ...INICIAL, ...estado, ids: { ...estado.ids } }
}

async function ler($: EngineInterface): Promise<EscolhaDeModeloEstado> {
  return completo(await read($, ESTADO))
}

function mudarEstado(
  $: EngineInterface,
  mudar: (s: EscolhaDeModeloEstado) => EscolhaDeModeloEstado,
): Promise<EscolhaDeModeloEstado> {
  return update($, ESTADO, s => mudar(completo(s)))
}

const DO_USUARIO = new Set(['composer', 'bridge', 'sdk'])

const NIVEIS: readonly EscolhaDeModeloNivel[] = ['haiku', 'sonnet', 'opus']

function ehNivel(texto: string): texto is EscolhaDeModeloNivel {
  return (NIVEIS as readonly string[]).includes(texto)
}

function deveManter(
  estado: EscolhaDeModeloEstado,
  desejado: EscolhaDeModeloNivel,
  mensagens: number,
): boolean {
  if (estado.modo !== 'auto' || estado.emUso === null) return false
  const longa = estado.contexto >= LONGA_TOKENS || mensagens >= LONGA_MENSAGENS
  return longa && ordem(desejado) < nivelDe(estado.emUso)
}

function idPara(
  estado: EscolhaDeModeloEstado,
  nivel: EscolhaDeModeloNivel,
  modeloDaSessao: string,
): string {
  if (familia(modeloDaSessao) === nivel) return modeloDaSessao
  return estado.ids[nivel] ?? nivel
}

function aprender(
  ids: EscolhaDeModeloEstado['ids'],
  ...modelos: readonly (string | null | undefined)[]
): EscolhaDeModeloEstado['ids'] {
  let novos = ids
  for (const modelo of modelos) {
    const qual = familia(modelo)
    if (qual !== null && typeof modelo === 'string' && novos[qual] !== modelo) {
      novos = { ...novos, [qual]: modelo }
    }
  }
  return novos
}

export function textoStatus(estado: EscolhaDeModeloEstado): string {
  if (estado.modo === 'manual') return 'Modelo: manual'
  if (estado.modo === 'desligado') return 'Modelo: desligado'
  if (estado.modo === 'fixo' && estado.fixo !== null) return `Modelo: ${NOMES[estado.fixo]} · fixo`
  const nome = estado.mantido || estado.confirmado
    ? nomeDe(estado.emUso)
    : estado.pedido === null
      ? null
      : NOMES[estado.pedido]
  return nome === null ? 'Modelo: auto' : `Modelo: ${nome} · auto`
}

function descrever(estado: EscolhaDeModeloEstado): string {
  const linhas: string[] = []
  if (estado.modo === 'auto') {
    linhas.push('Escolha automática ligada.')
    if (estado.pedido !== null) {
      linhas.push(`Último pedido: ${NOMES[estado.pedido]} (${estado.motivo}).`)
    }
    if (estado.mantido && estado.emUso !== null) {
      linhas.push(`Mantido em ${nomeDe(estado.emUso)} para não perder o cache da conversa longa.`)
    }
  } else if (estado.modo === 'fixo' && estado.fixo !== null) {
    linhas.push(`Fixado em ${NOMES[estado.fixo]} até /modelo auto.`)
  } else if (estado.modo === 'desligado') {
    linhas.push('Escolha automática desligada: vale o modelo do /model.')
  } else {
    linhas.push('Você trocou o modelo com /model, então a escolha automática foi desligada.')
    linhas.push('Use /modelo auto para religar.')
  }
  if (estado.emUso !== null) linhas.push(`Último usado: ${nomeDe(estado.emUso)}.`)
  linhas.push('Opções: /modelo auto · desligado · haiku · sonnet · opus')
  return linhas.join('\n')
}

async function classificarPedido(
  $: EngineInterface,
  texto: string,
  sinal: AbortSignal,
): Promise<{ nivel: EscolhaDeModeloNivel; motivo: string }> {
  const local = classificar(texto)
  if (local.certo) return local
  const resposta = await $.model
    .complete(
      {
        model: 'haiku',
        prompt: perguntaParaHaiku(texto),
        effort: 'low',
        maxTokens: 10,
        timeoutMs: TEMPO_HAIKU,
      },
      { signal: sinal },
    )
    .catch(() => null)
  if (resposta === null || !resposta.isAnswered) return local
  const nivel = lerNivel(resposta.text)
  return nivel === null ? local : { nivel, motivo: 'pedido médio, avaliado pelo Haiku' }
}

type Opcao = {
  resposta: string
  mudar: (s: EscolhaDeModeloEstado) => EscolhaDeModeloEstado
}

function opcaoDe(args: string): Opcao | null {
  const opcao = normalizar(args)
  if (['auto', 'ligar', 'ligado', 'on'].includes(opcao)) {
    return { resposta: 'Escolha automática ligada.', mudar: s => ({ ...s, modo: 'auto', fixo: null, confirmado: false }) }
  }
  if (['desligado', 'desligar', 'off'].includes(opcao)) {
    return {
      resposta: 'Escolha automática desligada: vale o modelo do /model.',
      mudar: s => ({ ...s, modo: 'desligado', fixo: null, mantido: false, confirmado: false }),
    }
  }
  if (ehNivel(opcao)) {
    const nivel = opcao
    return {
      resposta: `Fixado em ${NOMES[nivel]} até /modelo auto.`,
      mudar: s => ({ ...s, modo: 'fixo', fixo: nivel, mantido: false, confirmado: false }),
    }
  }
  return null
}

async function executarModelo($: EngineInterface, args: string): Promise<string> {
  if (normalizar(args) === '') return descrever(await ler($))
  const opcao = opcaoDe(args)
  if (opcao === null) {
    return `Opção desconhecida: "${args.trim()}". Use /modelo auto, desligado, haiku, sonnet ou opus.`
  }
  const estado = await mudarEstado($, opcao.mudar)
  $.ui.status(textoStatus(estado))
  return opcao.resposta
}

const PEDIDO_MODELO = /^\/modelo(?:\s+(.*))?$/i

let comandoRegistrado = false

async function registrarComando($: EngineInterface): Promise<void> {
  if (comandoRegistrado) return
  await $.command.register({
    name: 'modelo',
    description: 'Escolha automática do modelo: auto, desligado, haiku, sonnet ou opus',
    argumentHint: '[auto|desligado|haiku|sonnet|opus]',
  })
  comandoRegistrado = true
  $.ui.status(textoStatus(await ler($)))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await registrarComando($).catch(() => undefined)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await registrarComando($).catch(() => undefined)
    if (!DO_USUARIO.has(e.origin.kind) || e.command?.name === 'modelo') return next(e)
    const pedidoModelo = e.command === undefined ? PEDIDO_MODELO.exec(e.text.trim()) : null
    const args = pedidoModelo?.[1] ?? ''
    if (pedidoModelo && (normalizar(args) === '' || opcaoDe(args) !== null)) {
      const texto = await executarModelo($, args)
      $.ui.toast(texto)
      return { drop: texto }
    }
    const atual = await ler($)
    if (atual.modo !== 'auto') return next(e)
    const escolha = await classificarPedido($, e.text, next.signal)
    const estado = await mudarEstado($, s => ({
      ...s,
      pedido: escolha.nivel,
      motivo: escolha.motivo,
      mantido: deveManter(s, escolha.nivel, s.mensagens),
      confirmado: false,
    }))
    $.ui.status(textoStatus(estado))
    return next(e)
  })

  on('command.run', { command: 'modelo' }, async ($, e) => ({ text: await executarModelo($, e.args) }))

  on('command.run', async ($, e, next) => {
    if (e.command === 'modelo' || !DO_USUARIO.has(e.origin.kind)) return next(e)
    const local = classificar(`/${e.command} ${e.args}`)
    const atual = await ler($)
    if (atual.modo === 'auto' && local.nivel === 'opus') {
      const estado = await mudarEstado($, s => ({
        ...s,
        pedido: local.nivel,
        motivo: local.motivo,
        mantido: false,
        confirmado: false,
      }))
      $.ui.status(textoStatus(estado))
    }
    return next(e)
  })

  on('classic.PostModelSwitch', async ($, e, next) => {
    const manual = e.source === 'command' || e.source === 'picker' || e.source === 'sdk'
    const estado = await mudarEstado($, s => ({
      ...s,
      ids: aprender(s.ids, e.to_model),
      ...(manual ? { modo: 'manual' as const, fixo: null, mantido: false } : {}),
    }))
    if (manual) $.ui.status(textoStatus(estado))
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e)
    const antes = await ler($)
    const desejado =
      antes.modo === 'auto' ? antes.pedido : antes.modo === 'fixo' ? antes.fixo : null
    let enviar = e.model
    let mantido = false
    if (desejado !== null) {
      mantido = deveManter(antes, desejado, e.messageCount)
      enviar = mantido && antes.emUso !== null ? antes.emUso : idPara(antes, desejado, e.model)
    }
    let resultado: TurnStepResult
    if (enviar === e.model) {
      resultado = yield* next(e)
    } else {
      let comecou = false
      try {
        const fluxo = next({ ...e, model: enviar })
        for await (const pedaco of fluxo) {
          comecou = true
          yield pedaco
        }
        resultado = await fluxo.result
      } catch (erro) {
        if (comecou || next.signal.aborted) throw erro
        enviar = e.model
        mantido = false
        resultado = yield* next(e)
      }
    }
    const uso = resultado.usage
    const contexto =
      uso === null
        ? antes.contexto
        : uso.input_tokens +
          uso.cache_read_input_tokens +
          uso.cache_creation_input_tokens +
          uso.output_tokens
    const depois = await mudarEstado($, s => ({
      ...s,
      emUso: uso?.model ?? enviar,
      mantido,
      confirmado: true,
      contexto,
      mensagens: e.messageCount,
      ids: aprender(s.ids, e.model, uso === null ? null : uso.model),
    }))
    if (textoStatus(depois) !== textoStatus(antes)) $.ui.status(textoStatus(depois))
    return resultado
  })
}
