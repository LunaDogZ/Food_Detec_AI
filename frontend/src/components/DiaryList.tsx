import type { LogEntry } from '../types'
import {
  computeMealCoverage,
  countFiveHit,
  emptyCoverage,
  NUTRIENT_LABELS,
  normalizeRecommendationLines,
} from '../lib/five-groups'
import { formatExplainedText } from '../lib/format'

function FivePillsCompact({ fg }: { fg: Record<string, boolean> }) {
  const base = fg || emptyCoverage()
  return (
    <div className="five-day-grid five-day-grid--compact">
      {NUTRIENT_LABELS.map(({ id, short }) => (
        <span
          key={id}
          className={`five-pill five-pill--sm${base[id] ? ' five-pill--on' : ''}`}
          title={short}
        >
          {short}
        </span>
      ))}
    </div>
  )
}

function MealRecs({ lines }: { lines: string[] }) {
  const norm = normalizeRecommendationLines(lines)
  if (!norm.length) return null
  return (
    <details className="diary-rec">
      <summary className="diary-rec__summary">คำแนะนำมื้อต่อไป</summary>
      <ul className="diary-rec__list">
        {norm.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </details>
  )
}

function GeminiDetail({ text }: { text: string }) {
  if (!text?.trim()) return null
  return (
    <details className="diary-rec diary-rec--detail">
      <summary className="diary-rec__summary">รายละเอียดจาก Gemini</summary>
      <div
        className="diary-rec__rich"
        dangerouslySetInnerHTML={{ __html: formatExplainedText(text) }}
      />
    </details>
  )
}

export function DiaryList({
  entries,
  onDelete,
  onImageClick,
}: {
  entries: LogEntry[]
  onDelete: (index: number) => void
  onImageClick: (src: string) => void
}) {
  if (!entries.length) {
    return (
      <div className="diary-empty">
        <p className="diary-empty__title">ยังไม่มีมื้อในวันนี้</p>
        <p className="muted small">กด &quot;เพิ่มมื้ออาหาร&quot; ด้านบนเพื่อเริ่มบันทึก</p>
      </div>
    )
  }

  return (
    <ul className="diary-list">
      {entries.map((e, idx) => {
        const cal = e.nutrition ? Math.round(e.nutrition.calories) : '—'
        const time = new Date(e.createdAt).toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
        })
        const detected =
          typeof e.foodDetected === 'boolean' ? e.foodDetected : !!(e.foods && e.foods.length)
        const fg = computeMealCoverage(e)
        const hit = countFiveHit(fg)
        const vFromApi = (e.nutrition?.vitamins || []).filter((x) => String(x || '').trim()).length
        const mFromApi = (e.nutrition?.minerals || []).filter((x) => String(x || '').trim()).length
        const v = fg.vitamins || vFromApi > 0
        const m = fg.minerals || mFromApi > 0

        return (
          <li key={e.id} className="diary-item">
            {e.thumbDataUrl ? (
              <button
                type="button"
                className="diary-item__img-btn"
                onClick={() => onImageClick(e.thumbDataUrl!)}
                aria-label="ดูภาพขนาดใหญ่"
              >
                <img src={e.thumbDataUrl} alt="" />
              </button>
            ) : (
              <div className="diary-item__ph" aria-hidden />
            )}
            <div className="diary-item__col">
              <div className="diary-item__row">
                <div className="diary-item__body">
                  <p className="diary-item__title">{e.label}</p>
                  <p className="diary-item__meta">
                    {time} · ครบ 5 หมวดมื้อนี้ <strong>{hit}/5</strong>
                  </p>
                </div>
                <div className="diary-item__right">
                  <span className="diary-item__cal">{cal}</span>
                  <button
                    type="button"
                    className="diary-item__delete"
                    onClick={() => onDelete(idx)}
                    title="ลบรายการนี้"
                    aria-label="ลบรายการนี้"
                  >
                    <svg
                      className="diary-item__delete-icon"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6" />
                    </svg>
                    <span className="diary-item__delete-label">ลบ</span>
                  </button>
                </div>
              </div>
              <p className="diary-item__detect">
                <span className={detected ? 'tag tag--ok' : 'tag tag--muted'}>
                  {detected ? 'พบอาหารในภาพ' : 'ไม่พบอาหารในภาพ'}
                </span>
              </p>
              <FivePillsCompact fg={fg} />
              <p className="diary-item__micro muted small">
                วิตามิน <span className="micro-yn">{v ? 'มี' : 'ไม่มี'}</span> · เกลือแร่{' '}
                <span className="micro-yn">{m ? 'มี' : 'ไม่มี'}</span>
              </p>
              <MealRecs lines={e.mealRecommendations} />
              <GeminiDetail text={e.gemini_explanation} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
