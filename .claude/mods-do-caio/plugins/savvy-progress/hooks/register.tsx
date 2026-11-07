import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AgentRun, Flow, Panel, Phase, PlannedTask, PlanWindow, Warned } from '../types'
import { FINISHED_MS, bandOf, cut, fitLine, planRatio, progressText, settle } from './band'
import type { Band, LiveAgent } from './band'
import {
  LEVEL_COLOR,
  STRINGS,
  cleanWindows,
  fmtTime,
  langOf,
  leftOf,
  levelOf,
  nameOf,
  parseOffset,
  pickLang,
  resetText,
  statusLine,
  usedOf,
  warnStep,
  warnText,
} from './usage'
import type { Lang, Words } from './usage'

const flow = atom({ plugin: 'savvy-progress', key: 'flow' } as const, null, { shape: 'flow-2' })
const agents = atom({ plugin: 'savvy-progress', key: 'agents' } as const, [])
const panel = atom({ plugin: 'savvy-progress', key: 'panel' } as const, {
  isCompact: false,
  isDoneCollapsed: false,
  autoOpenedFor: '',
})
const now = atom({ plugin: 'savvy-progress', key: 'now' } as const, 0)
const plan = atom({ plugin: 'savvy-progress', key: 'plan' } as const, { windows: [], contextWindow: 0 })
const warned = atom({ plugin: 'savvy-progress', key: 'warned' } as const, {})
const isBandHidden = atom({ plugin: 'savvy-progress', key: 'isBandHidden' } as const, false)
const langState = atom({ plugin: 'savvy-progress', key: 'lang' } as const, '')
const WARNED_KEY = 'warned'

const TOOL = 'mcp__savvy-progress__progress'
const STEP_TOOL = 'mcp__savvy-progress__step'
const PANE = 'savvy-agents'
const PHASES: readonly Phase[] = ['plan', 'design', 'delegate', 'review', 'close']
const ACCENT = '#8f8cf4'
const DONE = '#5fbf8f'

type ProgressInput = {
  title?: string
  total?: number
  done?: number
  phase?: Phase
  finished?: boolean
  tasks?: { title?: string; tier?: string; after?: number[] }[]
}

// ---------------------------------------------------------------------------
// Language: the `language` option, else Claude Code's `language` setting, else the
// process locale, else the macOS system locale; English when nothing matches.

// Module scope is fine here: session.start sets them again on every (re)load.
let lang: Lang = 'en'
let tzOffsetMin = -new Date().getTimezoneOffset()
let lastStatus: string | undefined
const tr = (): Words => STRINGS[lang]

const fixedLang = (option: unknown): Lang | undefined =>
  option === 'en' || option === 'ru' || option === 'pt' ? option : undefined

async function detectLang($: EngineInterface, option: unknown): Promise<Lang> {
  const fixed = fixedLang(option)
  if (fixed) return fixed
  let setting: unknown
  try {
    setting = ((await $.settings.read()) as Record<string, unknown>).language
  } catch {
    // No settings: fall through to the locale.
  }
  if (langOf(setting)) return pickLang(setting, [])
  const locales: unknown[] = [await $.env.get('LC_ALL'), await $.env.get('LC_MESSAGES'), await $.env.get('LANG')]
  if (pickLang(undefined, locales) !== 'pt') {
    try {
      const { exitCode, stdout } = await $.process.run(['defaults', 'read', '-g', 'AppleLocale'], { timeoutMs: 3000 })
      if (exitCode === 0) locales.push(stdout)
    } catch {
      // Not macOS, or no process access.
    }
  }
  return pickLang(undefined, locales)
}

async function useLang($: EngineInterface): Promise<void> {
  const kept = await read($, langState)
  if (kept) lang = kept
}

async function detectOffset($: EngineInterface): Promise<number> {
  try {
    const { exitCode, stdout } = await $.process.run(['date', '+%z'], { timeoutMs: 3000 })
    const v = exitCode === 0 ? parseOffset(stdout) : undefined
    if (v !== undefined) return v
  } catch {
    // Fall back to the environment's own idea of the zone.
  }
  return -new Date().getTimezoneOffset()
}

const blank = (): Flow => ({
  title: 'savvy-flow',
  total: 0,
  done: 0,
  phase: 'plan',
  isFinished: false,
  tasks: [],
})

const isNewFlow = (prev: Flow | null, input: ProgressInput): boolean =>
  !prev || (prev.isFinished && input.finished !== true) || (input.title !== undefined && input.title.trim() !== prev.title)

const cleanTasks = (tasks: ProgressInput['tasks']): PlannedTask[] | undefined =>
  tasks
    ?.filter(t => t.title?.trim())
    .map(t => ({
      title: (t.title ?? '').trim(),
      tier: (t.tier ?? '').replace(/^savvy-/, '').trim().toLowerCase(),
      after: (t.after ?? []).filter(n => Number.isInteger(n) && n > 0),
    }))

const merge = (prev: Flow | null, input: ProgressInput, at: number): Flow => {
  // A new title means a new flow: never carry counters over from an earlier one.
  const base = isNewFlow(prev, input) || !prev ? blank() : prev
  const tasks = cleanTasks(input.tasks) ?? base.tasks
  const total = Math.max(0, Math.round(input.total ?? (input.tasks ? tasks.length : base.total)))
  const done = Math.min(total || Infinity, Math.max(0, Math.round(input.done ?? base.done)))
  const phase = input.phase && PHASES.includes(input.phase) ? input.phase : base.phase
  const isFinished = input.finished === true
  const merged: Flow = {
    title: input.title?.trim() || base.title,
    total,
    done,
    phase: isFinished ? 'close' : phase,
    isFinished,
    tasks,
  }
  return isFinished ? { ...merged, finishedAt: base.isFinished && base.finishedAt !== undefined ? base.finishedAt : at } : merged
}

// Deterministic noise so the dither does not shimmer between redraws.
const noise = (x: number, y: number): number => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return s - Math.floor(s)
}

// The whole row is one SVG: the desktop wraps sibling elements onto new lines,
// so title, bar, percent and the crab live in one drawing; only the count and
// the dismiss are Buttons beside it.
const H = 22
const BAR_H = 16
const CRAB_W = 26
const CELL = 3
const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif"

const xml = (s: string): string =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

// Rough advance of system UI text, in em; good enough to size the title's slot.
const charEm = (ch: string): number =>
  /[\s.,:;'|!il1()[\]]/.test(ch) ? 0.3 : /[A-ZА-ЯЁmwшщжюМШЩЖЮ@%]/.test(ch) ? 0.72 : 0.56

const textWidth = (s: string, size: number): number => [...s].reduce((w, ch) => w + charEm(ch) * size, 0)

// Cuts `s` to fit `maxW` pixels, with an ellipsis when it had to cut.
const fitText = (s: string, size: number, maxW: number): string => {
  if (textWidth(s, size) <= maxW) return s
  let out = ''
  for (const ch of s) {
    if (textWidth(out + ch + '…', size) > maxW) break
    out += ch
  }
  return out + '…'
}

const dither = (fillW: number, color: string): string => {
  const dots: string[] = []
  const cols = Math.floor(fillW / CELL)
  const rows = Math.floor(BAR_H / CELL)
  for (let c = 0; c < cols; c++) {
    const density = 0.35 + 0.6 * Math.pow(c / Math.max(1, cols), 1.2)
    for (let r = 0; r < rows; r++) {
      if (noise(c, r) < density) dots.push(`<rect class="t${Math.floor(noise(r, c) * 4)}" x="${c * CELL + 1}" y="${r * CELL + 1}" width="2" height="2"/>`)
    }
  }
  return `<g fill="${color}">${dots.join('')}</g>`
}

const bandSvg = (b: Exclude<Band, { kind: 'hidden' }>, total: number, done: number, W: number): string => {
  const isDone = b.kind === 'finished'
  const isCrew = b.kind === 'crew'
  const ratio = b.kind === 'crew' ? null : b.ratio
  const lead = b.kind === 'finished' ? null : b.lead
  const percentW = ratio === null ? 12 : 46
  const roomFor = (text: string): number => W - Math.round(16 + (text ? textWidth(text, 13) + 12 : 0)) - percentW - CRAB_W
  const pillOf = (text: string): number => Math.round(18 + textWidth(text, 11) * 1.06)
  let title = ''
  let pill = ''
  let hasBar = true
  if (b.kind === 'crew') {
    const avail = W - 16 - CRAB_W - 12
    hasBar = textWidth(b.label, 13) + 12 + 60 <= avail
    title = hasBar || textWidth(b.label, 13) <= avail ? b.label : fitText(b.short, 13, avail)
  } else {
    const options: [string, string][] = [
      [fitText(b.title, 13, Math.max(60, W * 0.4)), b.label],
      [fitText(b.title, 13, Math.min(W * 0.4, 90)), b.short],
      ['', b.short],
    ]
    const fits = options.find(([t, p]) => roomFor(t) >= pillOf(p))
    ;[title, pill] = fits ?? ['', fitText(b.short, 11, Math.max(20, roomFor('') - 18))]
  }
  const BAR_X = Math.round(16 + (title ? textWidth(title, 13) + 12 : 0))
  const BAR_W = Math.max(40, W - BAR_X - percentW - CRAB_W)
  const color = isDone ? DONE : ACCENT
  const y0 = (H - BAR_H) / 2
  const fillW = Math.round(BAR_W * (ratio ?? 0))
  const layers: string[] = []
  if (isCrew) {
    const segW = Math.max(24, Math.round(BAR_W * 0.28))
    layers.push(`<g class="sw" opacity="0.55">${dither(segW, color)}</g>`)
  } else {
    layers.push(dither(fillW, color))
    const running = b.kind === 'plan' ? b.running : 0
    const runW = total ? Math.round((BAR_W * Math.min(total, done + running)) / total) : 0
    const faint: string[] = []
    const rows = Math.floor(BAR_H / CELL)
    for (let c = Math.floor(fillW / CELL); c < Math.floor(runW / CELL); c++) {
      for (let r = 0; r < rows; r++) {
        if (noise(c + 7, r + 3) < 0.2) faint.push(`<rect class="t${Math.floor(noise(r + 5, c) * 4)}" x="${c * CELL + 1}" y="${r * CELL + 1}" width="1.7" height="1.7"/>`)
      }
    }
    layers.push(`<g fill="${color}" opacity="0.45">${faint.join('')}</g>`)
    const ticks: string[] = []
    for (let i = 1; i < total; i++) {
      const x = Math.round((BAR_W * i) / total)
      if (x > fillW + 4) ticks.push(`<rect x="${x}" y="${BAR_H / 2 - 4}" width="1.5" height="8" rx="0.75"/>`)
    }
    layers.push(`<g class="tk">${ticks.join('')}</g>`)
  }

  const pillW = Math.min(BAR_W, pillOf(pill))
  const pillX = Math.max(0, Math.min(BAR_W - pillW, fillW - pillW))
  const percent = ratio === null ? '' : `${Math.round(ratio * 100)}%`
  const sweepTo = BAR_W + Math.round(BAR_W * 0.28)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>
.t{fill:#1f1f1f}.m{fill:#8a8a8a}.k{fill:#e4e4e2}.tk{fill:#b4b4b0}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.m{fill:#9a9a9a}.k{fill:#2c2c2c}.tk{fill:#5a5a5a}}
.t0,.t1,.t2,.t3{animation:tw ${isDone ? 3.2 : 2.2}s ease-in-out infinite}
.t1{animation-duration:${isDone ? 3.8 : 2.8}s;animation-delay:-.7s}.t2{animation-duration:${isDone ? 4.4 : 1.9}s;animation-delay:-1.3s}.t3{animation-duration:${isDone ? 3.5 : 3.3}s;animation-delay:-.4s}
@keyframes tw{0%,100%{opacity:1}50%{opacity:${isDone ? 0.8 : 0.3}}}
.sw{animation:sw 1.8s linear infinite}@keyframes sw{0%{transform:translateX(-${Math.round(BAR_W * 0.28)}px)}100%{transform:translateX(${sweepTo}px)}}
@media (prefers-reduced-motion: reduce){.t0,.t1,.t2,.t3,.sw{animation:none}}
</style>
<defs><clipPath id="c"><rect x="0" y="0" width="${BAR_W}" height="${BAR_H}" rx="${BAR_H / 2}"/></clipPath></defs>
<circle cx="5" cy="${H / 2}" r="4" fill="${color}"/>
${title ? `<text class="t" x="16" y="${H / 2 + 4.5}" font-family="${FONT}" font-size="13" font-weight="500">${xml(title)}</text>` : ''}
${hasBar ? `<g transform="translate(${BAR_X},${y0})">
<rect class="k" width="${BAR_W}" height="${BAR_H}" rx="${BAR_H / 2}"/>
<g clip-path="url(#c)">${layers.join('')}</g>
${pill ? `<rect x="${pillX}" width="${pillW}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${color}"/>
<text x="${pillX + pillW / 2}" y="${BAR_H / 2 + 4}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="600" fill="#ffffff">${xml(pill)}</text>` : ''}
</g>` : ''}
${percent ? `<text class="m" x="${W - CRAB_W - 6}" y="${H / 2 + 4.5}" text-anchor="end" font-family="${FONT}" font-size="12.5" font-variant-numeric="tabular-nums">${percent}</text>` : ''}
${CRAB_CSS}${crab(W - CRAB_W + 1, 0, lead ? costumeOf(lead.type) : 'other', lead === null && !isDone, lead !== null, 0.8)}
</svg>`
}

const barText = (ratio: number, width: number): string => {
  const filled = Math.round(width * ratio)
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled))
}

// ---------------------------------------------------------------------------
// Agents panel: every subagent of the session, plus the tasks the flow planned.

const TIER_COLOR: Record<string, string> = {
  fable: '#7F77DD',
  heavy: '#D85A30',
  careful: '#BA7517',
  medium: '#378ADD',
  light: '#1D9E75',
  other: '#888780',
}

// What each savvy tier runs on, for planned tasks that have no run yet.
const colorOf = (tier: string): string => TIER_COLOR[tier] ?? '#888780'

const TIER_MODEL: Record<string, string> = {
  fable: 'Fable · high',
  heavy: 'Opus · xhigh',
  careful: 'Opus · high',
  medium: 'Opus · medium',
  light: 'Opus · low',
}

// The engine reports the main thread's window; a subagent on the same family shares it.
const windowOf = (model: string, mainWindow: number): number => {
  if (/haiku/i.test(model)) return 200_000
  if (/\[1m\]/i.test(model)) return 1_000_000
  return mainWindow > 0 ? mainWindow : 200_000
}

// `savvy-careful`, or `savvy-flow:savvy-careful` when the agents ship in a plugin.
const tierOf = (type: string): string => {
  const bare = type.replace(/^[^:]*:/, '')
  const t = bare.replace(/^savvy-/, '').toLowerCase()
  return t in TIER_COLOR && bare.startsWith('savvy-') ? t : 'other'
}

const isSavvy = (type: string): boolean => /^(?:[^:]*:)?savvy-/.test(type)

const modelName = (id: string): string => {
  const m = /(fable|mythos|opus|sonnet|haiku)-(\d+)(?:-(\d{1,2})(?!\d))?/i.exec(id)
  const [, family = '', major = '', minor] = m ?? []
  if (!family) return id.replace(/^claude-/, '').replace(/\[.*\]$/, '') || '—'
  return `${family.charAt(0).toUpperCase()}${family.slice(1).toLowerCase()} ${major}${minor ? '.' + minor : ''}`
}

const norm = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

const elapsed = (a: AgentRun, at: number): number => (a.endedAt ?? Math.max(at, a.startedAt)) - a.startedAt

type Planned = PlannedTask & { n: number }

const plannedOf = (f: Flow | null, list: AgentRun[]): Planned[] => {
  if (!f || f.isFinished) return []
  const started = new Set(list.map(a => norm(a.description)))
  return (f.tasks ?? []).map((t, i) => ({ ...t, n: i + 1 })).filter(t => !started.has(norm(t.title)))
}

const spanOf = (list: AgentRun[], at: number): number | null => {
  if (!list.length) return null
  const start = Math.min(...list.map(a => a.startedAt))
  const end = Math.max(...list.map(a => a.endedAt ?? Math.max(at, a.startedAt)))
  return end - start
}

const byStart = (a: AgentRun, b: AgentRun): number => a.startedAt - b.startedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

// --- desktop drawings: each row is one SVG, as the band above the prompt is.

const PANE_CSS = `<style>
.t{fill:#1f1f1f}.s{fill:#6b6b68}.m{fill:#9a9a96}.k{fill:#ecebe8}.ln{stroke:#e4e4e1}.tile{fill:#f4f3f0}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.s{fill:#a8a8a4}.m{fill:#7d7d79}.k{fill:#2c2c2b}.ln{stroke:#333331}.tile{fill:#262625}}
.live{animation:p 1.6s ease-in-out infinite}@keyframes p{50%{opacity:.3}}
@media (prefers-reduced-motion: reduce){.live{animation:none}}
</style>`

// Pixel Clawd from DockCrab (Clawdy): a 24×18 crab on a 30×28 grid, one costume per tier.
// The body keeps the brand clay; the tier's color lives in the costume's accent.
const CLAY = '#D97757'
const INK = '#1F1E1D'

// `cls` puts a pixel in a named group: `bd` (the default) is the body and its
// costume, `la`/`lb` the leg pairs, anything else a prop with its own motion.
type Fill = (x: number, y: number, w: number, h: number, c: string, cls?: string) => void

const stamp = (f: Fill, x: number, y: number, rows: string[], map: Record<string, string>, cls?: string): void =>
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => map[ch] && f(x + dx, y + dy, 1, 1, map[ch] ?? '', cls)))

// `armCls` lets a raised claw travel with the prop it holds.
const crabBody = (f: Fill, armFront = 0, armCls?: string): void => {
  f(7, 10, 16, 12, CLAY)
  f(3, 14, 4, 4, CLAY)
  f(23, 14 + armFront, 4, 4, CLAY, armCls)
  f(9, 12, 2, 2, INK)
  f(19, 12, 2, 2, INK)
  f(7, 22, 2, 4, CLAY, 'la')
  f(17, 22, 2, 4, CLAY, 'la')
  f(11, 22, 2, 4, CLAY, 'lb')
  f(21, 22, 2, 4, CLAY, 'lb')
}

// Pure CSS, run by the compositor: no redraws. Periods divide one second, so the
// once-a-second redraw of a running row restarts them in phase. Every crab walks;
// each costume adds its prop's own motion on top.
const CRAB_CSS = `<style>
.run .la{animation:st .5s steps(1) infinite}.run .lb{animation:st .5s steps(1) infinite -.25s}
.run .bd{animation:bob .5s steps(1) infinite -.125s}
.run g{transform-box:fill-box}
@keyframes st{50%{transform:translateY(-1px)}}@keyframes bob{50%{transform:translateY(1px)}}
.c-fable.run{animation:float 1s ease-in-out infinite}
.c-fable.run .la,.c-fable.run .lb,.c-fable.run .bd{animation:none}
.c-fable.run .ant{animation:blink 1s steps(1) infinite}
.c-fable.run .star{animation:blink .5s steps(1) infinite -.25s}
@keyframes float{50%{transform:translateY(-2px)}}@keyframes blink{50%{opacity:.15}}
.c-heavy.run .it{animation:scan 1s steps(1) infinite}
.c-heavy.run .gl{animation:blink 1s steps(1) infinite -.5s}
@keyframes scan{25%{transform:translate(-1px,1px)}50%{transform:translate(-2px,2px)}75%{transform:translate(-1px,1px)}}
.c-careful.run .it{transform-origin:100% 100%;animation:twist .5s ease-in-out infinite}
@keyframes twist{50%{transform:rotate(-35deg)}}
.c-medium.run .pan{transform-origin:0 50%;animation:tilt 1s ease-in-out infinite}
.c-medium.run .egg{animation:flip 1s ease-in-out infinite}
@keyframes tilt{20%,40%{transform:rotate(-12deg)}}@keyframes flip{30%{transform:translateY(-5px) scaleY(-1)}60%{transform:translateY(0)}}
.c-light.run .la{animation-duration:.25s}.c-light.run .lb{animation-duration:.25s;animation-delay:-.125s}
.c-light.run .flag{transform-origin:0 50%;animation:wave .25s steps(1) infinite}
@keyframes wave{50%{transform:skewY(-12deg) scaleX(.85)}}
.c-explore.run .it{transform-origin:50% 100%;animation:fence .5s ease-in-out infinite}
@keyframes fence{50%{transform:rotate(25deg)}}
@media (prefers-reduced-motion: reduce){.run,.run g{animation:none!important}}
</style>`

const COSTUMES: Record<string, (f: Fill, t: string) => void> = {
  // Fable: astronaut in a glass dome; floats instead of walking, the antenna and the star blink.
  fable: (f, t) => {
    crabBody(f)
    f(6, 7, 18, 1, '#E6E8EE'); f(5, 8, 1, 14, '#E6E8EE'); f(24, 8, 1, 14, '#E6E8EE'); f(6, 22, 18, 1, '#C9CCD2')
    f(6, 8, 18, 14, 'rgba(169,214,245,.32)'); f(8, 9, 2, 1, '#fff'); f(8, 10, 1, 2, '#fff')
    f(14, 4, 2, 3, '#C9CCD2'); f(14, 2, 2, 2, t, 'ant'); f(13, 18, 4, 2, t)
    f(27, 3, 1, 3, '#F5C542', 'star'); f(26, 4, 3, 1, '#F5C542', 'star')
  },
  // Heavy: detective with a deerstalker; the magnifier sweeps and glints.
  heavy: (f, t) => {
    crabBody(f, -4, 'it')
    stamp(f, 6, 3, ['......bbbbbb......', '....bbcbbcbbbb....', '...bbbbbbbbbbbb...', '..bcbbcbbcbbcbbb..', '.bbbbbbbbbbbbbbbb.', 'dddddddddddddddddd'], { b: '#7A4A26', c: '#A0703F', d: '#5A3519' })
    f(6, 9, 18, 1, t)
    stamp(f, 23, 1, ['.kkk.', 'k...k', 'k...k', 'k...k', '.kkk.'], { k: '#3A3A3C' }, 'it')
    f(24, 2, 3, 3, 'rgba(169,214,245,.7)', 'it'); f(25, 6, 1, 4, '#7A4A26', 'it'); f(24, 2, 1, 1, '#fff', 'gl')
  },
  // Careful: engineer in a hard hat; the wrench turns a bolt.
  careful: (f, t) => {
    crabBody(f)
    stamp(f, 6, 4, ['.....yyyyyyyy.....', '...yyyyyhhyyyyy...', '..yyyyyyhhyyyyyy..', '..yyyyyyhhyyyyyy..', '.yyyyyyyhhyyyyyyy.', 'dddddddddddddddddd'], { y: '#F5C542', h: '#FBE08A', d: '#C99A1E' })
    f(13, 5, 4, 2, t)
    stamp(f, 0, 10, ['.s.s', 'sss.', '.s..', '.s..'], { s: '#8E929A' }, 'it')
  },
  // Medium: chef, the toque traced from DockCrab's Sprites.chefHat; tosses the omelette.
  medium: (f, t) => {
    crabBody(f, -4, 'pan')
    stamp(f, 6, 0, ['........lll.......', '.......lllll......', '.wwwwgwwwwwwgwwwww', 'wwwwwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwwwww', 'wwwwwgwwwwwggwwwww', '.wwwwgwwwwwggwwwww', '.dddbbbbbbbbbbbbb.', '.dddbbbbbbbbbbbbb.', '.dddbbbbbbbbbbbbb.'], { w: '#F4F3EE', l: '#F7F6F2', g: '#D2D1C8', b: t, d: '#B45F43' })
    f(22, 8, 7, 2, '#4A4A48', 'pan'); f(26, 10, 1, 1, '#4A4A48', 'pan'); f(24, 7, 3, 1, '#F5B731', 'egg')
  },
  // Light: racer in a helmet; runs at double pace, the checkered flag flutters.
  light: (f, t) => {
    crabBody(f, -4)
    stamp(f, 6, 5, ['....rrrrrrrrrr....', '..rrrrrrwwrrrrrr..', '.rrrrrrrwwrrrrrrr.', '.rrrrrrrwwrrrrrrr.', '.rrrrrrrwwrrrrrrr.', '.kkkkkkkkkkkkkkkkr'], { r: t, w: '#F8F6F1', k: INK })
    f(25, 1, 1, 9, '#8E929A')
    stamp(f, 26, 1, ['wkwk', 'kwkw', 'wkwk'], { w: '#F8F6F1', k: INK }, 'flag')
  },
  // Explore: pirate scouting the code; the cutlass fences.
  explore: f => {
    crabBody(f)
    stamp(f, 5, 3, ['.kk..............kk.', '.kkk....kkkk....kkk.', '..kkkkkkkwwkkkkkkk..', '..kkkkkkkkkkkkkkkk..', '.gggggggggggggggggg.'], { k: '#55514C', w: '#F8F6F1', g: '#F5C542' })
    f(7, 11, 11, 1, INK); f(18, 11, 4, 3, INK)
    f(27, 6, 1, 9, '#C9CCD2', 'it'); f(26, 15, 3, 1, '#7A4A26', 'it')
  },
  other: f => crabBody(f),
}

const costumeOf = (type: string): string => (type === 'Explore' ? 'explore' : tierOf(type))

const CRAB_SCALE = 1.1

// Body and props nest inside `bd` so a prop rides the bob and adds its own motion;
// legs stay outside it and step on their own.
const crab = (x: number, y: number, costume: string, dim = false, isWalking = false, scale = CRAB_SCALE): string => {
  const groups = new Map<string, string[]>([['bd', []]])
  const f: Fill = (cx, cy, w, h, c, cls = 'bd') => {
    if (!groups.has(cls)) groups.set(cls, [])
    groups.get(cls)?.push(`<rect x="${cx}" y="${cy}" width="${w}" height="${h}" fill="${c}"/>`)
  }
  const draw = COSTUMES[costume] ?? ((g: Fill) => crabBody(g))
  draw(f, colorOf(costume))
  const group = (cls: string) => `<g class="${cls}">${(groups.get(cls) ?? []).join('')}</g>`
  const props = [...groups.keys()].filter(k => k !== 'bd' && k !== 'la' && k !== 'lb')
  const body = `<g class="bd">${(groups.get('bd') ?? []).join('')}${props.map(group).join('')}</g>`
  return `<g transform="translate(${x},${y}) scale(${scale})" opacity="${dim ? 0.45 : 1}" shape-rendering="crispEdges"><g class="c-${costume}${isWalking ? ' run' : ''}">${body}${group('la')}${group('lb')}</g></g>`
}

const statusMark = (x: number, y: number, status: string, color: string): string => {
  if (status === 'running') return `<circle class="live" cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`
  if (status === 'done') return `<path d="M${x - 5} ${y}l3.5 3.5 6.5-7" fill="none" stroke="#3B9C5F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
  if (status === 'failed') return `<path d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8" stroke="#D0453F" stroke-width="1.8" stroke-linecap="round"/>`
  return `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#9a9a96" stroke-width="1.4"/><path d="M${x} ${y - 2.5}v2.8l1.8 1.2" fill="none" stroke="#9a9a96" stroke-width="1.4" stroke-linecap="round"/>`
}

const svg = (W: number, H: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${PANE_CSS}${CRAB_CSS}${body}</svg>`

// The pane's own title already says "Agents": the header names the flow, if any,
// then the plan's windows and the crew's time as tiles.
const TILE_H = 62
const TILE_LOW = 44
const TIME_W = 78
const TILE_GAP = 6

type Header = { height: number; body: string }

const header = (W: number, title: string, windows: PlanWindow[], span: number | null, at: number): Header => {
  const s = tr()
  const top = title ? 28 : 0
  const parts: string[] = []
  if (title) parts.push(`<text class="t" x="0" y="15" font-family="${FONT}" font-size="14" font-weight="600">${xml(fitText(title, 14, W))}</text>`)
  const hasTime = span !== null
  const tileH = windows.length ? TILE_H : TILE_LOW
  const avail = W - (hasTime ? TIME_W + TILE_GAP : 0)
  const n = Math.max(1, windows.length)
  let cols = n
  while (cols > 1 && (avail - TILE_GAP * (cols - 1)) / cols < 180) cols--
  const rows = Math.ceil(n / cols)
  const tw = (avail - TILE_GAP * (cols - 1)) / cols
  const box = (x: number, y: number, w: number, h: number) => `<rect class="tile" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>`
  if (!windows.length) {
    parts.push(
      `${box(0, top, tw, tileH)}<text class="s" x="9" y="${top + 16}" font-family="${FONT}" font-size="11">${xml(s.planLabel)}</text>`,
      `<text class="m" x="9" y="${top + 33}" font-family="${FONT}" font-size="13">${xml(fitText(s.noReading, 13, tw - 18))}</text>`,
    )
  }
  windows.forEach((w, i) => {
    const x = (i % cols) * (tw + TILE_GAP)
    const y = top + Math.floor(i / cols) * (TILE_H + TILE_GAP)
    const level = levelOf(w)
    const color = LEVEL_COLOR[level]
    const barW = Math.max(10, tw - 18)
    const fillW = Math.round((barW * Math.min(100, usedOf(w))) / 100)
    const reset = resetText(s, w.resetsAt, at, tzOffsetMin)
    parts.push(
      `${box(x, y, tw, TILE_H)}<text class="s" x="${x + 9}" y="${y + 16}" font-family="${FONT}" font-size="11">${xml(nameOf(s, w.kind))}</text>`,
      `<text${level === 'ok' ? ' class="t"' : ` fill="${color}"`} x="${x + 9}" y="${y + 33}" font-family="${FONT}" font-size="13" font-weight="600" font-variant-numeric="tabular-nums">${xml(fitText(s.used(usedOf(w), leftOf(w)), 13, tw - 18))}</text>`,
      `<rect class="k" x="${x + 9}" y="${y + 40}" width="${barW}" height="4" rx="2"/><rect x="${x + 9}" y="${y + 40}" width="${fillW}" height="4" rx="2" fill="${color}"/>`,
      reset ? `<text class="m" x="${x + 9}" y="${y + 55}" font-family="${FONT}" font-size="10.5" font-variant-numeric="tabular-nums">${xml(fitText(reset, 10.5, tw - 18))}</text>` : '',
    )
  })
  if (hasTime) {
    const x = W - TIME_W
    parts.push(
      `${box(x, top, TIME_W, tileH)}<text class="s" x="${x + 9}" y="${top + 16}" font-family="${FONT}" font-size="11">${xml(s.time)}</text>`,
      `<text class="t" x="${x + 9}" y="${top + 34}" font-family="${FONT}" font-size="15" font-weight="600" font-variant-numeric="tabular-nums">${fmtTime(span ?? 0)}</text>`,
    )
  }
  const height = top + rows * tileH + (rows - 1) * TILE_GAP
  return { height, body: svg(W, height, parts.join('\n')) }
}

const planSummary = (windows: PlanWindow[], at: number): string => {
  const s = tr()
  if (!windows.length) return `${s.planLabel}: ${s.noReading}`
  return windows
    .map(w => {
      const reset = resetText(s, w.resetsAt, at, tzOffsetMin)
      return `${nameOf(s, w.kind)}: ${s.used(usedOf(w), leftOf(w))}${reset ? `, ${reset}` : ''}`
    })
    .join('; ')
}

// The task's own progress when the worker reports steps; a finished run is full.
const progressOf = (a: AgentRun): number | null => {
  if (a.status === 'done') return 1
  if (a.stepTotal) return Math.min(1, (a.stepDone ?? 0) / a.stepTotal)
  return null
}

const ctxOf = (a: AgentRun): number => (a.contextMax ? Math.min(100, Math.round((a.contextTokens / a.contextMax) * 100)) : 0)

const agentSvg = (W: number, a: AgentRun, at: number): string => {
  const s = tr()
  const tier = tierOf(a.type)
  const color = colorOf(tier)
  const ctx = ctxOf(a)
  const textW = W - 42 - 22
  const meta = [a.effort ? `${modelName(a.model)} · ${a.effort}` : modelName(a.model)]
  if (a.round > 1) meta.push(`${s.round} ${a.round}`)
  if (a.status === 'failed') meta.push(s.failed)
  const barW = textW
  const progress = progressOf(a)
  const stats = `ctx ${ctx}%  ·  ${fmtTime(elapsed(a, at))}`
  const steps = a.stepTotal ? `${a.stepDone ?? 0}/${a.stepTotal}${a.stepNote ? ' · ' + a.stepNote : ''}` : ''
  const stepsW = Math.max(0, barW - textWidth(stats, 11) - 12)
  // Without reported steps the bar falls back to the context, drawn grey.
  const fillW = Math.round(barW * (progress ?? ctx / 100))
  return svg(
    W,
    66,
    `${crab(0, 14, costumeOf(a.type), false, a.status === 'running')}
<text class="t" x="42" y="18" font-family="${FONT}" font-size="13" font-weight="600">${xml(fitText(a.description || a.type, 13, textW))}</text>
<text x="42" y="34" font-family="${FONT}" font-size="11"><tspan fill="${color}">${xml(tier === 'other' ? a.type : tier)}</tspan><tspan class="s">  ${xml(meta.join('  ·  '))}</tspan></text>
${steps && stepsW > 30 ? `<text class="t" x="42" y="49" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${xml(fitText(steps, 11, stepsW))}</text>` : ''}
<text class="s" x="${42 + barW}" y="49" text-anchor="end" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${stats}</text>
<rect class="k" x="42" y="55" width="${barW}" height="4" rx="2"/><rect${progress === null ? ' class="m"' : ''} x="42" y="55" width="${fillW}" height="4" rx="2"${progress === null ? '' : ` fill="${color}"`}/>
${statusMark(W - 8, 16, a.status, color)}
<line class="ln" x1="0" y1="65.5" x2="${W}" y2="65.5"/>`,
  )
}

const plannedSvg = (W: number, p: Planned): string => {
  const tier = p.tier in TIER_COLOR ? p.tier : 'other'
  const color = colorOf(tier)
  const textW = W - 42 - 22
  const meta = [TIER_MODEL[tier] ?? '']
  if (p.after.length) meta.push(`${tr().after} ${p.after.join(', ')}`)
  return svg(
    W,
    46,
    `${crab(0, 6, tier, true)}
<text class="s" x="42" y="18" font-family="${FONT}" font-size="13" font-weight="600">${xml(fitText(`${p.n}. ${p.title}`, 13, textW))}</text>
<text x="42" y="34" font-family="${FONT}" font-size="11"><tspan fill="${color}">${xml(tier)}</tspan><tspan class="m">  ${xml(meta.filter(Boolean).join('  ·  '))}</tspan></text>
${statusMark(W - 8, 16, 'planned', color)}
<line class="ln" x1="0" y1="45.5" x2="${W}" y2="45.5"/>`,
  )
}

const compactSvg = (W: number, list: AgentRun[], planned: Planned[], tail: string): string => {
  const icons = [
    ...list.filter(a => a.status === 'running').map(a => ({ k: costumeOf(a.type), c: colorOf(tierOf(a.type)), s: 'running', dim: false })),
    ...list.filter(a => a.status !== 'running').map(a => ({ k: costumeOf(a.type), c: colorOf(tierOf(a.type)), s: a.status, dim: false })),
    ...planned.map(p => ({ k: p.tier in TIER_COLOR ? p.tier : 'other', c: colorOf(p.tier), s: 'planned', dim: true })),
  ]
  const fit = Math.max(1, Math.floor((W - 150) / 36))
  const shown = icons.slice(0, fit)
  const more = icons.length - shown.length
  const body = shown
    .map((ic, i) => crab(i * 36, 0, ic.k, ic.dim, ic.s === 'running') + (ic.s === 'running' ? `<circle class="live" cx="${i * 36 + 32}" cy="4" r="3" fill="${ic.c}"/>` : ''))
    .join('')
  const x = shown.length * 36 + (more ? 4 : 0)
  return svg(
    W,
    32,
    `${body}${more ? `<text class="s" x="${x}" y="21" font-family="${FONT}" font-size="12">+${more}</text>` : ''}
<text class="s" x="${W}" y="21" text-anchor="end" font-family="${FONT}" font-size="12" font-variant-numeric="tabular-nums">${xml(tail)}</text>`,
  )
}

// --- terminal drawing: the same rows in text.

const ctxBar = (pct: number, width: number): string => {
  const filled = Math.max(0, Math.min(width, Math.round((width * pct) / 100)))
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

const STATUS_GLYPH: Record<string, string> = { running: '●', done: '✓', failed: '✗', planned: '◷' }

// The plan's windows, freshest first: the engine's own reading, else the last one kept.
async function windowsNow($: EngineInterface): Promise<PlanWindow[]> {
  try {
    const fresh = cleanWindows((await $.session.usage()).rateLimits)
    if (fresh.length) return fresh
  } catch {
    // No reading: keep what the last measurement left.
  }
  return (await read($, plan)).windows
}

async function refreshPlan($: EngineInterface): Promise<void> {
  try {
    const usage = await $.session.usage()
    const windows = cleanWindows(usage.rateLimits)
    await update($, plan, prev => ({
      windows: windows.length ? windows : prev.windows,
      contextWindow: usage.context.window || prev.contextWindow,
    }))
  } catch {
    // Off a subscription or before the first response: nothing to keep.
  }
}

// One line under the prompt: the plan's windows, and the flow's bar while one runs.
async function syncStatus($: EngineInterface): Promise<void> {
  const s = tr()
  const { windows } = await read($, plan)
  const f = await read($, flow)
  const isHidden = await read($, isBandHidden)
  const parts: string[] = []
  if (windows.length) parts.push(statusLine(s, windows))
  if (f && !f.isFinished && !isHidden) {
    const ratio = planRatio(f)
    parts.push(ratio === null ? progressText(s, f) : `${barText(ratio, 8)} ${progressText(s, f)}`)
  }
  const text = parts.length ? parts.join(' · ') : undefined
  if (text === lastStatus) return
  lastStatus = text
  $.ui.status(text)
}

// A toast the first time a window crosses 80% and 90%; kept in the store so a new session stays quiet.
async function warnPlan($: EngineInterface, windows: PlanWindow[]): Promise<void> {
  if (!windows.length) return
  const s = tr()
  const at = await $.clock.now()
  const toasts: string[] = []
  const memo = await update($, warned, prev => {
    const nextMemo: Warned = { ...prev }
    toasts.length = 0
    for (const w of windows) {
      const step = warnStep(w, prev[w.kind])
      nextMemo[w.kind] = step.memo
      if (step.fire) toasts.push(warnText(s, w, at, tzOffsetMin))
    }
    return nextMemo
  })
  for (const text of toasts) $.ui.toast(text, { timeoutMs: 8000 })
  if (toasts.length) {
    try {
      await $.store.set(WARNED_KEY, memo)
    } catch {
      // The session's own memory still holds it.
    }
  }
}

async function loadWarned($: EngineInterface): Promise<void> {
  try {
    const kept = await $.store.get(WARNED_KEY)
    if (kept && typeof kept === 'object' && !Array.isArray(kept)) {
      await update($, warned, prev => ({ ...(kept as Warned), ...prev }))
    }
  } catch {
    // Nothing kept yet.
  }
}

// Opens the agents pane, or closes it when it is up; true when it ends up open.
async function togglePane($: EngineInterface): Promise<boolean> {
  const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
  if (isOpen) {
    await $.ui.close({ id: PANE })
    return false
  }
  const at = await $.clock.now()
  await update($, now, () => at)
  await $.ui.open({ id: PANE, title: tr().pane })
  return true
}

async function reconcile($: EngineInterface): Promise<void> {
  let live: LiveAgent[] | undefined
  try {
    live = (await $.agent.list()).map(a => ({ id: a.id, status: a.status }))
  } catch {
    live = undefined
  }
  const at = await $.clock.now()
  if (settle(await read($, agents), live, at) === (await read($, agents))) return
  await update($, agents, list => settle(list, live, at))
  await update($, now, () => at)
}

async function autoOpen($: EngineInterface, key: string): Promise<void> {
  const p = await read($, panel)
  if (p.autoOpenedFor === key) return
  await update($, panel, prev => ({ ...prev, autoOpenedFor: key }))
  const at = await $.clock.now()
  await update($, now, () => at)
  void $.ui.open({ id: PANE, title: tr().pane })
}

export const register: Register = (on, options) => {
  lang = fixedLang(options.language) ?? lang

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await useLang($)
    lang = await detectLang($, options.language)
    await update($, langState, () => lang)
    tzOffsetMin = await detectOffset($)
    lastStatus = undefined
    await $.tool.register({
      name: 'progress',
      description:
        'Report /savvy-flow progress to the progress bar above the prompt and the agents panel. ' +
        'Call it after presenting the plan (title, total, tasks, phase "delegate"), each time a task is accepted (done), ' +
        'when switching phase or re-planning (tasks), and once at the end with finished: true. Fields left out keep their previous value.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short name of the overall task, a few words.' },
          total: { type: 'integer', minimum: 0, description: 'Number of planned worker tasks.' },
          done: { type: 'integer', minimum: 0, description: 'Number of tasks accepted after review.' },
          phase: { type: 'string', enum: [...PHASES] },
          finished: { type: 'boolean', description: 'True once the flow is closed.' },
          tasks: {
            type: 'array',
            description:
              'The planned worker tasks in order, numbered from 1. Each title must equal the Agent tool `description` the task will be delegated with, so the panel can match runs to tasks.',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'A few words; reused verbatim as the Agent description.' },
                tier: { type: 'string', enum: ['fable', 'heavy', 'careful', 'medium', 'light'] },
                after: { type: 'array', items: { type: 'integer' }, description: 'Numbers of the tasks this one waits for.' },
              },
              required: ['title', 'tier'],
            },
          },
        },
      },
    })
    await $.tool.register({
      name: 'step',
      description:
        'For savvy-flow workers: report progress on your own task to the agents panel. ' +
        'Right after reading the brief, call it with `total` (your plan in 3-8 steps) and `done: 0`; ' +
        'call it again as each step finishes. Cheap and silent: it only draws a bar.',
      inputSchema: {
        type: 'object',
        properties: {
          done: { type: 'integer', minimum: 0, description: 'Steps finished so far.' },
          total: { type: 'integer', minimum: 1, description: 'Steps planned; may change if the plan changes.' },
          note: { type: 'string', description: 'The step in progress, a few words.' },
        },
        required: ['done'],
      },
    })
    await $.command.register({
      name: 'agents-info',
      description: 'Show or hide the panel of subagents and plan usage: running, finished and planned, with model, context and time',
    })

    const startedAt = await $.clock.now()
    await update($, now, () => startedAt)
    await loadWarned($)
    await refreshPlan($)
    await warnPlan($, (await read($, plan)).windows)
    await reconcile($)
    await syncStatus($)

    // Ticks the running agents' clocks every second; idle, twice a minute for the reset countdowns.
    let idle = 0
    let ticks = 0
    $.clock.every(1000, () => {
      void (async () => {
        ticks += 1
        const list = await read($, agents)
        const isRunning = list.some(a => a.status === 'running')
        if (isRunning && ticks % 5 === 0) await reconcile($)
        idle = isRunning ? 0 : idle + 1
        if (!isRunning && idle % 30 !== 0) return
        const at = await $.clock.now()
        await update($, now, () => at)
      })().catch(() => undefined)
    })
    return started
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits') || e.changed.includes('context')) {
      const windows = cleanWindows(e.rateLimits)
      await update($, plan, prev => ({
        windows: e.changed.includes('rateLimits') ? windows : prev.windows,
        contextWindow: e.context.window || prev.contextWindow,
      }))
      if (e.changed.includes('rateLimits')) {
        await warnPlan($, windows)
        await syncStatus($)
      }
    }
    return next(e)
  })

  on('command.run', { command: 'agents-info' }, async $ => {
    const isOpen = await togglePane($)
    if (isOpen) void refreshPlan($)
    return { text: isOpen ? tr().opened : tr().closed }
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const input = e as unknown as ProgressInput
    const prev = await read($, flow)
    const isNew = isNewFlow(prev, input)
    if (isNew && input.title !== undefined) {
      // A new flow starts with a clean list; agents still running stay.
      await update($, agents, list => list.filter(a => a.status === 'running'))
    }
    if (isNew) await update($, isBandHidden, () => false)
    const at = await $.clock.now()
    const next = await update($, flow, p => merge(p, input, at))
    if (next && input.tasks?.length) await autoOpen($, next.title)
    if (next?.isFinished) {
      $.clock.after(FINISHED_MS + 250, () => {
        void $.clock
          .now()
          .then(t => update($, now, () => t))
          .catch(() => undefined)
      })
    }
    await syncStatus($)
    return { result: `ok: ${progressText(tr(), next ?? blank())}` }
  })

  // A worker's own progress: the call runs in the worker's loop, so agentId names it.
  on('tool.call', { tool: STEP_TOOL }, async ($, e) => {
    const input = e as unknown as { done?: number; total?: number; note?: string }
    const agentId = e.agentId
    if (!agentId) return { result: 'ignored: only subagents report steps' }
    await update($, agents, list =>
      list.map(a => {
        if (a.agentId !== agentId) return a
        const total = Math.max(0, Math.round(input.total ?? a.stepTotal ?? 0))
        const done = Math.max(0, Math.round(input.done ?? a.stepDone ?? 0))
        return { ...a, stepTotal: total, stepDone: total ? Math.min(total, done) : done, stepNote: input.note?.trim() || undefined }
      }),
    )
    return { result: 'ok' }
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (started.deny !== undefined) return started

    const at = await $.clock.now()
    const { contextWindow } = await read($, plan)
    await update($, agents, list => {
      const round = 1 + list.filter(a => norm(a.description) === norm(e.description) && e.description).length
      const run: AgentRun = {
        id: started.agentId ?? e.tool_use_id,
        agentId: started.agentId,
        type: e.subagentType,
        description: e.description,
        model: started.model,
        status: 'running',
        startedAt: at,
        lastAt: at,
        contextTokens: 0,
        contextMax: windowOf(started.model, contextWindow),
        round,
      }
      return [...list.filter(a => a.id !== run.id), run].slice(-200)
    })
    await update($, now, () => at)
    if (isSavvy(e.subagentType)) {
      const f = await update($, flow, (prev): Flow | null => (prev && !prev.isFinished && prev.phase === 'plan' ? { ...prev, phase: 'delegate' } : prev))
      await autoOpen($, f && !f.isFinished ? f.title : 'savvy-flow')
      await syncStatus($)
    }
    return started
  })

  // Each model request of a subagent: its live context.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const agentId = e.agentId
    const usage = result.usage
    if (!agentId || !usage) return result

    const model = usage.model || e.model
    const { contextWindow } = await read($, plan)
    const at = await $.clock.now()
    await update($, agents, list =>
      list.map(a =>
        a.agentId !== agentId
          ? a
          : {
              ...a,
              model,
              effort: typeof e.effort === 'string' ? e.effort : a.effort,
              status: 'running',
              lastAt: at,
              endedAt: undefined,
              contextTokens:
                (usage.input_tokens || 0) +
                (usage.cache_read_input_tokens || 0) +
                (usage.cache_creation_input_tokens || 0) +
                (usage.output_tokens || 0),
              contextMax: windowOf(model, contextWindow),
            },
      ),
    )
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const agentId = e.agentId
    if (agentId) {
      const at = await $.clock.now()
      await update($, agents, list =>
        list.map(a =>
          a.agentId !== agentId
            ? a
            : {
                ...a,
                model: e.usage?.model || a.model,
                status: e.reason === 'answer' ? 'done' : 'failed',
                endedAt: at,
              },
        ),
      )
      await update($, now, () => at)
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    await useLang($)
    const s = tr()
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const list = await read($, agents)
    const f = await read($, flow)
    const p: Panel = await read($, panel)
    const at = Math.max(await read($, now), await $.clock.now(), ...list.map(a => a.startedAt))
    const windows = await windowsNow($)

    const running = list.filter(a => a.status === 'running').sort(byStart)
    const finished = list.filter(a => a.status !== 'running').sort(byStart)
    const planned = plannedOf(f, list)
    const span = spanOf(list, at)
    // The pane's title says "Agents"; inside, only the flow's own name.
    const title = f && !f.isFinished ? f.title : ''

    const toggleCompact = (
      <Button
        key="compact"
        label={p.isCompact ? s.expand : s.collapse}
        plain
        onPress={() => update($, panel, prev => ({ ...prev, isCompact: !prev.isCompact }))}
      />
    )
    const toggleDone = (
      <Button
        key="done"
        label={`${p.isDoneCollapsed ? '▸' : '▾'} ${s.finished} · ${finished.length}`}
        plain
        onPress={() => update($, panel, prev => ({ ...prev, isDoneCollapsed: !prev.isDoneCollapsed }))}
      />
    )
    const isEmpty = list.length === 0 && planned.length === 0
    const timeText = span === null ? '' : `${s.time} ${fmtTime(span)}`
    const summary = [planSummary(windows, at), timeText].filter(Boolean).join('; ')
    const shortPlan = windows.length ? statusLine(s, windows) : `${s.planLabel}: ${s.noReading}`

    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(240, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
      const section = (key: string, text: string) => (
        <Text key={key} dimColor>
          {text}
        </Text>
      )

      if (p.isCompact) {
        const tail = [shortPlan, span === null ? '' : fmtTime(span)].filter(Boolean).join(' · ')
        return (
          <Box flexDirection="column" gap={1}>
            <Svg source={compactSvg(W, list, planned, tail)} alt={`${list.length} ${s.agentsCount}; ${summary}`} width={W} height={32} />
            {toggleCompact}
          </Box>
        )
      }
      const head = header(W, title, windows, span, at)
      return (
        <Box flexDirection="column">
          <Svg source={head.body} alt={title ? `${title}: ${summary}` : summary} width={W} height={head.height} />
          {toggleCompact}
          {isEmpty && <Text dimColor>{s.empty}</Text>}
          {running.length > 0 && section('h-run', `${s.running} · ${running.length}`)}
          {running.map(a => (
            <Svg key={a.id} source={agentSvg(W, a, at)} alt={`${a.description}: ${modelName(a.model)}, ${s.isRunning}`} width={W} height={66} />
          ))}
          {finished.length > 0 && toggleDone}
          {!p.isDoneCollapsed &&
            finished.map(a => (
              <Svg key={a.id} source={agentSvg(W, a, at)} alt={`${a.description}: ${modelName(a.model)}, ${s.isFinished}`} width={W} height={66} />
            ))}
          {planned.length > 0 && section('h-plan', `${s.planned} · ${planned.length}`)}
          {planned.map(pl => (
            <Svg key={`plan-${pl.n}`} source={plannedSvg(W, pl)} alt={`${pl.n}. ${pl.title}: ${s.isPlanned}`} width={W} height={46} />
          ))}
        </Box>
      )
    }

    // Terminal: the same content in text rows.
    const cols = Math.max(24, e.props.bodyColumns || 40)
    const barW = Math.max(6, Math.min(20, cols - 34))
    const planW = Math.max(6, Math.min(16, cols - 40))
    const row = (a: AgentRun) => {
      const tier = tierOf(a.type)
      const color = colorOf(tier)
      const ctx = ctxOf(a)
      const progress = progressOf(a)
      const model = a.effort ? `${modelName(a.model)} · ${a.effort}` : modelName(a.model)
      const steps = a.stepTotal ? `${a.stepDone ?? 0}/${a.stepTotal}${a.stepNote ? ' ' + a.stepNote : ''} · ` : ''
      return (
        <Box key={a.id} flexDirection="column" marginBottom={1}>
          <Box flexDirection="row" gap={1}>
            <Text color={color}>▣</Text>
            <Text bold wrap="truncate-end">
              {a.description || a.type}
            </Text>
            <Text color={a.status === 'failed' ? 'red' : a.status === 'done' ? 'green' : color}>{STATUS_GLYPH[a.status]}</Text>
          </Box>
          <Text dimColor wrap="truncate-end">
            {'  '}
            {tier === 'other' ? a.type : tier} · {model}
            {a.round > 1 ? ` · ${s.round} ${a.round}` : ''}
            {a.status === 'failed' ? ` · ${s.failed}` : ''}
          </Text>
          <Text wrap="truncate-end">
            {'  '}
            {progress === null ? <Text dimColor>{ctxBar(ctx, barW)}</Text> : <Text color={color}>{ctxBar(progress * 100, barW)}</Text>}
            <Text dimColor>
              {' '}
              {steps}ctx {ctx}% · {fmtTime(elapsed(a, at))}
            </Text>
          </Text>
        </Box>
      )
    }
    const nameW = Math.max(...windows.map(w => nameOf(s, w.kind).length), 0) + 1

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold wrap="truncate-end">
            {title}
          </Text>
          {toggleCompact}
        </Box>
        {windows.length === 0 && (
          <Text dimColor wrap="truncate-end">
            {s.planLabel}: {s.noReading}
          </Text>
        )}
        {!p.isCompact &&
          windows.map(w => {
            const color = LEVEL_COLOR[levelOf(w)]
            const reset = resetText(s, w.resetsAt, at, tzOffsetMin)
            return (
              <Text key={`win-${w.kind}`} wrap="truncate-end">
                <Text dimColor>{nameOf(s, w.kind).padEnd(nameW)}</Text>
                <Text color={color}>{ctxBar(Math.min(100, usedOf(w)), planW)}</Text> {levelOf(w) === 'ok' ? s.used(usedOf(w), leftOf(w)) : <Text color={color}>{s.used(usedOf(w), leftOf(w))}</Text>}
                {reset ? <Text dimColor> · {reset}</Text> : ''}
              </Text>
            )
          })}
        {p.isCompact && windows.length > 0 && (
          <Text dimColor wrap="truncate-end">
            {shortPlan}
          </Text>
        )}
        {timeText !== '' && <Text dimColor>{timeText}</Text>}
        {p.isCompact ? (
          <Text wrap="truncate-end">
            {[...running, ...finished].map(a => (
              <Text key={a.id} color={colorOf(tierOf(a.type))}>
                {STATUS_GLYPH[a.status]}{' '}
              </Text>
            ))}
            {planned.map(pl => (
              <Text key={`plan-${pl.n}`} dimColor>
                ◷{' '}
              </Text>
            ))}
          </Text>
        ) : (
          <Box flexDirection="column" marginTop={1}>
            {isEmpty && <Text dimColor>{s.empty}</Text>}
            {running.length > 0 && <Text dimColor>{s.running} · {running.length}</Text>}
            {running.map(row)}
            {finished.length > 0 && toggleDone}
            {!p.isDoneCollapsed && finished.map(row)}
            {planned.length > 0 && <Text dimColor>{s.planned} · {planned.length}</Text>}
            {planned.map(pl => {
              const tier = pl.tier in TIER_COLOR ? pl.tier : 'other'
              return (
                <Box key={`plan-${pl.n}`} flexDirection="column" marginBottom={1}>
                  <Text dimColor wrap="truncate-end">
                    <Text color={colorOf(tier)}>▢</Text> {pl.n}. {pl.title} ◷
                  </Text>
                  <Text dimColor wrap="truncate-end">
                    {'  '}
                    {tier} · {TIER_MODEL[tier] ?? ''}
                    {pl.after.length ? ` · ${s.after} ${pl.after.join(', ')}` : ''}
                  </Text>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    await useLang($)
    const s = tr()
    const f = await read($, flow)
    const list = await read($, agents)
    const at = Math.max(await read($, now), await $.clock.now())
    const band = bandOf(s, f, list, await read($, isBandHidden), at)
    if (band.kind === 'hidden') return next(e)

    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const crewLabel = list.length ? `${s.pane} · ${list.length}` : s.pane
    const crewButton = <Button key="savvy-agents" label={crewLabel} plain onPress={() => void togglePane($)} />
    const dismiss = (
      <Button
        key="savvy-dismiss"
        label="✕"
        plain
        role="dismiss"
        onPress={async () => {
          await update($, isBandHidden, () => true)
          await syncStatus($)
        }}
      />
    )
    const ratio = band.kind === 'crew' ? null : band.ratio
    const percent = ratio === null ? '' : `${Math.round(ratio * 100)}%`
    const title = band.kind === 'crew' ? '' : band.title
    const alt = [title ? `${title}: ${band.label}` : band.label, percent].filter(Boolean).join(', ')
    const lead = band.kind === 'finished' ? null : band.lead
    const color = band.kind === 'finished' ? DONE : ACCENT

    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      // About 8 CSS px per reported column; the rest is the panel button, the dismiss
      // and their gaps. No floor above the slot: a row wider than it would wrap.
      const width = Math.max(180, Math.min(1600, (e.props.bodyColumns || 100) * 8 - 56 - crewLabel.length * 8))
      return (
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Svg source={bandSvg(band, f?.total ?? 0, f?.done ?? 0, width)} alt={alt} width={width} height={H} />
          {crewButton}
          {dismiss}
        </Box>
      )
    }

    const cols = e.props.bodyColumns
    const crab = lead ? <Text color={colorOf(tierOf(lead.type))}>▣</Text> : <Text color={CLAY} dimColor={band.kind !== 'finished'}>▣</Text>
    const tail = crewLabel.length + 5 + (percent ? percent.length + 1 : 0)
    const avail = cols - tail - 2
    const text = fitLine(avail, band.label, band.short)
    if (band.kind === 'crew') {
      return (
        <Box flexDirection="row" gap={1}>
          <Text>
            <Text color={color}>● </Text>
            <Text bold>{text}</Text>
          </Text>
          {crab}
          {crewButton}
          {dismiss}
        </Box>
      )
    }
    const room = avail - [...text].length
    const hasBar = ratio !== null && room >= 18
    const titleRoom = hasBar ? Math.min(30, Math.floor((room - 2) * 0.45)) : room - 3
    const shownTitle = titleRoom >= 4 ? cut(band.title, titleRoom) : ''
    const width = Math.max(6, Math.min(40, room - [...shownTitle].length - 2))
    return (
      <Box flexDirection="row" gap={1}>
        <Text>
          <Text color={color}>● </Text>
          {shownTitle ? <Text>{hasBar ? shownTitle : `${shownTitle} ·`}</Text> : null}
        </Text>
        {hasBar && ratio !== null && <Text color={color}>{barText(ratio, width)}</Text>}
        <Text bold wrap="truncate-end">
          {text}
        </Text>
        {percent !== '' && <Text dimColor>{percent}</Text>}
        {crab}
        {crewButton}
        {dismiss}
      </Box>
    )
  })
}
