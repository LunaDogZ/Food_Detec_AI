/**
 * ครอบคลุม 5 หมวดโภชนาการ: โปรตีน · คาร์โบไฮเดรต · ไขมัน · วิตามิน · เกลือแร่
 * คำนวณจากข้อมูลโภชนาการ (API) และ/หรือ food_group จากมื้อ
 */

import type { FoodItem, LogEntry, Nutrition } from '../types'

export const COVERAGE_IDS = ['protein', 'carbs', 'fat', 'vitamins', 'minerals'] as const

export type CoverageId = (typeof COVERAGE_IDS)[number]

export const NUTRIENT_LABELS: { id: CoverageId; short: string }[] = [
  { id: 'protein', short: 'โปรตีน' },
  { id: 'carbs', short: 'คาร์โบไฮเดรต' },
  { id: 'fat', short: 'ไขมัน' },
  { id: 'vitamins', short: 'วิตามิน' },
  { id: 'minerals', short: 'เกลือแร่' },
]

/** @deprecated use COVERAGE_IDS */
export const FIVE_GROUP_IDS = COVERAGE_IDS
/** @deprecated use NUTRIENT_LABELS */
export const FIVE_GROUP_LABELS = NUTRIENT_LABELS

const EPS = 0.01

export function emptyCoverage(): Record<CoverageId, boolean> {
  return { protein: false, carbs: false, fat: false, vitamins: false, minerals: false }
}

/** @deprecated use emptyCoverage */
export function emptyFiveGroups(): Record<CoverageId, boolean> {
  return emptyCoverage()
}

function mergeOr(
  a: Record<CoverageId, boolean>,
  b: Record<CoverageId, boolean>,
): Record<CoverageId, boolean> {
  const o = emptyCoverage()
  for (const id of COVERAGE_IDS) {
    o[id] = !!(a[id] || b[id])
  }
  return o
}

export function coverageFromNutrition(n: Nutrition): Record<CoverageId, boolean> {
  const o = emptyCoverage()
  o.protein = (n.protein ?? 0) > EPS
  o.carbs = (n.carbs ?? 0) > EPS
  o.fat = (n.fat ?? 0) > EPS
  o.vitamins = (n.vitamins?.filter((x) => String(x || '').trim()).length ?? 0) > 0
  o.minerals = (n.minerals?.filter((x) => String(x || '').trim()).length ?? 0) > 0
  return o
}

function has(s: string, words: string[]) {
  return words.some((w) => s.includes(w))
}

/** จาก food_group (YOLO/Gemini) — ไม่มีข้อมูลแคลอรี่รายมื้อ */
export function mapFoodGroupToCoverage(raw: string | null | undefined): Record<CoverageId, boolean> {
  const o = emptyCoverage()
  if (raw == null || typeof raw !== 'string') return o
  const t = raw.toLowerCase().trim()
  if (!t || t === 'unknown') return o

  if (
    has(t, [
      'carb',
      'carbs',
      'starch',
      'rice',
      'grain',
      'bread',
      'noodle',
      'pasta',
      'ข้าว',
      'แป้ง',
      'วุ้นเส้น',
      'เส้น',
      'ขนมปัง',
      'ข้าวโพด',
      'sugar',
    ]) ||
    t === 'carbs'
  ) {
    o.carbs = true
  }

  if (
    has(t, [
      'protein',
      'meat',
      'chicken',
      'pork',
      'beef',
      'fish',
      'seafood',
      'egg',
      'bean',
      'legume',
      'tofu',
      'ถั่ว',
      'เนื้อ',
      'ไก่',
      'หมู',
      'ปลา',
      'กุ้ง',
      'ไข่',
      'เต้าหู้',
    ])
  ) {
    o.protein = true
  }

  if (
    has(t, [
      'oil',
      'fat',
      'butter',
      'fried',
      'cream',
      'น้ำมัน',
      'ไขมัน',
      'ทอด',
      'เนย',
    ])
  ) {
    o.fat = true
  }

  if (has(t, ['vegetable', 'veg', 'salad', 'ผัก', 'ใบ', 'คะน้า', 'บรอกโคลี'])) {
    o.vitamins = true
    o.carbs = true
  }

  if (has(t, ['fruit', 'ผลไม้', 'berry', 'กล้วย', 'ส้ม', 'มะม่วง'])) {
    o.vitamins = true
    o.carbs = true
  }

  if (has(t, ['milk', 'dairy', 'yogurt', 'cheese', 'นม', 'ชีส', 'โยเกิร์ต', 'เนยแข็ง'])) {
    o.protein = true
    o.fat = true
    o.minerals = true
  }

  return o
}

export function coverageFromFoods(foods: FoodItem[] | undefined): Record<CoverageId, boolean> {
  const o = emptyCoverage()
  if (!foods?.length) return o
  for (const f of foods) {
    const c = mapFoodGroupToCoverage(f.food_group)
    for (const id of COVERAGE_IDS) {
      if (c[id]) o[id] = true
    }
  }
  return o
}

/** ข้อมูลเก่าใน localStorage: grain, veg, fruit, dairy (+ protein แบบ 5 หมู่เดิม) */
function isLegacyFiveGroups(fg: Record<string, boolean>): boolean {
  return !!(fg.grain || fg.veg || fg.fruit || fg.dairy)
}

function coverageFromStoredKeys(fg: Record<string, boolean>): Record<CoverageId, boolean> {
  const o = emptyCoverage()
  for (const id of COVERAGE_IDS) {
    if (fg[id]) o[id] = true
  }
  return o
}

function legacyFiveToCoverage(fg: Record<string, boolean>): Record<CoverageId, boolean> {
  const o = emptyCoverage()
  if (fg.grain) o.carbs = true
  if (fg.protein) o.protein = true
  if (fg.veg) {
    o.vitamins = true
    o.carbs = true
  }
  if (fg.fruit) {
    o.vitamins = true
    o.carbs = true
  }
  if (fg.dairy) {
    o.protein = true
    o.fat = true
    o.minerals = true
  }
  return o
}

/**
 * ครอบคลุมมื้อเดียว: ใช้ nutrition เป็นหลัก ถ้าไม่มีครบให้ OR กับ food_group / ข้อมูลเก่า
 */
export function computeMealCoverage(entry: {
  nutrition?: Nutrition | null
  foods?: FoodItem[]
  fiveGroups?: Record<string, boolean>
}): Record<CoverageId, boolean> {
  let merged = emptyCoverage()

  if (entry.nutrition) {
    merged = mergeOr(merged, coverageFromNutrition(entry.nutrition))
  }

  merged = mergeOr(merged, coverageFromFoods(entry.foods))

  if (entry.fiveGroups && isLegacyFiveGroups(entry.fiveGroups)) {
    merged = mergeOr(merged, legacyFiveToCoverage(entry.fiveGroups))
  } else if (entry.fiveGroups) {
    merged = mergeOr(merged, coverageFromStoredKeys(entry.fiveGroups))
  }

  return merged
}

/** @deprecated use computeMealCoverage */
export function computeMealFiveGroups(foods: FoodItem[] | undefined): Record<CoverageId, boolean> {
  return coverageFromFoods(foods)
}

export function mergeCoverageForDay(
  entries: { nutrition?: Nutrition | null; foods?: FoodItem[]; fiveGroups?: Record<string, boolean> }[],
): Record<CoverageId, boolean> {
  const out = emptyCoverage()
  if (!entries?.length) return out
  for (const e of entries) {
    const cov = computeMealCoverage(e)
    for (const id of COVERAGE_IDS) {
      if (cov[id]) out[id] = true
    }
  }
  return out
}

/** @deprecated use mergeCoverageForDay */
export function mergeFiveGroupsForDay(
  entries: { nutrition?: Nutrition | null; foods?: FoodItem[]; fiveGroups?: Record<string, boolean> }[],
): Record<CoverageId, boolean> {
  return mergeCoverageForDay(entries)
}

export function countCoverageDaysInWeek(
  endKey: string,
  getEntriesForDateKey: (k: string) => LogEntry[] | undefined,
  dateKeyFn: (d: Date) => string,
): Record<CoverageId, number> {
  const counts: Record<CoverageId, number> = {
    protein: 0,
    carbs: 0,
    fat: 0,
    vitamins: 0,
    minerals: 0,
  }
  const [y, m, d] = endKey.split('-').map(Number)
  const end = new Date(y, m - 1, d)
  for (let i = 0; i < 7; i++) {
    const day = new Date(end)
    day.setDate(day.getDate() - i)
    const k = dateKeyFn(day)
    const merged = mergeCoverageForDay(getEntriesForDateKey(k) || [])
    for (const id of COVERAGE_IDS) {
      if (merged[id]) counts[id]++
    }
  }
  return counts
}

/** @deprecated use countCoverageDaysInWeek */
export function countFiveGroupDaysInWeek(
  endKey: string,
  getEntriesForDateKey: (k: string) => LogEntry[] | undefined,
  dateKeyFn: (d: Date) => string,
): Record<CoverageId, number> {
  return countCoverageDaysInWeek(endKey, getEntriesForDateKey, dateKeyFn)
}

export function normalizeRecommendationLines(lines: string[] | undefined): string[] {
  if (!lines?.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (let t of lines) {
    if (typeof t !== 'string') continue
    t = t.trim().replace(/\s+/g, ' ')
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

export function countCoverageHit(fg: Record<string, boolean> | undefined): number {
  if (!fg) return 0
  let n = 0
  for (const id of COVERAGE_IDS) {
    if (fg[id]) n++
  }
  return n
}

/** @deprecated use countCoverageHit */
export function countFiveHit(fg: Record<string, boolean> | undefined): number {
  return countCoverageHit(fg)
}
