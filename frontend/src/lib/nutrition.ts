import type { LogEntry } from '../types'
import { normalizeRecommendationLines } from './five-groups'
import { dateKey } from './dates'

export function dailyTotals(key: string, logsByDate: Record<string, LogEntry[]>) {
  const entries = logsByDate[key] || []
  let calories = 0
  let protein = 0
  let carbs = 0
  let fat = 0
  for (const e of entries) {
    if (e.nutrition) {
      calories += e.nutrition.calories || 0
      protein += e.nutrition.protein || 0
      carbs += e.nutrition.carbs || 0
      fat += e.nutrition.fat || 0
    }
  }
  return { calories, protein, carbs, fat, entries: entries.length }
}

export function aggregateDailyMicronutrients(key: string, logsByDate: Record<string, LogEntry[]>) {
  const vit = new Set<string>()
  const min = new Set<string>()
  for (const e of logsByDate[key] || []) {
    if (!e.nutrition) continue
    for (const x of e.nutrition.vitamins || []) {
      const t = String(x || '').trim()
      if (t) vit.add(t)
    }
    for (const x of e.nutrition.minerals || []) {
      const t = String(x || '').trim()
      if (t) min.add(t)
    }
  }
  return { vitamins: [...vit], minerals: [...min] }
}

function normAdviceLine(s: string): string {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Pull markdown bullets from a Gemini explanation block that contains `needle` (Thai section title). */
function extractSectionBullets(text: string, needle: string): string[] {
  const blocks = text.split(/\n\n+/)
  for (const block of blocks) {
    if (!block.includes(needle)) continue
    const lines = block.split('\n')
    const out: string[] = []
    for (let i = 1; i < lines.length; i++) {
      const l = lines[i].trim()
      if (!l) continue
      const m = l.match(/^[-•]\s*(.+)$/)
      if (m) out.push(m[1].trim())
    }
    return out
  }
  return []
}

export type DailyAdviceSections = {
  recommendations: string[]
  benefits: string[]
  warnings: string[]
}

/** One meal's advice (from structured fields + parsed Gemini sections). */
export function adviceSectionsForEntry(e: LogEntry): DailyAdviceSections {
  const g = e.gemini_explanation || ''
  return {
    recommendations: normalizeRecommendationLines(e.mealRecommendations),
    benefits: extractSectionBullets(g, 'ประโยชน์ที่ได้รับ'),
    warnings: extractSectionBullets(g, 'ข้อควรระวัง'),
  }
}

export function adviceHasAnyContent(s: DailyAdviceSections): boolean {
  return (
    s.recommendations.length > 0 || s.benefits.length > 0 || s.warnings.length > 0
  )
}

/** Meals for the day, oldest → newest (ช่วงเวลามื้อ). */
export function dayEntriesChronological(
  key: string,
  logsByDate: Record<string, LogEntry[]>,
): LogEntry[] {
  const arr = [...(logsByDate[key] || [])]
  arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  return arr
}

/** Aggregates recommendations plus benefit/warning bullets from each meal's Gemini text for the Advice tab. */
export function collectDailyAdviceSections(
  key: string,
  logsByDate: Record<string, LogEntry[]>,
): DailyAdviceSections {
  const seenR = new Set<string>()
  const seenB = new Set<string>()
  const seenW = new Set<string>()
  const recommendations: string[] = []
  const benefits: string[] = []
  const warnings: string[] = []

  function pushUnique(arr: string[], seen: Set<string>, raw: string) {
    const t = normAdviceLine(raw)
    if (!t || seen.has(t)) return
    seen.add(t)
    arr.push(t)
  }

  for (const e of logsByDate[key] || []) {
    const s = adviceSectionsForEntry(e)
    for (const line of s.recommendations) {
      pushUnique(recommendations, seenR, line)
    }
    for (const line of s.benefits) {
      pushUnique(benefits, seenB, line)
    }
    for (const line of s.warnings) {
      pushUnique(warnings, seenW, line)
    }
  }

  return { recommendations, benefits, warnings }
}

export function collectDailyAdviceLines(key: string, logsByDate: Record<string, LogEntry[]>) {
  return collectDailyAdviceSections(key, logsByDate).recommendations
}

export function weekAverages(
  endKey: string,
  logsByDate: Record<string, LogEntry[]>,
): { cal: number; p: number; c: number; f: number } | null {
  const end = parseKeyLocal(endKey)
  let sumC = 0
  let sumP = 0
  let sumCb = 0
  let sumF = 0
  let daysWithFood = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const k = dateKey(d)
    const t = dailyTotals(k, logsByDate)
    if (t.entries > 0) {
      sumC += t.calories
      sumP += t.protein
      sumCb += t.carbs
      sumF += t.fat
      daysWithFood++
    }
  }
  if (!daysWithFood) return null
  return {
    cal: sumC / daysWithFood,
    p: sumP / daysWithFood,
    c: sumCb / daysWithFood,
    f: sumF / daysWithFood,
  }
}

function parseKeyLocal(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function monthDayTotals(
  year: number,
  monthIndex: number,
  logsByDate: Record<string, LogEntry[]>,
): Map<number, number> {
  const map = new Map<number, number>()
  const dim = new Date(year, monthIndex + 1, 0).getDate()
  for (let day = 1; day <= dim; day++) {
    const d = new Date(year, monthIndex, day)
    const k = dateKey(d)
    const t = dailyTotals(k, logsByDate)
    if (t.calories > 0 || t.entries > 0) {
      map.set(day, Math.round(t.calories))
    }
  }
  return map
}

export function yearMonthTotals(year: number, logsByDate: Record<string, LogEntry[]>): number[] {
  const months = Array(12).fill(0)
  for (let mi = 0; mi < 12; mi++) {
    const dim = new Date(year, mi + 1, 0).getDate()
    let sum = 0
    for (let day = 1; day <= dim; day++) {
      const d = new Date(year, mi, day)
      const k = dateKey(d)
      sum += dailyTotals(k, logsByDate).calories
    }
    months[mi] = Math.round(sum)
  }
  return months
}
