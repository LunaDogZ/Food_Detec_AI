import type { BodyProfile, Goals } from '../types'
import { computeBmi } from './bmi'

/** กิจกรรมปานกลาง–เบา (คูณ TDEE) — ค่าเริ่มต้นเดียวกับแอปสุขภาพทั่วไป */
const ACTIVITY_FACTOR = 1.375

/**
 * ต้องมีส่วนสูง น้ำหนัก อายุ เพศ ที่อยู่ในช่วงสมเหตุสมผล และคำนวณ BMI ได้
 */
export function profileCompleteForGoals(bp: BodyProfile): boolean {
  if (bp.heightCm == null || bp.weightKg == null || bp.sex == null || bp.ageYears == null) {
    return false
  }
  if (!Number.isFinite(bp.ageYears) || bp.ageYears < 13 || bp.ageYears > 120) return false
  if (bp.heightCm < 70 || bp.heightCm > 260) return false
  if (bp.weightKg < 20 || bp.weightKg > 400) return false
  return computeBmi(bp.heightCm, bp.weightKg) != null
}

/**
 * แคลอรี่: TDEE จาก Mifflin–St Jeor × กิจกรรม แล้วปรับตามช่วง BMI
 * มาโคร: สัดส่วนพลังงาน ~26% โปรตีน / ~28% ไขมัน / ที่เหลือคาร์บ
 * น้ำ: ~33 ml ต่อ kg (จำกัดช่วง)
 */
export function recommendedGoalsFromProfile(bp: BodyProfile): Goals {
  const w = bp.weightKg!
  const h = bp.heightCm!
  const a = bp.ageYears!
  const sex = bp.sex!

  const bmr =
    sex === 'male'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161

  let tdee = bmr * ACTIVITY_FACTOR
  const bmi = computeBmi(h, w)!
  if (bmi < 18.5) tdee *= 1.09
  else if (bmi >= 30) tdee *= 0.83
  else if (bmi >= 25) tdee *= 0.9

  const calories = Math.round(Math.max(1200, Math.min(4800, tdee)))

  const protein = Math.round((calories * 0.26) / 4)
  const fat = Math.round((calories * 0.28) / 9)
  let carbs = Math.round((calories - protein * 4 - fat * 9) / 4)
  carbs = Math.max(80, Math.min(800, carbs))

  const waterMl = Math.round(Math.min(4000, Math.max(1600, w * 33)))

  return {
    calories,
    protein,
    carbs,
    fat,
    waterMl,
  }
}
