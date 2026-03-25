/**
 * จัดกลุ่มข้อความคำแนะนำ (สตริงเรียบ) เป็นหมวดเพื่ออ่านง่าย — ไม่มีโครงสร้างจาก API
 */

export type AdviceCategoryId = 'next_meal' | 'portion' | 'balance' | 'other'

const CATEGORY_ORDER: AdviceCategoryId[] = ['next_meal', 'portion', 'balance', 'other']

const TITLES: Record<AdviceCategoryId, string> = {
  next_meal: 'การปรับมื้อถัดไป',
  portion: 'ปริมาณ & พลังงาน',
  balance: 'สมดุล & องค์ประกอบอาหาร',
  other: 'คำแนะนำอื่นๆ',
}

/** ลำดับตรวจ: มื้อถัดไป → ปริมาณ/พลังงาน → สมดุล/หมู่อาหาร → ที่เหลือ */
export function categorizeAdviceLine(line: string): AdviceCategoryId {
  const s = line.trim()
  if (!s) return 'other'

  if (
    /มื้อต่อไป|มื้อถัด|ครั้งถัด|วันถัด|เสริมในมื้อ|เพิ่มเครื่องเคียง|ลดปริมาณ|เปลี่ยนเป็น|ทานน้อยลง|ทานมากขึ้น|ควรเพิ่ม|ควรลด|ควรเลือก|แนะนำให้.*ถัด/i.test(
      s,
    )
  ) {
    return 'next_meal'
  }

  if (
    /\d+\s*[-–]\s*\d+|\d+\s*กรัม|กรัมต่อวัน|พลังงาน|แคลอรี่|\bkcal\b|ปริมาณ|หน่วยบริโภค|ความต้องการพลังงาน|เหมาะสมกับ.*พลังงาน|สัดส่วน/i.test(
      s,
    )
  ) {
    return 'portion'
  }

  if (
    /5\s*หมู่|อาหาร\s*5|โปรตีน|คาร์บ|ไขมัน|ผัก|ผลไม้|กากใย|ไฟเบอร์|สมดุล|หลากหลาย|วิตามิน|เกลือแร่|สารอาหาร|กลุ่มอาหาร/i.test(
      s,
    )
  ) {
    return 'balance'
  }

  return 'other'
}

export type GroupedAdviceBlock = {
  id: AdviceCategoryId
  title: string
  items: string[]
}

export function groupRecommendationLines(lines: string[]): GroupedAdviceBlock[] {
  const buckets: Record<AdviceCategoryId, string[]> = {
    next_meal: [],
    portion: [],
    balance: [],
    other: [],
  }
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    buckets[categorizeAdviceLine(t)].push(t)
  }

  return CATEGORY_ORDER.filter((id) => buckets[id].length > 0).map((id) => ({
    id,
    title: TITLES[id],
    items: buckets[id],
  }))
}
