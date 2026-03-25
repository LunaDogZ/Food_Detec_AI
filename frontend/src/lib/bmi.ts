/** BMI = kg / (m)² — WHO-style bands for display. */

const SCALE_MIN = 15
const SCALE_MAX = 40

/**
 * ค่าจากช่องพิมพ์: ว่าง = null, ตัวเลขได้ = ใช้ค่านั้น, พิมพ์ค้างไม่ใช่ตัวเลข = ใช้ค่าที่บันทึกไว้ (ให้ BMI ยังอัปเดตได้ระหว่างพิมพ์)
 */
export function numberFromDraft(
  draft: string,
  stored: number | null,
): number | null {
  const t = draft.trim().replace(',', '.')
  if (t === '') return null
  const n = parseFloat(t)
  if (Number.isFinite(n)) return n
  return stored
}

export function computeBmi(heightCm: number | null, weightKg: number | null): number | null {
  if (heightCm == null || weightKg == null) return null
  if (heightCm <= 0 || weightKg <= 0) return null
  const m = heightCm / 100
  const bmi = weightKg / (m * m)
  if (!Number.isFinite(bmi) || bmi < 10 || bmi > 80) return null
  return bmi
}

export function bmiCategoryThai(bmi: number): string {
  if (bmi < 18.5) return 'น้ำหนักต่ำกว่าเกณฑ์'
  if (bmi < 25) return 'น้ำหนักปกติ'
  if (bmi < 30) return 'น้ำหนักเกิน'
  return 'โรคอ้วน'
}

export function bmiTone(bmi: number): 'low' | 'ok' | 'warn' | 'high' {
  if (bmi < 18.5) return 'low'
  if (bmi < 25) return 'ok'
  if (bmi < 30) return 'warn'
  return 'high'
}

/** Position 0–100 on the 15–40 scale for the gradient bar. */
export function bmiScalePercent(bmi: number): number {
  const t = (bmi - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)
  return Math.min(100, Math.max(0, t * 100))
}
