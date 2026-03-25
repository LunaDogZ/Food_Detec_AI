export type Goals = {
  calories: number
  protein: number
  carbs: number
  fat: number
  waterMl: number
}

export type Sex = 'male' | 'female'

/** ส่วนสูง/น้ำหนัก/อายุ/เพศ — ใช้คำนวณ BMI และเป้าหมายแคลอรี่ (บันทึกในเครื่อง) */
export type BodyProfile = {
  heightCm: number | null
  weightKg: number | null
  ageYears: number | null
  sex: Sex | null
}

export type Nutrition = {
  calories: number
  protein: number
  carbs: number
  fat: number
  vitamins?: string[]
  minerals?: string[]
}

export type FoodItem = {
  name: string
  food_group?: string | null
}

export type LogEntry = {
  id: string
  createdAt: string
  label: string
  nutrition: Nutrition | null
  foods: FoodItem[]
  foodDetected: boolean
  fiveGroups?: Record<string, boolean>
  mealRecommendations: string[]
  gemini_explanation: string
  thumbDataUrl?: string
  success?: boolean
}

export type AppState = {
  goals: Goals
  bodyProfile: BodyProfile
  logsByDate: Record<string, LogEntry[]>
  waterByDate: Record<string, number>
}

export type ChatMessage =
  | { role: 'user'; text: string; imageDataUrl?: string | null }
  | { role: 'assistant'; html: string; isError?: boolean }

export type ChatSessionRecord = {
  id: string
  title: string
  updatedAt: string
  messages: ChatMessage[]
}
