import { describe, expect, test } from 'claude-code/testing'

import { STRINGS, cleanWindows, fmtSpan, langOf, leftOf, levelOf, parseOffset, pickLang, resetText, statusLine, usedOf, warnStep, warnText } from '../hooks/usage'

const pt = STRINGS.pt
const en = STRINGS.en
const NOW = Date.parse('2026-10-13T12:00:00Z')
const BRT = -180

describe('percentages', () => {
  test('used is floored and left adds up to 100', () => {
    expect(usedOf({ kind: 'five_hour', percentUsed: 23.5 })).toBe(23)
    expect(leftOf({ kind: 'five_hour', percentUsed: 23.5 })).toBe(77)
    expect(pt.used(23, 77)).toBe('usado 23% · restam 77%')
  })
  test('an exceeded spend limit leaves nothing, never a negative', () => {
    expect(leftOf({ kind: 'spend_limit', percentUsed: 104 })).toBe(0)
    expect(usedOf({ kind: 'spend_limit', percentUsed: 104 })).toBe(104)
  })
  test('the status line is short and ordered 5h, week, spend', () => {
    const windows = cleanWindows([
      { kind: 'seven_day', percentUsed: 41 },
      { kind: 'spend_limit', percentUsed: 12 },
      { kind: 'five_hour', percentUsed: 23.4 },
    ])
    expect(statusLine(pt, windows)).toBe('5h 23% · Sem 41% · Gasto 12%')
    expect(statusLine(en, windows)).toBe('5h 23% · Wk 41% · Spend 12%')
  })
  test('malformed windows are dropped, not zeroed', () => {
    expect(cleanWindows(undefined)).toEqual([])
    expect(cleanWindows([{ kind: 'five_hour' }, { percentUsed: 3 }, null])).toEqual([])
  })
})

describe('levels', () => {
  test('normal below 70, attention 70 to 89, critical from 90', () => {
    expect(levelOf({ kind: 'five_hour', percentUsed: 69.9 })).toBe('ok')
    expect(levelOf({ kind: 'five_hour', percentUsed: 70 })).toBe('warn')
    expect(levelOf({ kind: 'five_hour', percentUsed: 89.9 })).toBe('warn')
    expect(levelOf({ kind: 'five_hour', percentUsed: 90 })).toBe('crit')
  })
})

describe('relative times', () => {
  test('hours and minutes under a day', () => {
    expect(fmtSpan(pt, (2 * 60 + 10) * 60_000 + 30_000)).toBe('2 h 10 min')
    expect(fmtSpan(pt, 3 * 3_600_000)).toBe('3 h')
    expect(fmtSpan(pt, 45 * 60_000)).toBe('45 min')
    expect(fmtSpan(pt, 20_000)).toBe('< 1 min')
  })
  test('a reset under a day is relative, past a day it is weekday and local time', () => {
    const soon = new Date(NOW + 80 * 60_000).toISOString()
    expect(resetText(pt, soon, NOW, BRT)).toBe('reinicia em 1 h 20 min')
    expect(resetText(pt, '2026-10-15T17:00:00Z', NOW, BRT)).toBe('reinicia qui às 14:00')
    expect(resetText(en, '2026-10-15T17:00:00Z', NOW, BRT)).toBe('resets Thu 14:00')
    expect(resetText(pt, '2026-10-13T11:00:00Z', NOW, BRT)).toBe('reinicia agora')
    expect(resetText(pt, undefined, NOW, BRT)).toBe('')
  })
  test('the zone offset parses from date +%z', () => {
    expect(parseOffset('-0300\n')).toBe(-180)
    expect(parseOffset('+0530')).toBe(330)
    expect(parseOffset('nope')).toBeUndefined()
  })
})

describe('warnings', () => {
  const at = (pct: number, resetsAt = '2026-10-13T15:00:00Z') => ({ kind: 'five_hour', percentUsed: pct, resetsAt })
  test('each threshold fires once per window', () => {
    let memo = warnStep(at(79), undefined).memo
    const a = warnStep(at(81), memo)
    expect(a.fire).toBe(80)
    memo = a.memo
    const b = warnStep(at(85), memo)
    expect(b.fire).toBe(0)
    const c = warnStep(at(90.2), b.memo)
    expect(c.fire).toBe(90)
    expect(warnStep(at(97), c.memo).fire).toBe(0)
  })
  test('a jump past both thresholds fires one toast', () => {
    expect(warnStep(at(93), undefined).fire).toBe(90)
  })
  test('a new window starts over', () => {
    const memo = warnStep(at(95), undefined).memo
    expect(warnStep(at(12, '2026-10-13T20:00:00Z'), memo).fire).toBe(0)
    const fresh = warnStep(at(12, '2026-10-13T20:00:00Z'), memo).memo
    expect(warnStep(at(82, '2026-10-13T20:00:00Z'), fresh).fire).toBe(80)
  })
  test('the toast names the window and when it resets', () => {
    const w = { kind: 'five_hour', percentUsed: 90, resetsAt: new Date(NOW + 80 * 60_000).toISOString() }
    expect(warnText(pt, w, NOW, BRT)).toBe('Limite de 5 h em 90% — reinicia em 1 h 20 min')
  })
})

describe('language', () => {
  test('portuguese locales and settings pick pt', () => {
    expect(langOf('pt_BR.UTF-8')).toBe('pt')
    expect(langOf('português')).toBe('pt')
    expect(langOf('Brazilian Portuguese')).toBe('pt')
    expect(langOf('ru_RU.UTF-8')).toBe('ru')
    expect(langOf('en_BR')).toBe('pt')
    expect(langOf('en-BR')).toBe('pt')
    expect(langOf('en_BR.UTF-8')).toBe('pt')
    expect(langOf('en_US.UTF-8')).toBe('en')
    expect(langOf('en_GB')).toBe('en')
    expect(langOf('C')).toBeUndefined()
  })
  test('auto: a Brazilian or Portuguese locale wins, a set language wins over the locale', () => {
    expect(pickLang(undefined, ['', undefined, 'en_BR\n'])).toBe('pt')
    expect(pickLang(undefined, ['en_US.UTF-8', undefined, 'en_BR'])).toBe('pt')
    expect(pickLang(undefined, [undefined, 'pt_PT.UTF-8'])).toBe('pt')
    expect(pickLang(undefined, ['ru_RU.UTF-8'])).toBe('ru')
    expect(pickLang(undefined, ['en_US.UTF-8', 'C'])).toBe('en')
    expect(pickLang(undefined, [])).toBe('en')
    expect(pickLang('english', ['en_BR'])).toBe('en')
    expect(pickLang('Português', ['en_US'])).toBe('pt')
    expect(pickLang('japanese', ['en_BR'])).toBe('pt')
  })
  test('the band words agree in number in every language', () => {
    expect(STRINGS.pt.helpers(1)).toBe('1 ajudante rodando')
    expect(STRINGS.pt.helpers(3)).toBe('3 ajudantes rodando')
    expect(STRINGS.pt.finishedN(1)).toBe('1 concluído')
    expect(STRINGS.pt.finishedN(2)).toBe('2 concluídos')
    expect(STRINGS.pt.runningN(2)).toBe('2 rodando')
    expect(STRINGS.en.helpers(1)).toBe('1 helper running')
    expect(STRINGS.en.helpers(2)).toBe('2 helpers running')
    expect(STRINGS.ru.helpers(1)).toBe('1 помощник в работе')
    expect(STRINGS.ru.helpers(3)).toBe('3 помощника в работе')
    expect(STRINGS.ru.helpers(5)).toBe('5 помощников в работе')
    expect(STRINGS.ru.helpers(12)).toBe('12 помощников в работе')
    expect(STRINGS.ru.helpers(21)).toBe('21 помощник в работе')
  })
  test('every language has every key', () => {
    const keys = Object.keys(STRINGS.en).sort()
    expect(Object.keys(STRINGS.pt).sort()).toEqual(keys)
    expect(Object.keys(STRINGS.ru).sort()).toEqual(keys)
  })
})
