import type { AppState, BodyProfile, Goals } from '../types'

export const STORAGE_KEY = 'food-ai-dashboard-v1'

export function defaultGoals(): Goals {
  return {
    calories: 2829,
    protein: 212,
    carbs: 283,
    fat: 94,
    waterMl: 2500,
  }
}

export function defaultBodyProfile(): BodyProfile {
  return { heightCm: null, weightKg: null, ageYears: null, sex: null }
}

function coerceBodyNumber(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const t = v.trim().replace(',', '.')
    if (t === '') return null
    const n = parseFloat(t)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function coerceSex(v: unknown): BodyProfile['sex'] {
  if (v === 'male' || v === 'female') return v
  return null
}

function coerceAge(v: unknown): number | null {
  const n = coerceBodyNumber(v)
  if (n == null) return null
  const a = Math.round(n)
  if (a < 13 || a > 120) return null
  return a
}

/** รองรับค่าที่โหลดจาก JSON เป็นสตริง */
export function normalizeBodyProfile(raw: Partial<BodyProfile> | undefined): BodyProfile {
  if (!raw) return defaultBodyProfile()
  return {
    heightCm: coerceBodyNumber(raw.heightCm),
    weightKg: coerceBodyNumber(raw.weightKg),
    ageYears: coerceAge(raw.ageYears),
    sex: coerceSex(raw.sex),
  }
}

export function defaultState(): AppState {
  return {
    goals: defaultGoals(),
    bodyProfile: defaultBodyProfile(),
    logsByDate: {},
    waterByDate: {},
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const p = JSON.parse(raw) as Partial<AppState>
    return {
      goals: { ...defaultGoals(), ...p.goals },
      bodyProfile: normalizeBodyProfile(p.bodyProfile),
      logsByDate: p.logsByDate || {},
      waterByDate: p.waterByDate || {},
    }
  } catch {
    return defaultState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
