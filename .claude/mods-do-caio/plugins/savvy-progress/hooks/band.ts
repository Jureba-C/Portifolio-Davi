import type { AgentRun, Flow } from '../types'
import type { Words } from './usage'

export const FINISHED_MS = 8_000
export const GONE_GRACE_MS = 30_000
export const STALE_MS = 20 * 60_000

export type LiveAgent = { id: string; status: string }

export type Band =
  | { kind: 'hidden' }
  | { kind: 'plan'; title: string; label: string; short: string; ratio: number | null; running: number; lead: AgentRun | null }
  | { kind: 'crew'; label: string; short: string; running: number; lead: AgentRun | null }
  | { kind: 'finished'; title: string; label: string; short: string; ratio: number | null }

const LIVE_STATUS = new Set(['pending', 'running', 'waiting'])
const FAILED_STATUS = new Set(['failed', 'killed'])

export const cut = (text: string, room: number): string => {
  const chars = [...text]
  if (room <= 0) return ''
  if (chars.length <= room) return text
  return room === 1 ? '…' : `${chars.slice(0, room - 1).join('')}…`
}

export const fitLine = (room: number, ...texts: string[]): string => {
  const fit = texts.find(t => [...t].length <= room)
  return fit ?? cut(texts[texts.length - 1] ?? '', room)
}

export const phaseWord = (s: Words, f: Flow): string => {
  if (f.phase === 'plan') return s.plan
  if (f.phase === 'design') return s.design
  if (f.phase === 'review') return s.review
  if (f.phase === 'close') return s.closing
  return s.tasks
}

export const progressText = (s: Words, f: Flow): string => {
  const word = f.isFinished ? s.done : phaseWord(s, f)
  if (!f.total) return word
  return f.isFinished ? `${word} · ${f.done}/${f.total}` : `${word} ${f.done}/${f.total}`
}

export const planRatio = (f: Flow): number | null => (f.total ? Math.min(1, f.done / f.total) : null)

export const runningOf = (list: AgentRun[]): AgentRun[] => list.filter(a => a.status === 'running')

export const leadOf = (list: AgentRun[]): AgentRun | null =>
  runningOf(list).reduce<AgentRun | null>(
    (best, a) => (best === null || (a.lastAt ?? a.startedAt) > (best.lastAt ?? best.startedAt) ? a : best),
    null,
  )

export const bandOf = (s: Words, f: Flow | null, list: AgentRun[], isHidden: boolean, at: number): Band => {
  if (isHidden) return { kind: 'hidden' }
  const running = runningOf(list).length
  const lead = leadOf(list)
  if (f && !f.isFinished) {
    const word = progressText(s, f)
    const count = f.total ? `${f.done}/${f.total}` : phaseWord(s, f)
    return {
      kind: 'plan',
      title: f.title,
      label: running ? `${word} · ${s.runningN(running)}` : word,
      short: running ? `${count} · ${s.runningN(running)}` : count,
      ratio: planRatio(f),
      running,
      lead,
    }
  }
  if (f && f.isFinished && f.finishedAt !== undefined && at - f.finishedAt < FINISHED_MS) {
    return { kind: 'finished', title: f.title, label: progressText(s, f), short: f.total ? `${f.done}/${f.total}` : s.done, ratio: planRatio(f) ?? 1 }
  }
  if (running) {
    const ended = list.length - running
    return {
      kind: 'crew',
      label: ended ? `${s.helpers(running)} · ${s.finishedN(ended)}` : s.helpers(running),
      short: s.helpers(running),
      running,
      lead,
    }
  }
  return { kind: 'hidden' }
}

export const settle = (list: AgentRun[], live: LiveAgent[] | undefined, at: number): AgentRun[] => {
  const byId = new Map((live ?? []).map(a => [a.id, a.status]))
  const isListed = byId.size > 0
  let isChanged = false
  const out = list.map(a => {
    if (a.status !== 'running') return a
    const seen = a.lastAt ?? a.startedAt
    const status = a.agentId === undefined ? undefined : byId.get(a.agentId)
    let ended: AgentRun['status'] | undefined
    let endedAt = at
    if (status !== undefined) {
      if (!LIVE_STATUS.has(status)) ended = FAILED_STATUS.has(status) ? 'failed' : 'done'
    } else if (isListed && a.agentId !== undefined) {
      if (at - a.startedAt > GONE_GRACE_MS) ended = 'done'
    } else if (at - seen > STALE_MS) {
      ended = 'done'
      endedAt = seen
    }
    if (ended === undefined) return a
    isChanged = true
    return { ...a, status: ended, endedAt }
  })
  return isChanged ? out : list
}
