import { describe, expect, test } from 'claude-code/testing'

import type { AgentRun, Flow } from '../types'
import { FINISHED_MS, GONE_GRACE_MS, STALE_MS, bandOf, cut, fitLine, leadOf, settle } from '../hooks/band'
import { STRINGS } from '../hooks/usage'

const pt = STRINGS.pt
const T = 1_000_000

const run = (id: string, over: Partial<AgentRun> = {}): AgentRun => ({
  id,
  agentId: id,
  type: 'savvy-flow:savvy-medium',
  description: id,
  model: 'claude-opus-5-5',
  status: 'running',
  startedAt: T,
  contextTokens: 0,
  contextMax: 200_000,
  round: 1,
  ...over,
})

const plan = (over: Partial<Flow> = {}): Flow => ({
  title: 'Barra',
  total: 5,
  done: 2,
  phase: 'delegate',
  isFinished: false,
  tasks: [],
  ...over,
})

describe('band states', () => {
  test('empty: hidden', () => {
    expect(bandOf(pt, null, [], false, T)).toEqual({ kind: 'hidden' })
    expect(bandOf(pt, null, [run('a', { status: 'done' })], false, T)).toEqual({ kind: 'hidden' })
  })

  test('no plan with helpers: counts, no ratio', () => {
    const b = bandOf(pt, null, [run('a'), run('b'), run('c', { status: 'failed' })], false, T)
    expect(b).toMatchObject({ kind: 'crew', label: '2 ajudantes rodando · 1 concluído', running: 2 })
  })

  test('partial plan: done of total, running, ratio', () => {
    const b = bandOf(pt, plan(), [run('a')], false, T)
    expect(b).toMatchObject({ kind: 'plan', label: 'Tarefas 2/5 · 1 rodando', ratio: 0.4 })
    expect(bandOf(pt, plan(), [], false, T)).toMatchObject({ label: 'Tarefas 2/5', ratio: 0.4 })
    expect(bandOf(pt, plan({ total: 0, done: 0, phase: 'plan' }), [], false, T)).toMatchObject({ label: 'Plano', ratio: null })
    expect(bandOf(pt, plan({ phase: 'close' }), [], false, T)).toMatchObject({ label: 'Fechamento 2/5' })
  })

  test('finished: Concluído for a moment, then hidden', () => {
    const f = plan({ done: 5, isFinished: true, phase: 'close', finishedAt: T })
    expect(bandOf(pt, f, [], false, T + 1000)).toMatchObject({ kind: 'finished', label: 'Concluído · 5/5', ratio: 1 })
    expect(bandOf(pt, f, [], false, T + FINISHED_MS)).toEqual({ kind: 'hidden' })
    expect(bandOf(pt, plan({ total: 0, done: 0, isFinished: true, finishedAt: T }), [], false, T)).toMatchObject({ label: 'Concluído', ratio: 1 })
  })

  test('dismissed: hidden whatever runs', () => {
    expect(bandOf(pt, plan(), [run('a')], true, T)).toEqual({ kind: 'hidden' })
  })

  test('the lead is the running helper heard from last', () => {
    expect(leadOf([run('a', { lastAt: T + 5 }), run('b', { lastAt: T + 9, type: 'savvy-flow:savvy-heavy' }), run('c', { status: 'done', lastAt: T + 20 })])?.id).toBe('b')
    expect(leadOf([run('a', { status: 'done' })])).toBeNull()
  })
})

describe('settling against the engine', () => {
  test('ended statuses end the run; live ones keep it', () => {
    const list = [run('a'), run('b'), run('c'), run('d'), run('e')]
    const live = [
      { id: 'a', status: 'running' },
      { id: 'b', status: 'completed' },
      { id: 'c', status: 'killed' },
      { id: 'd', status: 'idle' },
      { id: 'e', status: 'waiting' },
    ]
    const out = settle(list, live, T + 10)
    expect(out.map(a => a.status)).toEqual(['running', 'done', 'failed', 'done', 'running'])
    expect(out[1]?.endedAt).toBe(T + 10)
  })

  test('an agent missing from a non-empty list ends after the grace', () => {
    const live = [{ id: 'other', status: 'running' }]
    expect(settle([run('a')], live, T + GONE_GRACE_MS - 1)[0]?.status).toBe('running')
    expect(settle([run('a')], live, T + GONE_GRACE_MS + 1)[0]?.status).toBe('done')
  })

  test('an empty or failed list never ends a run before the safety timeout', () => {
    const list = [run('a', { lastAt: T + 1000 })]
    expect(settle(list, [], T + GONE_GRACE_MS * 10)).toBe(list)
    expect(settle(list, undefined, T + 1000 + STALE_MS - 1)).toBe(list)
    const out = settle(list, undefined, T + 1000 + STALE_MS + 1)
    expect(out[0]).toMatchObject({ status: 'done', endedAt: T + 1000 })
  })

  test('nothing to change keeps the same list', () => {
    const list = [run('a', { status: 'done' }), run('b')]
    expect(settle(list, [{ id: 'b', status: 'running' }], T + 5)).toBe(list)
  })
})

describe('cutting text', () => {
  test('a cut always ends in an ellipsis, and nothing is cut that fits', () => {
    expect(cut('Barra do savvy-progress', 12)).toBe('Barra do sa…')
    expect(cut('Barra', 5)).toBe('Barra')
    expect(cut('Barra', 1)).toBe('…')
    expect(cut('Barra', 0)).toBe('')
    expect(fitLine(30, 'Tarefas 2/5 · 1 rodando', '2/5 · 1 rodando')).toBe('Tarefas 2/5 · 1 rodando')
    expect(fitLine(16, 'Tarefas 2/5 · 1 rodando', '2/5 · 1 rodando')).toBe('2/5 · 1 rodando')
    expect(fitLine(8, 'Tarefas 2/5 · 1 rodando', '2/5 · 1 rodando')).toBe('2/5 · 1…')
  })
})
