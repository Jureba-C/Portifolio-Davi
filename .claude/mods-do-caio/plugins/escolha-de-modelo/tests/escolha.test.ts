import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { ModelUsage, On, TurnStepInput } from 'claude-code'

const ZERO: ModelUsage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
}

const IDS: Record<string, string> = {
  haiku: 'claude-haiku-teste',
  sonnet: 'claude-sonnet-teste',
  opus: 'claude-opus-teste',
}

const SESSAO = 'claude-sonnet-teste'

type Mundo = {
  status: (string | undefined)[]
  enviados: { model: string; agentId?: string }[]
  consultas: string[]
  contexto: number
  saida: number
  haiku: string | null | Error
  falhar: string[]
}

function montar(on: On, inicio: Partial<Mundo> = {}): Mundo {
  const mundo: Mundo = { status: [], enviados: [], consultas: [], contexto: 0, saida: 0, haiku: null, falhar: [], ...inicio }
  on('ui.status', ($, e) => {
    mundo.status.push(e.text)
    return { value: undefined }
  })
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('command.run', () => ({ text: 'comando do motor' }))
  on('classic.PostModelSwitch', () => ({}))
  on('model.complete', ($, e) => {
    mundo.consultas.push(e.prompt)
    if (mundo.haiku instanceof Error) throw mundo.haiku
    return mundo.haiku === null
      ? { value: { isAnswered: false, reason: 'empty-reply', usage: ZERO } }
      : { value: { isAnswered: true, text: mundo.haiku, usage: ZERO } }
  })
  on('turn.step', async function* ($, e) {
    if (mundo.falhar.includes(e.model)) throw new Error('indisponível')
    mundo.enviados.push(e.agentId === undefined ? { model: e.model } : { model: e.model, agentId: e.agentId })
    return {
      turnId: e.turnId,
      index: e.index,
      answer: 'feito',
      toolUses: [],
      stopReason: 'end_turn',
      usage: { ...ZERO, cache_read_input_tokens: mundo.contexto, output_tokens: mundo.saida, model: IDS[e.model] ?? e.model },
    }
  })
  return mundo
}

async function iniciar($: Engine) {
  await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false })
}

async function pedir($: Engine, text: string) {
  await $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
}

async function passo($: Engine, extra: Partial<TurnStepInput> = {}) {
  const fluxo = $.turn.step({ turnId: 't', index: 0, model: SESSAO, messageCount: 2, ...extra })
  for await (const pedaco of fluxo) void pedaco
  return fluxo.result
}

async function modelo($: Engine, args: string) {
  return $.command.run({
    command: 'modelo',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })
}

function ultimo<T>(lista: readonly T[]): T | undefined {
  return lista[lista.length - 1]
}

describe('pedido e passo', () => {
  test('pedido pesado manda o agente principal para o Opus', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    await pedir($, 'investigue o bug do lightbox')
    expect(ultimo(mundo.status)).toBe('Modelo: Opus · auto')
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe('opus')
  })

  test('confirmação numa sessão nova fica no Sonnet e pedido comum também', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    await pedir($, 'pode subir')
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe(SESSAO)
    expect(ultimo(mundo.status)).toBe('Modelo: Sonnet · auto')
    await pedir($, 'troque o título da página inicial')
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe(SESSAO)
    expect(ultimo(mundo.status)).toBe('Modelo: Sonnet · auto')
    expect(mundo.consultas).toHaveLength(0)
  })

  test('subagente fica intocado', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    await pedir($, 'investigue o bug do lightbox')
    await passo($, { agentId: 'sub-1', model: 'claude-haiku-teste' })
    expect(ultimo(mundo.enviados)).toEqual({ model: 'claude-haiku-teste', agentId: 'sub-1' })
  })

  test('aprende o id completo e reusa nos passos seguintes', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    await pedir($, 'investigue o bug do lightbox')
    await passo($)
    await passo($, { index: 1 })
    expect(mundo.enviados.map(e => e.model)).toEqual(['opus', 'claude-opus-teste'])
  })

  test('pedido médio consulta o Haiku e segue a resposta', async ($, on) => {
    const mundo = montar(on, { haiku: 'opus' })
    await iniciar($)
    await pedir($, 'ajuste o texto da seção sobre mim '.repeat(8))
    expect(mundo.consultas).toHaveLength(1)
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe('opus')
  })

  test('sem resposta do Haiku cai na heurística', async ($, on) => {
    const mundo = montar(on, { haiku: null })
    await iniciar($)
    await pedir($, 'ajuste o texto da seção sobre mim '.repeat(8))
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe(SESSAO)
  })

  test('pedido de outra origem não muda a escolha', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    await pedir($, 'investigue o bug do lightbox')
    await $.prompt.submit({ text: 'ok', wait: false, origin: { kind: 'task-notification' } })
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe('opus')
  })
})

describe('troca pelo custo', () => {
  test('confirmação depois do Opus segue no Opus', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    await pedir($, 'investigue o bug do lightbox')
    await passo($)
    await pedir($, 'ok, pode fazer')
    expect(ultimo(mundo.status)).toBe('Modelo: Opus · auto')
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe('claude-opus-teste')
  })

  test('conversa longa com turno curto mantém o Opus', async ($, on) => {
    const mundo = montar(on, { contexto: 50000 })
    await iniciar($)
    await pedir($, 'investigue o bug do lightbox')
    await passo($)
    await pedir($, 'troque o título da página inicial')
    expect(ultimo(mundo.status)).toBe('Modelo: Opus · auto')
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe('claude-opus-teste')
    const texto = (await modelo($, '')).text ?? ''
    expect(texto).toContain('Mantido em Opus')
  })

  test('turno com muita saída compensa trocar para o Sonnet', async ($, on) => {
    const mundo = montar(on, { contexto: 50000, saida: 50000 })
    await iniciar($)
    await pedir($, 'investigue o bug do lightbox')
    await passo($)
    await pedir($, 'troque o título da página inicial')
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe(SESSAO)
    expect(ultimo(mundo.status)).toBe('Modelo: Sonnet · auto')
  })

  test('conversa curta rebaixa para o Sonnet', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    await pedir($, 'investigue o bug do lightbox')
    await passo($)
    await pedir($, 'troque o título da página inicial')
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe(SESSAO)
  })

  test('subir de nível é sempre permitido', async ($, on) => {
    const mundo = montar(on, { contexto: 50000 })
    await iniciar($)
    await pedir($, 'ok')
    await passo($)
    await pedir($, 'redesenhar a home')
    await passo($)
    expect(mundo.enviados.map(e => e.model)).toEqual([SESSAO, 'opus'])
  })
})

describe('/modelo', () => {
  test('sem argumento mostra o estado', async ($, on) => {
    montar(on)
    await iniciar($)
    await pedir($, 'investigue o bug do lightbox')
    const r = await modelo($, '')
    expect(r.text).toContain('Escolha automática ligada.')
    expect(r.text).toContain('Último pedido: Opus')
  })

  test('fixar um modelo vale até /modelo auto', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    const r = await modelo($, 'haiku')
    expect(r.text).toBe('Fixado em Haiku até /modelo auto.')
    expect(ultimo(mundo.status)).toBe('Modelo: Haiku · fixo')
    await pedir($, 'investigue o bug do lightbox')
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe('haiku')
    await modelo($, 'auto')
    expect(ultimo(mundo.status)).toBe('Modelo: auto')
    await pedir($, 'investigue o bug do lightbox')
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe('opus')
  })

  test('desligado usa o modelo da sessão', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    const r = await modelo($, 'desligado')
    expect(r.text).toContain('desligada')
    expect(ultimo(mundo.status)).toBe('Modelo: desligado')
    await pedir($, 'investigue o bug do lightbox')
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe(SESSAO)
  })

  test('opção desconhecida explica as opções', async ($, on) => {
    montar(on)
    await iniciar($)
    const r = await modelo($, 'gpt')
    expect(r.text).toContain('Opção desconhecida')
  })
})

describe('troca manual', () => {
  test('/model desliga o automático e o status avisa', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    await pedir($, 'investigue o bug do lightbox')
    await $.classic.PostModelSwitch({
      from_model: SESSAO,
      to_model: 'claude-haiku-teste',
      requested_model: 'haiku',
      source: 'command',
      context_tokens: 0,
      prompt_cache_warm: false,
      cache_ttl: '5m',
      estimated_cache_write_usd: 0,
      pricing: 'catalog',
    })
    expect(ultimo(mundo.status)).toBe('Modelo: manual')
    await pedir($, 'investigue o bug do lightbox')
    await passo($, { model: 'claude-haiku-teste' })
    expect(ultimo(mundo.enviados)?.model).toBe('claude-haiku-teste')
    expect((await modelo($, '')).text).toContain('/modelo auto')
    await modelo($, 'auto')
    await pedir($, 'investigue o bug do lightbox')
    await passo($, { model: 'claude-haiku-teste' })
    expect(ultimo(mundo.enviados)?.model).toBe('opus')
  })

  test('troca automática do motor não desliga', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    await $.classic.PostModelSwitch({
      from_model: 'claude-opus-teste',
      to_model: SESSAO,
      requested_model: null,
      source: 'auto',
      context_tokens: 0,
      prompt_cache_warm: false,
      cache_ttl: '5m',
      estimated_cache_write_usd: 0,
      pricing: 'catalog',
    })
    await pedir($, 'pode subir')
    await passo($)
    expect(ultimo(mundo.status)).toBe('Modelo: Sonnet · auto')
  })
})

describe('comandos de skill', () => {
  test('/savvy-flow sobe para o Opus', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    await pedir($, 'ok')
    await $.command.run({
      command: 'savvy-flow',
      args: 'corrigir o menu',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe('opus')
  })
})

describe('/modelo digitado como mensagem', () => {
  test('sozinho ou com uma opção não chega ao modelo nem gasta turno', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    const r = await $.prompt.submit({ text: '  /modelo opus ', wait: false, origin: { kind: 'composer' } })
    expect(r).toEqual({ drop: 'Fixado em Opus até /modelo auto.' })
    expect(ultimo(mundo.status)).toBe('Modelo: Opus · fixo')
    const estado = await $.prompt.submit({ text: '/modelo', wait: false, origin: { kind: 'composer' } })
    expect(estado.drop).toContain('Fixado em Opus')
  })

  test('uma frase que começa com /modelo segue para o modelo', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    const r = await $.prompt.submit({ text: '/modelo opus é melhor que o sonnet? explique', wait: false, origin: { kind: 'composer' } })
    expect(r).toEqual({ text: '/modelo opus é melhor que o sonnet? explique' })
    const outra = await $.prompt.submit({ text: 'use o /modelo opus amanhã', wait: false, origin: { kind: 'composer' } })
    expect(outra.drop).toBeUndefined()
    const linhas = await $.prompt.submit({ text: '/modelo opus\ninvestigue o menu', wait: false, origin: { kind: 'composer' } })
    expect(linhas.drop).toBeUndefined()
    expect(ultimo(mundo.status)).not.toContain('fixo')
  })

  test('texto de notificação ou de outro agente nunca troca o modelo', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    const r = await $.prompt.submit({ text: '/modelo haiku', wait: false, origin: { kind: 'task-notification' } as never })
    expect(r.drop).toBeUndefined()
    expect(mundo.status.filter(t => t?.includes('fixo'))).toHaveLength(0)
  })

  test('o comando já executado pelo motor não roda de novo nem reclassifica', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    await modelo($, 'auto')
    const antes = mundo.status.length
    const r = await $.prompt.submit({ text: '/modelo auto', command: { name: 'modelo', args: 'auto' }, wait: false, origin: { kind: 'composer' } })
    expect(r.drop).toBeUndefined()
    expect(mundo.status.length).toBe(antes)
  })
})

describe('robustez', () => {
  test('falha do Haiku (rejeição) não derruba o pedido', async ($, on) => {
    const mundo = montar(on, { haiku: new Error('fora do ar') })
    await iniciar($)
    const r = await $.prompt.submit({ text: 'ajuste o texto da seção sobre mim '.repeat(8), wait: false, origin: { kind: 'composer' } })
    expect(r.drop).toBeUndefined()
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe(SESSAO)
  })

  test('se o modelo pedido falha antes de responder, o status mostra o que foi usado de verdade', async ($, on) => {
    const mundo = montar(on, { falhar: ['opus'] })
    await iniciar($)
    await pedir($, 'investigue o bug do lightbox')
    expect(ultimo(mundo.status)).toBe('Modelo: Opus · auto')
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe(SESSAO)
    expect(ultimo(mundo.status)).toBe('Modelo: Sonnet · auto')
  })

  test('rebaixar numa conversa curta atualiza o status para o modelo usado', async ($, on) => {
    const mundo = montar(on)
    await iniciar($)
    await pedir($, 'investigue o bug do lightbox')
    await passo($)
    expect(ultimo(mundo.status)).toBe('Modelo: Opus · auto')
    await pedir($, 'troque o título da página inicial')
    expect(ultimo(mundo.status)).toBe('Modelo: Sonnet · auto')
    await passo($)
    expect(ultimo(mundo.status)).toBe('Modelo: Sonnet · auto')
  })

  test('estado antigo sem os campos novos não quebra', async ($, on) => {
    const mundo = montar(on)
    let guardado: unknown = { modo: 'auto', pedido: null }
    let versao = 1
    on('state.get', () => ({ value: { value: guardado, version: versao } }) as never)
    on('state.set', ($, e) => {
      guardado = (e as unknown as { value: unknown }).value
      versao += 1
      return { value: { isSet: true, version: versao } } as never
    })
    await iniciar($)
    await pedir($, 'investigue o bug do lightbox')
    await passo($)
    expect(ultimo(mundo.enviados)?.model).toBe('opus')
  })
})
