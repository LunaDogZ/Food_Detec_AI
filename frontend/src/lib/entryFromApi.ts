import { analyzeImage, thumbDataUrl } from '../api/analyze'
import type { LogEntry, FoodItem } from '../types'
import { computeMealCoverage, normalizeRecommendationLines } from './five-groups'

/** YOLO/Gemini pipeline returns JPEG base64 or a full data URL — use for diary thumbnail so boxes/labels show. */
function annotatedImageToDataUrl(annotated: unknown): string | null {
  if (typeof annotated !== 'string' || !annotated.trim()) return null
  const a = annotated.trim()
  return a.startsWith('data:') ? a : `data:image/jpeg;base64,${a}`
}

function entryLabel(api: Record<string, unknown>): string {
  const foods = (api.detected_foods as { name: string }[]) || []
  if (!foods.length) return 'มื้ออาหาร'
  return foods
    .map((f) => f.name)
    .slice(0, 3)
    .join(', ')
}

export async function buildLogEntryFromAnalysis(
  file: File,
): Promise<{ entry: LogEntry; data: Record<string, unknown> }> {
  const data = await analyzeImage(file)
  const thumb =
    annotatedImageToDataUrl(data.annotated_image) ?? (await thumbDataUrl(file))
  const foods = (data.detected_foods as FoodItem[]) || []
  const hasNutrition = !!(data.success && data.total_nutrition)
  const foodDetected =
    typeof data.food_detected === 'boolean' ? data.food_detected : foods.length > 0
  const mealRecommendations = Array.isArray(data.meal_recommendations)
    ? (data.meal_recommendations as string[])
    : []
  const tn = data.total_nutrition as
    | {
        calories: number
        protein: number
        carbs: number
        fat: number
        vitamins?: string[]
        minerals?: string[]
      }
    | undefined

  const nutritionObj =
    hasNutrition && tn
      ? {
          calories: tn.calories,
          protein: tn.protein,
          carbs: tn.carbs,
          fat: tn.fat,
          vitamins: Array.isArray(tn.vitamins) ? tn.vitamins : [],
          minerals: Array.isArray(tn.minerals) ? tn.minerals : [],
        }
      : null

  const entry: LogEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    label: hasNutrition
      ? entryLabel(data)
      : foods.length
        ? entryLabel(data)
        : 'ไม่พบอาหารในภาพ',
    nutrition: nutritionObj,
    foods,
    foodDetected,
    fiveGroups: computeMealCoverage({ nutrition: nutritionObj, foods }),
    mealRecommendations: normalizeRecommendationLines(mealRecommendations),
    gemini_explanation: String(data.gemini_explanation || data.message || ''),
    thumbDataUrl: thumb,
    success: hasNutrition,
  }

  return { entry, data }
}
