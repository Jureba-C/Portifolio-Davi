import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const NOW = Date.parse('2026-10-13T12:00:00Z')
type Window = { kind: string; percentUsed: number; resetsAt?: string }

const world = (on: On, windows: Window[]) => {
  const clock = mock.clock(on, { now: NOW })
  mock.store(on)
  mock.env(on, { LANG: 'pt_BR.UTF-8' })
  const toasts: string[] = []
  const statuses: (string | undefined)[] = []
  on('session.start', () => ({ cwd: '/' }))
  on('tool.register', () => ({ value: undefined }) as never)
  on('command.register', () => ({ value: undefined }) as never)
  on('session.usage', () => ({ value: { startedAt: NOW, context: { window: 200_000 }, rateLimits: windows } }) as never)
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined } as never
  })
  on('ui.status', ($, e) => {
    statuses.push(e.text)
    return { value: undefined } as never
  })
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box', props: {}, children: [] }) as never)
  return { toasts, statuses, clock }
}

const start = ($: Engine) =>
  $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true } as never)

const measure = (rateLimits: Window[]) => ({ context: { window: 200_000 }, rateLimits, changed: ['rateLimits'] as const }) as never

const PANE = { plugin: 'savvy-progress', component: 'Pane', requestId: 'savvy-agents', props: { title: 'Agentes', isFocused: false, bodyColumns: 70 } as never } as const

describe('plan usage', () => {
  test('a crossing toasts once and the status line follows', async ($, on) => {
    const five = { kind: 'five_hour', percentUsed: 40, resetsAt: new Date(NOW + 80 * 60_000).toISOString() }
    const { toasts, statuses } = world(on, [five, { kind: 'seven_day', percentUsed: 41 }])
    await start($)
    expect(toasts).toEqual([])
    expect(statuses.at(-1)).toBe('5h 40% · Sem 41%')
    await $.session.measure(measure([{ ...five, percentUsed: 81 }]))
    await $.session.measure(measure([{ ...five, percentUsed: 84 }]))
    await $.session.measure(measure([{ ...five, percentUsed: 90 }]))
    await $.session.measure(measure([{ ...five, percentUsed: 93 }]))
    expect(toasts).toEqual(['Limite de 5 h em 81% — reinicia em 1 h 20 min', 'Limite de 5 h em 90% — reinicia em 1 h 20 min'])
    expect(statuses.at(-1)).toBe('5h 93%')
  })

  test('without a reading the pane says so and never shows zero, cost or tokens', async ($, on) => {
    const { toasts, statuses } = world(on, [])
    await start($)
    expect(toasts).toEqual([])
    expect(statuses.filter(s => s !== undefined)).toEqual([])
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...PANE, surface } as never)
      const drawn = JSON.stringify(await ui.drawn())
      expect(drawn).toContain('sem leitura ainda')
      expect(drawn).toContain('Nenhum subagente ainda.')
      expect(drawn).not.toMatch(/[>" ]0%|≈|\$\d|token|cost/i)
      await ui.unmount()
    }
  })

  test('with a reading the pane shows used and left with the reset', async ($, on) => {
    world(on, [{ kind: 'five_hour', percentUsed: 23.5, resetsAt: new Date(NOW + 130 * 60_000).toISOString() }])
    await start($)
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' } as never)
    const drawn = JSON.stringify(await ui.drawn())
    expect(drawn).toContain('usado 23% · restam 77%')
    expect(drawn).toContain('reinicia em 2 h 10 min')
    await ui.unmount()
  })
})

describe('agents', () => {
  test('a finished agent keeps its time, with no cost or tokens, in start order', async ($, on) => {
    const { clock } = world(on, [{ kind: 'five_hour', percentUsed: 10 }])
    let n = 0
    on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `a${++n}` }))
    on('turn.complete', () => ({ text: 'ok' }) as never)
    on('ui.open', () => ({ value: true }) as never)
    await start($)
    await $.agent.spawn({ subagentType: 'savvy-flow:savvy-careful', description: 'Primeira tarefa', prompt: 'x' } as never)
    await clock.advance(5_000)
    await $.agent.spawn({ subagentType: 'savvy-flow:savvy-light', description: 'Segunda tarefa', prompt: 'x' } as never)
    await clock.advance(60_000)
    await $.turn.complete({ agentId: 'a1', reason: 'answer', answer: 'ok', turnId: 't' } as never)
    await clock.advance(100_000)
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' } as never)
    const drawn = JSON.stringify(await ui.drawn())
    expect(drawn).toContain('1:05')
    expect(drawn).toContain('2:40')
    expect(drawn).toContain('Tempo 2:45')
    expect(drawn).toContain('"ctx "')
    expect(drawn).not.toMatch(/≈|\$\d|token/i)
    expect(drawn.indexOf('Segunda tarefa')).toBeLessThan(drawn.indexOf('Primeira tarefa'))
    await ui.unmount()
  })
})

const BAND = (surface: 'terminal' | 'desktop', bodyColumns = 100) =>
  ({
    plugin: 'savvy-progress',
    surface,
    component: 'AbovePrompt',
    requestId: 'band',
    props: { hasSurvey: false, isWorking: true, maxRows: 10, bodyColumns, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  }) as never

const crew = (on: On) => {
  const tools = world(on, [{ kind: 'five_hour', percentUsed: 10 }])
  let n = 0
  const live: { id: string; status: string }[] = []
  on('agent.spawn', () => {
    const agentId = `a${++n}`
    live.push({ id: agentId, status: 'running' })
    return { model: 'claude-opus-5-5', agentId }
  })
  on('agent.list', () => ({ value: live.map(a => ({ ...a, description: '', type: 'x' })) }) as never)
  on('turn.complete', () => ({ text: 'ok' }) as never)
  on('ui.open', () => ({ value: true }) as never)
  on('ui.panes', () => ({ value: [] }) as never)
  return { ...tools, live }
}

const spawn = ($: Engine, description: string, type = 'savvy-flow:savvy-careful') =>
  $.agent.spawn({ subagentType: type, description, prompt: 'x' } as never)

const finish = ($: Engine, agentId: string) =>
  $.turn.complete({ agentId, reason: 'answer', answer: 'ok', turnId: 't' } as never)

const progress = ($: Engine, input: Record<string, unknown>) =>
  $.tool.call({ tool: 'mcp__savvy-progress__progress', ...input } as never)

const bandText = async ($: Engine, surface: 'terminal' | 'desktop', bodyColumns = 100): Promise<string> => {
  const ui = await $.ui.mount(BAND(surface, bodyColumns))
  const drawn = await ui.drawn().then(
    d => JSON.stringify(d),
    () => '',
  )
  await ui.unmount()
  return drawn.includes('savvy-dismiss') ? drawn : ''
}

const PERCENT = />\d+%<|"\d+%"|, \d+%"/
const MISLEADING = /\b0 (running|rodando)\b|"0%"|>0%<|Tasks 0|Tarefas 0 /

describe('band', () => {
  test('nothing planned and nobody running: no band at all', async ($, on) => {
    crew(on)
    await start($)
    for (const surface of ['terminal', 'desktop'] as const) expect(await bandText($, surface)).toBe('')
  })

  test('helpers running without a plan: says how many run and finished, no percent, no 0 running', async ($, on) => {
    const { clock } = crew(on)
    await start($)
    await spawn($, 'Primeira')
    await spawn($, 'Segunda', 'Explore')
    await spawn($, 'Terceira', 'savvy-flow:savvy-light')
    await clock.advance(2_000)
    await finish($, 'a1')
    for (const surface of ['terminal', 'desktop'] as const) {
      const drawn = await bandText($, surface)
      expect(drawn).toContain('2 ajudantes rodando · 1 concluído')
      expect(drawn).toContain('Agentes · 3')
      expect(drawn).not.toMatch(MISLEADING)
      expect(drawn).not.toMatch(PERCENT)
      expect(drawn).not.toContain('×')
      expect(drawn).not.toContain('savvy-flow')
    }
  })

  test('a partial plan shows done of total, who runs, the percent and the phase', async ($, on) => {
    crew(on)
    await start($)
    const tasks = ['Um', 'Dois', 'Tres', 'Quatro', 'Cinco'].map(title => ({ title, tier: 'medium' }))
    await progress($, { title: 'Barra nova', total: 5, phase: 'delegate', tasks })
    await spawn($, 'Um')
    await spawn($, 'Dois')
    await finish($, 'a1')
    await progress($, { done: 2 })
    for (const surface of ['terminal', 'desktop'] as const) {
      const drawn = await bandText($, surface)
      expect(drawn).toContain('Tarefas 2/5 · 1 rodando')
      expect(drawn).toContain('40%')
      expect(drawn).toContain('Barra nova')
      expect(drawn).not.toMatch(MISLEADING)
    }
    await finish($, 'a2')
    await progress($, { phase: 'review' })
    const review = await bandText($, 'terminal')
    expect(review).toContain('Revisão 2/5')
    expect(review).not.toContain('rodando')
  })

  test('a narrow terminal cuts the title with an ellipsis, then drops it and keeps the count', async ($, on) => {
    crew(on)
    await start($)
    const tasks = ['Um', 'Dois', 'Tres', 'Quatro', 'Cinco'].map(title => ({ title, tier: 'medium' }))
    await progress($, { title: 'Barra do savvy-progress', total: 5, phase: 'delegate', tasks })
    await spawn($, 'Um')
    await spawn($, 'Dois')
    await spawn($, 'Tres')
    await finish($, 'a1')
    await finish($, 'a2')
    await progress($, { done: 2 })
    const sixty = await bandText($, 'terminal', 60)
    expect(sixty).toContain('"Barra do sa… ·"')
    expect(sixty).toContain('"Tarefas 2/5 · 1 rodando"')
    const forty = await bandText($, 'terminal', 40)
    expect(forty).not.toContain('Barra')
    expect(forty).toContain('"2/5 · 1 rodando"')
    const wide = await bandText($, 'terminal', 140)
    expect(wide).toContain('"Barra do savvy-progress"')
  })

  test('a plan with no total yet shows the phase alone, never 0%', async ($, on) => {
    crew(on)
    await start($)
    await progress($, { title: 'Desenho', phase: 'design' })
    for (const surface of ['terminal', 'desktop'] as const) {
      const drawn = await bandText($, surface)
      expect(drawn).toContain('Design')
      expect(drawn).not.toMatch(PERCENT)
      expect(drawn).not.toMatch(MISLEADING)
    }
  })

  test('a finished plan says Concluído for a moment, then the band goes', async ($, on) => {
    const { clock } = crew(on)
    await start($)
    await progress($, { title: 'Fim', total: 5, done: 5, phase: 'review' })
    await progress($, { finished: true })
    for (const surface of ['terminal', 'desktop'] as const) {
      const drawn = await bandText($, surface)
      expect(drawn).toContain('Concluído · 5/5')
      expect(drawn).toContain('100%')
    }
    await progress($, { finished: true })
    expect(await bandText($, 'terminal')).toContain('Concluído · 5/5')
    await clock.advance(9_000)
    for (const surface of ['terminal', 'desktop'] as const) expect(await bandText($, surface)).toBe('')
  })

  test('the X closes for real: no new agent brings it back, only a new plan', async ($, on) => {
    crew(on)
    await start($)
    await progress($, { title: 'Plano A', total: 2, phase: 'delegate' })
    const ui = await $.ui.mount(BAND('terminal'))
    await ui.press({ key: 'savvy-dismiss' })
    await ui.unmount()
    expect(await bandText($, 'terminal')).toBe('')
    await spawn($, 'Outra')
    await progress($, { done: 1 })
    expect(await bandText($, 'desktop')).toBe('')
    await progress($, { title: 'Plano B', total: 3, phase: 'delegate' })
    expect(await bandText($, 'terminal')).toContain('Tarefas 0/3 · 1 rodando')
  })

  test('after a reload the list is settled against the engine: gone agents stop running', async ($, on) => {
    const { clock, live } = crew(on)
    await start($)
    await spawn($, 'Primeira')
    await spawn($, 'Segunda')
    expect(await bandText($, 'terminal')).toContain('2 ajudantes rodando')
    live.splice(0, live.length, { id: 'a2', status: 'completed' })
    await clock.advance(31_000)
    await start($)
    expect(await bandText($, 'terminal')).toBe('')
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' } as never)
    const drawn = JSON.stringify(await pane.drawn())
    expect(drawn).not.toContain('Em andamento')
    expect(drawn).toContain('Concluídos · 2')
    await pane.unmount()
  })

  test('an agent the engine never lists stops running after the safety timeout', { timeoutMs: 30_000 }, async ($, on) => {
    const { clock } = world(on, [])
    on('agent.spawn', () => ({ model: 'claude-opus-5-5' }))
    on('ui.open', () => ({ value: true }) as never)
    await start($)
    await spawn($, 'Sem id')
    expect(await bandText($, 'terminal')).toContain('1 ajudante rodando')
    await clock.advance(19 * 60_000)
    expect(await bandText($, 'terminal')).toContain('1 ajudante rodando')
    await clock.advance(2 * 60_000)
    expect(await bandText($, 'terminal')).toBe('')
  })

  test('the crab wears the busiest helper, and the narrow band keeps its words', async ($, on) => {
    crew(on)
    await start($)
    await spawn($, 'Pesada', 'savvy-flow:savvy-heavy')
    const desktop = await bandText($, 'desktop', 40)
    expect(desktop).toContain('c-heavy run')
    const terminal = await bandText($, 'terminal', 40)
    expect(terminal).toContain('1 ajudante rodando')
  })
})

const localeWorld = (on: On, appleLocale: string) => {
  mock.clock(on, { now: NOW })
  mock.store(on)
  mock.env(on, {})
  on('session.start', () => ({ cwd: '/' }))
  on('tool.register', () => ({ value: undefined }) as never)
  on('command.register', () => ({ value: undefined }) as never)
  on('session.usage', () => ({ value: { startedAt: NOW, context: { window: 200_000 }, rateLimits: [] } }) as never)
  on('ui.status', () => ({ value: undefined }) as never)
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box', props: {}, children: [] }) as never)
  on('settings.read', () => ({ value: {} }) as never)
  on('process.run', ($, e) => ({ value: { exitCode: 0, stdout: e.argv[0] === 'defaults' ? `${appleLocale}\n` : '-0300\n', stderr: '' } }) as never)
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a1' }))
  on('ui.open', () => ({ value: true }) as never)
}

describe('language', () => {
  test('auto on a Brazilian Mac (en_BR) speaks Portuguese', { options: { language: 'auto' } }, async ($, on) => {
    localeWorld(on, 'en_BR')
    await start($)
    await spawn($, 'Uma')
    expect(await bandText($, 'terminal')).toContain('1 ajudante rodando')
  })

  test('auto on an American Mac speaks English', { options: { language: 'auto' } }, async ($, on) => {
    localeWorld(on, 'en_US')
    await start($)
    await spawn($, 'Uma')
    expect(await bandText($, 'terminal')).toContain('1 helper running')
  })

  test('the default is Portuguese whatever the locale', async ($, on) => {
    localeWorld(on, 'en_US')
    await start($)
    await spawn($, 'Uma')
    expect(await bandText($, 'terminal')).toContain('1 ajudante rodando')
  })
})
