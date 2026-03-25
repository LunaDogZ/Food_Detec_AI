import { normalizeRecommendationLines } from './five-groups'

export function escapeHtml(s: string): string {
  const d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}

export function formatExplainedText(raw: string): string {
  if (!raw) return ''
  const esc = escapeHtml(raw)
  const br = esc.replace(/\n/g, '<br/>')
  return br.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

/** API response shape from /analyze/image */
export function formatAssistantReply(data: Record<string, unknown>): string {
  const parts: string[] = []

  const annotated = data.annotated_image
  if (typeof annotated === 'string' && annotated) {
    const src = annotated.startsWith('data:')
      ? annotated
      : `data:image/jpeg;base64,${annotated}`
    parts.push(`<div class="msg-visual"><img src="${src}" alt="ภาพที่ตรวจจับ" /></div>`)
  }

  if (typeof data.food_detected === 'boolean') {
    parts.push(
      `<p class="msg-plain"><strong>${data.food_detected ? 'พบอาหารในภาพ' : 'ไม่พบอาหารในภาพ'}</strong></p>`,
    )
  }

  const foods = (data.detected_foods as { name: string; food_group?: string }[]) || []
  if (foods.length) {
    const list = foods
      .map((f) => {
        const g = f.food_group ? ` (${f.food_group})` : ''
        return `${f.name}${g}`
      })
      .join(' · ')
    parts.push(
      `<div class="msg-section"><p class="msg-lead">รายการที่ตรวจพบ</p><p class="msg-plain">${escapeHtml(list)}</p></div>`,
    )
  }

  const n = data.total_nutrition as
    | {
        calories: number
        protein: number
        carbs: number
        fat: number
        vitamins?: unknown[]
        minerals?: unknown[]
      }
    | undefined
  if (n) {
    const cal = Math.round(n.calories)
    const p = Number(n.protein).toFixed(1)
    const c = Number(n.carbs).toFixed(1)
    const f = Number(n.fat).toFixed(1)
    parts.push(
      `<div class="msg-section msg-section--nuts">` +
        `<p class="msg-lead">สรุปโภชนาการ (โดยประมาณ)</p>` +
        `<ul class="msg-nut-list">` +
        `<li><span>พลังงาน</span><strong>${cal} kcal</strong></li>` +
        `<li><span>โปรตีน</span><strong>${p} g</strong></li>` +
        `<li><span>คาร์โบไฮเดรต</span><strong>${c} g</strong></li>` +
        `<li><span>ไขมัน</span><strong>${f} g</strong></li>` +
        `</ul></div>`,
    )
    const vits = n.vitamins && n.vitamins.length
    const mins = n.minerals && n.minerals.length
    parts.push(
      `<p class="msg-plain muted small">วิตามิน: <strong>${vits ? 'มีรายการ' : 'ไม่มีข้อมูล'}</strong> · เกลือแร่: <strong>${mins ? 'มีรายการ' : 'ไม่มีข้อมูล'}</strong></p>`,
    )
  }

  const recsRaw = data.meal_recommendations
  const recs = Array.isArray(recsRaw)
    ? normalizeRecommendationLines(recsRaw as string[])
    : normalizeRecommendationLines([])
  if (recs.length) {
    const items = recs.map((t) => `<li>${escapeHtml(t)}</li>`).join('')
    parts.push(
      `<div class="msg-section"><p class="msg-lead">คำแนะนำมื้อต่อไป</p><ul class="msg-nut-list diary-rec__list">${items}</ul></div>`,
    )
  }

  const gemini = data.gemini_explanation
  if (typeof gemini === 'string' && gemini) {
    parts.push(
      `<div class="msg-section msg-section--detail"><div class="msg-rich">${formatExplainedText(gemini)}</div></div>`,
    )
  }

  const message = data.message
  if (typeof message === 'string' && message && !data.gemini_explanation && !n && !foods.length) {
    parts.push(`<div class="msg-section"><p class="msg-plain">${escapeHtml(message)}</p></div>`)
  }

  const ms = data.processing_time_ms != null ? Math.round(Number(data.processing_time_ms)) : null
  if (ms != null) {
    parts.push(`<p class="msg-foot muted">ประมาณการ · ${ms.toLocaleString()} ms</p>`)
  }

  if (!parts.length) {
    parts.push(`<p class="msg-plain">ไม่มีข้อมูลเพิ่มเติม</p>`)
  }

  return `<div class="msg-chat">${parts.join('')}</div>`
}
