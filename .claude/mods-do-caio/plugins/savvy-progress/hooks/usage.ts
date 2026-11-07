import type { PlanWindow, Warned } from '../types'

export type Lang = 'en' | 'ru' | 'pt'
export type Level = 'ok' | 'warn' | 'crit'

const KINDS = ['five_hour', 'seven_day', 'spend_limit'] as const

const ruPlural = (n: number, one: string, few: string, many: string): string => {
  const d = n % 10
  const dd = n % 100
  if (d === 1 && dd !== 11) return one
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few
  return many
}

export const STRINGS = {
  en: {
    pane: 'Agents',
    time: 'Time',
    collapse: 'Collapse',
    expand: 'Expand',
    running: 'Running',
    finished: 'Finished',
    planned: 'Planned',
    empty: 'No subagents yet.',
    round: 'round',
    failed: 'error',
    after: 'after',
    agentsCount: 'agents',
    isRunning: 'running',
    isFinished: 'finished',
    isPlanned: 'planned',
    opened: 'Agents panel opened.',
    closed: 'Agents panel closed.',
    done: 'Done',
    plan: 'Plan',
    design: 'Design',
    tasks: 'Tasks',
    review: 'Review',
    closing: 'Closing',
    runningN: (n: number) => `${n} running`,
    helpers: (n: number) => (n === 1 ? '1 helper running' : `${n} helpers running`),
    finishedN: (n: number) => `${n} finished`,
    planLabel: 'Plan',
    noReading: 'no reading yet',
    used: (u: number, left: number) => `${u}% used · ${left}% left`,
    resetsIn: (t: string) => `resets in ${t}`,
    resetsOn: (d: string, hm: string) => `resets ${d} ${hm}`,
    resetsNow: 'resets now',
    hour: 'h',
    minute: 'min',
    lessMinute: '< 1 min',
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    names: { five_hour: '5 h', seven_day: 'Week', spend_limit: 'Spend' } as Record<string, string>,
    short: { five_hour: '5h', seven_day: 'Wk', spend_limit: 'Spend' } as Record<string, string>,
    limits: { five_hour: '5-hour limit', seven_day: 'Weekly limit', spend_limit: 'Spend limit' } as Record<string, string>,
    warn: (name: string, pct: number, reset: string) => `${name} at ${pct}%${reset ? ` — ${reset}` : ''}`,
  },
  ru: {
    pane: 'Агенты',
    time: 'Время',
    collapse: 'Свернуть',
    expand: 'Развернуть',
    running: 'Работают',
    finished: 'Завершены',
    planned: 'Запланированы',
    empty: 'Субагентов пока нет.',
    round: 'раунд',
    failed: 'ошибка',
    after: 'после',
    agentsCount: 'агентов',
    isRunning: 'работает',
    isFinished: 'завершён',
    isPlanned: 'запланирована',
    opened: 'Панель агентов открыта.',
    closed: 'Панель агентов закрыта.',
    done: 'Готово',
    plan: 'План',
    design: 'Дизайн',
    tasks: 'Задачи',
    review: 'Ревью',
    closing: 'Завершение',
    runningN: (n: number) => `${n} в работе`,
    helpers: (n: number) => `${n} ${ruPlural(n, 'помощник', 'помощника', 'помощников')} в работе`,
    finishedN: (n: number) => `готово ${n}`,
    planLabel: 'Тариф',
    noReading: 'данных пока нет',
    used: (u: number, left: number) => `занято ${u}% · осталось ${left}%`,
    resetsIn: (t: string) => `сброс через ${t}`,
    resetsOn: (d: string, hm: string) => `сброс ${d} в ${hm}`,
    resetsNow: 'сброс сейчас',
    hour: 'ч',
    minute: 'мин',
    lessMinute: '< 1 мин',
    days: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
    names: { five_hour: '5 ч', seven_day: 'Неделя', spend_limit: 'Расходы' } as Record<string, string>,
    short: { five_hour: '5ч', seven_day: 'Нед', spend_limit: 'Расх' } as Record<string, string>,
    limits: { five_hour: 'Лимит 5 ч', seven_day: 'Недельный лимит', spend_limit: 'Лимит расходов' } as Record<string, string>,
    warn: (name: string, pct: number, reset: string) => `${name}: ${pct}%${reset ? ` — ${reset}` : ''}`,
  },
  pt: {
    pane: 'Agentes',
    time: 'Tempo',
    collapse: 'Recolher',
    expand: 'Expandir',
    running: 'Em andamento',
    finished: 'Concluídos',
    planned: 'Planejados',
    empty: 'Nenhum subagente ainda.',
    round: 'rodada',
    failed: 'erro',
    after: 'depois de',
    agentsCount: 'agentes',
    isRunning: 'em andamento',
    isFinished: 'concluído',
    isPlanned: 'planejada',
    opened: 'Painel de agentes aberto.',
    closed: 'Painel de agentes fechado.',
    done: 'Concluído',
    plan: 'Plano',
    design: 'Design',
    tasks: 'Tarefas',
    review: 'Revisão',
    closing: 'Fechamento',
    runningN: (n: number) => `${n} rodando`,
    helpers: (n: number) => (n === 1 ? '1 ajudante rodando' : `${n} ajudantes rodando`),
    finishedN: (n: number) => (n === 1 ? '1 concluído' : `${n} concluídos`),
    planLabel: 'Plano',
    noReading: 'sem leitura ainda',
    used: (u: number, left: number) => `usado ${u}% · restam ${left}%`,
    resetsIn: (t: string) => `reinicia em ${t}`,
    resetsOn: (d: string, hm: string) => `reinicia ${d} às ${hm}`,
    resetsNow: 'reinicia agora',
    hour: 'h',
    minute: 'min',
    lessMinute: '< 1 min',
    days: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
    names: { five_hour: '5 h', seven_day: 'Semana', spend_limit: 'Gasto' } as Record<string, string>,
    short: { five_hour: '5h', seven_day: 'Sem', spend_limit: 'Gasto' } as Record<string, string>,
    limits: { five_hour: 'Limite de 5 h', seven_day: 'Limite semanal', spend_limit: 'Limite de gasto' } as Record<string, string>,
    warn: (name: string, pct: number, reset: string) => `${name} em ${pct}%${reset ? ` — ${reset}` : ''}`,
  },
}

export type Words = (typeof STRINGS)[Lang]

export const langOf = (v: unknown): Lang | undefined => {
  if (typeof v !== 'string' || !v.trim()) return undefined
  const s = v.trim().toLowerCase()
  if (/^[a-z]{2,3}[-_]br\b/.test(s)) return 'pt'
  if (/^(ru|russian|рус)/.test(s)) return 'ru'
  if (/^pt([-_.@]|$)|portugu|brasil|brazil/.test(s)) return 'pt'
  if (/^en([-_.@]|$)|^english/.test(s)) return 'en'
  return undefined
}

export const pickLang = (setting: unknown, locales: readonly unknown[]): Lang => {
  const chosen = langOf(setting)
  if (chosen) return chosen
  const found = locales.map(langOf).filter((l): l is Lang => l !== undefined)
  return found.includes('pt') ? 'pt' : (found[0] ?? 'en')
}

export const LEVEL_COLOR: Record<Level, string> = { ok: '#8f8cf4', warn: '#BA7517', crit: '#D0453F' }

export const usedOf = (w: PlanWindow): number => Math.max(0, Math.floor(w.percentUsed))

export const leftOf = (w: PlanWindow): number => Math.max(0, 100 - usedOf(w))

export const levelOf = (w: PlanWindow): Level => (usedOf(w) >= 90 ? 'crit' : usedOf(w) >= 70 ? 'warn' : 'ok')

const kindRank = (kind: string): number => {
  const i = (KINDS as readonly string[]).indexOf(kind)
  return i < 0 ? KINDS.length : i
}

export const cleanWindows = (raw: unknown): PlanWindow[] => {
  if (!Array.isArray(raw)) return []
  const out: PlanWindow[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const { kind, percentUsed, resetsAt } = r as Record<string, unknown>
    if (typeof kind !== 'string' || !kind || typeof percentUsed !== 'number' || !Number.isFinite(percentUsed)) continue
    if (out.some(w => w.kind === kind)) continue
    const at = typeof resetsAt === 'string' && Number.isFinite(Date.parse(resetsAt)) ? resetsAt : undefined
    out.push(at ? { kind, percentUsed, resetsAt: at } : { kind, percentUsed })
  }
  return out.sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || a.kind.localeCompare(b.kind))
}

export const nameOf = (s: Words, kind: string): string => s.names[kind] ?? kind

export const shortOf = (s: Words, kind: string): string => s.short[kind] ?? kind

export const fmtSpan = (s: Words, ms: number): string => {
  const min = Math.floor(ms / 60_000)
  if (min < 1) return s.lessMinute
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} ${s.minute}`
  return m ? `${h} ${s.hour} ${m} ${s.minute}` : `${h} ${s.hour}`
}

const DAY = 24 * 3_600_000

export const resetText = (s: Words, resetsAt: string | undefined, at: number, tzOffsetMin: number): string => {
  if (!resetsAt) return ''
  const t = Date.parse(resetsAt)
  if (!Number.isFinite(t)) return ''
  const ms = t - at
  if (ms <= 0) return s.resetsNow
  if (ms < DAY) return s.resetsIn(fmtSpan(s, ms))
  const local = new Date(t + tzOffsetMin * 60_000)
  const hm = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`
  return s.resetsOn(s.days[local.getUTCDay()] ?? '', hm)
}

export const statusLine = (s: Words, windows: PlanWindow[]): string =>
  windows.map(w => `${shortOf(s, w.kind)} ${usedOf(w)}%`).join(' · ')

export const parseOffset = (out: string): number | undefined => {
  const m = /^([+-])(\d{2})(\d{2})$/.exec(out.trim())
  if (!m) return undefined
  const v = Number(m[2]) * 60 + Number(m[3])
  return m[1] === '-' ? -v : v
}

const SAME_WINDOW_MS = 30 * 60_000

export type WarnStep = { fire: 0 | 80 | 90; memo: Warned[string] }

export const warnStep = (w: PlanWindow, prev: Warned[string] | undefined): WarnStep => {
  const used = usedOf(w)
  const crossed: 0 | 80 | 90 = used >= 90 ? 90 : used >= 80 ? 80 : 0
  const a = prev?.resetsAt ? Date.parse(prev.resetsAt) : NaN
  const b = w.resetsAt ? Date.parse(w.resetsAt) : NaN
  const isSame = !!prev && (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a - b) < SAME_WINDOW_MS)
  const base = isSame && used >= 70 ? (prev?.level ?? 0) : 0
  const level = Math.max(base, crossed)
  const memo = w.resetsAt ? { level, resetsAt: w.resetsAt } : { level }
  return { fire: crossed > base ? crossed : 0, memo }
}

export const warnText = (s: Words, w: PlanWindow, at: number, tzOffsetMin: number): string =>
  s.warn(s.limits[w.kind] ?? nameOf(s, w.kind), usedOf(w), resetText(s, w.resetsAt, at, tzOffsetMin))

export const fmtTime = (ms: number): string => {
  const sec = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const ss = String(sec % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
