import { useId, useMemo, useState } from 'react'
import { useFood } from '../context/FoodContext'
import { defaultBodyProfile } from '../lib/storage'
import {
  bmiCategoryThai,
  bmiScalePercent,
  bmiTone,
  computeBmi,
  numberFromDraft,
} from '../lib/bmi'
import {
  dailyTotals,
  weekAverages,
  aggregateDailyMicronutrients,
} from '../lib/nutrition'
import {
  NUTRIENT_LABELS,
  mergeFiveGroupsForDay,
  countFiveHit,
  countFiveGroupDaysInWeek,
  emptyCoverage,
} from '../lib/five-groups'
import { escapeHtml } from '../lib/format'
import { dateKey } from '../lib/dates'
import type { BodyProfile, Sex } from '../types'
import { profileCompleteForGoals, recommendedGoalsFromProfile } from '../lib/goal-plan'

const RING_R = 52
const RING_C = 2 * Math.PI * RING_R

function FivePills({ merged, compact }: { merged: Record<string, boolean>; compact?: boolean }) {
  const base = merged || emptyCoverage()
  return (
    <div className={compact ? 'five-day-grid five-day-grid--compact' : 'five-day-grid'}>
      {NUTRIENT_LABELS.map(({ id, short }) => (
        <span
          key={id}
          className={`five-pill${base[id] ? ' five-pill--on' : ''}${compact ? ' five-pill--sm' : ''}`}
          title={short}
        >
          {short}
        </span>
      ))}
    </div>
  )
}

export function DashboardTab() {
  const { state, dateKeyStr, patchState } = useFood()
  const bmiHintId = useId()
  const [heightDraft, setHeightDraft] = useState(() =>
    state.bodyProfile?.heightCm != null ? String(state.bodyProfile.heightCm) : '',
  )
  const [weightDraft, setWeightDraft] = useState(() =>
    state.bodyProfile?.weightKg != null ? String(state.bodyProfile.weightKg) : '',
  )
  const [ageDraft, setAgeDraft] = useState(() =>
    state.bodyProfile?.ageYears != null ? String(state.bodyProfile.ageYears) : '',
  )

  function addWater(ml: number) {
    patchState((s) => ({
      ...s,
      waterByDate: {
        ...s.waterByDate,
        [dateKeyStr]: (s.waterByDate[dateKeyStr] || 0) + ml,
      },
    }))
  }
  const g = state.goals
  const t = dailyTotals(dateKeyStr, state.logsByDate)
  const pct = g.calories > 0 ? Math.min(100, (t.calories / g.calories) * 100) : 0
  const offset = RING_C * (1 - pct / 100)
  const rem = Math.max(0, g.calories - t.calories)

  const w = state.waterByDate[dateKeyStr] || 0
  const wp = g.waterMl > 0 ? Math.min(100, (w / g.waterMl) * 100) : 0

  const wk = weekAverages(dateKeyStr, state.logsByDate)

  const merged = useMemo(
    () => mergeFiveGroupsForDay(state.logsByDate[dateKeyStr] || []),
    [state.logsByDate, dateKeyStr],
  )
  const hit = countFiveHit(merged)

  const { vitamins, minerals } = aggregateDailyMicronutrients(dateKeyStr, state.logsByDate)
  const vHas = vitamins.length > 0
  const mHas = minerals.length > 0
  const vPreview =
    vHas ? escapeHtml(vitamins.slice(0, 5).join(' · ')) + (vitamins.length > 5 ? ' …' : '') : ''
  const mPreview =
    mHas ? escapeHtml(minerals.slice(0, 5).join(' · ')) + (minerals.length > 5 ? ' …' : '') : ''

  const counts = countFiveGroupDaysInWeek(
    dateKeyStr,
    (k) => state.logsByDate[k],
    dateKey,
  )

  const bp = state.bodyProfile ?? defaultBodyProfile()
  const goalsSynced = profileCompleteForGoals(bp)
  const hForBmi = numberFromDraft(heightDraft, bp.heightCm)
  const wForBmi = numberFromDraft(weightDraft, bp.weightKg)
  const bmi = computeBmi(hForBmi, wForBmi)
  const bmiPct = bmi != null ? bmiScalePercent(bmi) : 0
  const tone = bmi != null ? bmiTone(bmi) : 'ok'

  function applyBodyPatch(next: Partial<BodyProfile>) {
    patchState((s) => {
      const bodyProfile = { ...defaultBodyProfile(), ...s.bodyProfile, ...next }
      if (!profileCompleteForGoals(bodyProfile)) {
        return { ...s, bodyProfile }
      }
      const rec = recommendedGoalsFromProfile(bodyProfile)
      return {
        ...s,
        bodyProfile,
        goals: { ...s.goals, ...rec },
      }
    })
  }

  function commitHeight(raw: string) {
    setHeightDraft(raw)
    const t = raw.trim().replace(',', '.')
    if (t === '') {
      applyBodyPatch({ heightCm: null })
      return
    }
    const n = parseFloat(t)
    if (Number.isFinite(n)) applyBodyPatch({ heightCm: n })
  }

  function commitWeight(raw: string) {
    setWeightDraft(raw)
    const t = raw.trim().replace(',', '.')
    if (t === '') {
      applyBodyPatch({ weightKg: null })
      return
    }
    const n = parseFloat(t)
    if (Number.isFinite(n)) applyBodyPatch({ weightKg: n })
  }

  function commitAge(raw: string) {
    setAgeDraft(raw)
    const t = raw.trim().replace(',', '.')
    if (t === '') {
      applyBodyPatch({ ageYears: null })
      return
    }
    const n = parseFloat(t)
    if (!Number.isFinite(n)) return
    const a = Math.round(n)
    if (a < 13 || a > 120) return
    applyBodyPatch({ ageYears: a })
  }

  function setSex(value: Sex) {
    applyBodyPatch({ sex: value })
  }

  return (
    <div className="tab-panel tab-panel--dashboard">
      <div className="panel-grid panel-grid--top">
        <article className="surface surface--elevated">
          <div className="surface__head">
            <h2 className="surface__title">สรุปวันนี้</h2>
            <p className="surface__sub">
              แคลอรี่และมาโครเทียบเป้าหมาย
              {goalsSynced
                ? ' · เป้าหมายสอดคล้องกับ BMI และพลังงานที่ใช้ (TDEE)'
                : ' · กรอกอายุและเพศในส่วน BMI เพื่อปรับเป้าหมายอัตโนมัติ'}
            </p>
          </div>
          <div className="nutrition-row">
            <div className="ring-wrap">
              <svg className="ring" viewBox="0 0 120 120" aria-hidden="true">
                <circle className="ring__bg" cx="60" cy="60" r="52" />
                <circle
                  className="ring__fg"
                  cx="60"
                  cy="60"
                  r="52"
                  style={{
                    strokeDasharray: String(RING_C),
                    strokeDashoffset: offset,
                  }}
                />
              </svg>
              <div className="ring__center">
                <span className="ring__pct">{Math.round(pct)}%</span>
                <span className="ring__of">of goal</span>
              </div>
            </div>
            <div className="cal-summary">
              <p className="cal-line">
                <strong>{Math.round(t.calories).toLocaleString()}</strong>
                <span className="muted"> / </span>
                <span>{g.calories.toLocaleString()}</span>
                <span className="muted"> kcal</span>
              </p>
              <p className="muted small">เหลืออีกประมาณ {Math.round(rem).toLocaleString()} kcal</p>
            </div>
          </div>
          <div className="macros">
            <div className="macro macro--p">
              <span className="macro__dot" />
              <span>Protein</span>
              <span className="macro__nums">
                {Math.round(t.protein)}g / {g.protein}g
              </span>
            </div>
            <div className="macro macro--c">
              <span className="macro__dot" />
              <span>Carbs</span>
              <span className="macro__nums">
                {Math.round(t.carbs)}g / {g.carbs}g
              </span>
            </div>
            <div className="macro macro--f">
              <span className="macro__dot" />
              <span>Fat</span>
              <span className="macro__nums">
                {Math.round(t.fat)}g / {g.fat}g
              </span>
            </div>
          </div>

          <div className="bmi-block" aria-labelledby={bmiHintId}>
            <div className="bmi-block__divider" aria-hidden="true" />
            <div className="bmi-block__row">
              <div className="bmi-block__intro">
                <p id={bmiHintId} className="bmi-block__title">
                  BMI
                </p>
                <p className="bmi-block__hint muted small">ส่วนสูง น้ำหนัก อายุ และเพศ — ใช้คำนวณ BMI และเป้าหมายโภชนาการ</p>
              </div>
              {bmi != null ? (
                <div className="bmi-block__stat">
                  <p className={`bmi-block__num bmi-block__num--${tone}`}>
                    <strong>{bmi.toFixed(1)}</strong>
                    <span className="muted small"> kg/m²</span>
                  </p>
                  <p className="bmi-block__cat muted small">{bmiCategoryThai(bmi)}</p>
                </div>
              ) : (
                <p className="bmi-block__placeholder muted small">กรอกส่วนสูง · น้ำหนักด้านล่าง</p>
              )}
            </div>

            {bmi != null && (
              <div className="bmi-scale" aria-hidden="true">
                <div className="bmi-scale__bar">
                  <div className="bmi-scale__track" />
                  <div className="bmi-scale__marker" style={{ left: `${bmiPct}%` }} />
                </div>
                <div className="bmi-scale__labels muted small">
                  <span>15</span>
                  <span>18.5</span>
                  <span>25</span>
                  <span>30</span>
                  <span>40</span>
                </div>
              </div>
            )}

            <div className="bmi-form">
              <label className="bmi-field">
                <span className="bmi-field__label">ส่วนสูง (ซม.)</span>
                <input
                  className="bmi-field__input"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="เช่น 170"
                  value={heightDraft}
                  onChange={(e) => commitHeight(e.target.value)}
                />
              </label>
              <label className="bmi-field">
                <span className="bmi-field__label">น้ำหนัก (กก.)</span>
                <input
                  className="bmi-field__input"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="เช่น 65"
                  value={weightDraft}
                  onChange={(e) => commitWeight(e.target.value)}
                />
              </label>
              <label className="bmi-field">
                <span className="bmi-field__label">อายุ (ปี)</span>
                <input
                  className="bmi-field__input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="เช่น 28"
                  value={ageDraft}
                  onChange={(e) => commitAge(e.target.value)}
                />
              </label>
              <div className="bmi-field bmi-field--sex">
                <span className="bmi-field__label" id={`${bmiHintId}-sex`}>
                  เพศ
                </span>
                <div className="bmi-sex" role="group" aria-labelledby={`${bmiHintId}-sex`}>
                  <button
                    type="button"
                    className={`bmi-sex__btn${bp.sex === 'male' ? ' bmi-sex__btn--on' : ''}`}
                    onClick={() => setSex('male')}
                  >
                    ชาย
                  </button>
                  <button
                    type="button"
                    className={`bmi-sex__btn${bp.sex === 'female' ? ' bmi-sex__btn--on' : ''}`}
                    onClick={() => setSex('female')}
                  >
                    หญิง
                  </button>
                </div>
              </div>
              <p className="bmi-plan-hint muted small">
                {goalsSynced
                  ? 'เป้าหมายแคลอรี่ มาโคร และน้ำถูกปรับตาม TDEE (Mifflin–St Jeor) และช่วง BMI แล้ว'
                  : 'กรอกอายุและเลือกเพศให้ครบ ระบบจะปรับเป้าหมายแคลอรี่ มาโคร และน้ำให้อัตโนมัติ'}
              </p>
            </div>
          </div>
        </article>

        <article className="surface surface--elevated">
          <div className="surface__head">
            <h2 className="surface__title">โภชนาการ 5 หมวด</h2>
            <p className="surface__sub">
              โปรตีน · คาร์โบไฮเดรต · ไขมัน · วิตามิน · เกลือแร่ — จากมื้อที่วิเคราะห์ได้ (มาโคร่ + รายการวิตามิน/เกลือแร่)
            </p>
          </div>
          <div className="five-day" aria-label="โภชนาการ 5 หมวด วันนี้">
            <div className="five-day__head">
              <p className="five-day__title muted small">5 หมวด (วันนี้)</p>
              <p className="five-day__score">
                <strong>{hit}/5</strong> หมวด
              </p>
            </div>
            <p className="five-day__hint muted small">
              แต่ละช่อง = มีข้อมูล/ครอบคลุมหมวดนั้นจากมื้อในวันนี้ (โปรตีน–คาร์บ–ไขมันจากมาโคร่, วิตามิน/เกลือแร่จากรายการที่ API ระบุ)
            </p>
            <FivePills merged={merged} />
          </div>
          <div className="micro-day micro-day--spaced" aria-label="วิตามินและเกลือแร่ วันนี้">
            <p className="micro-day__title muted small">
              วิตามิน · เกลือแร่ <span className="micro-day__sub">(จากมื้อที่วิเคราะห์ได้)</span>
            </p>
            <div className="micro-day__grid">
              <div className="micro-day__cell">
                <div className="micro-day__row">
                  <span className="micro-day__label">วิตามิน</span>
                  <span className={`micro-badge ${vHas ? 'micro-badge--yes' : 'micro-badge--no'}`}>
                    {vHas ? 'มีข้อมูล' : 'ไม่มีข้อมูล'}
                  </span>
                </div>
                {vHas ? (
                  <p className="micro-day__preview muted small" dangerouslySetInnerHTML={{ __html: vPreview }} />
                ) : (
                  <p className="micro-day__empty muted small">—</p>
                )}
              </div>
              <div className="micro-day__cell">
                <div className="micro-day__row">
                  <span className="micro-day__label">เกลือแร่</span>
                  <span className={`micro-badge ${mHas ? 'micro-badge--yes' : 'micro-badge--no'}`}>
                    {mHas ? 'มีข้อมูล' : 'ไม่มีข้อมูล'}
                  </span>
                </div>
                {mHas ? (
                  <p className="micro-day__preview muted small" dangerouslySetInnerHTML={{ __html: mPreview }} />
                ) : (
                  <p className="micro-day__empty muted small">—</p>
                )}
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="panel-grid panel-grid--bottom">
        <article className="surface surface--elevated">
          <div className="surface__head">
            <h2 className="surface__title">น้ำดื่ม</h2>
            <p className="surface__sub">เป้าหมาย {g.waterMl.toLocaleString()} ml</p>
          </div>
          <div className="water-bar-wrap">
            <div className="water-bar">
              <div className="water-bar__fill" style={{ width: `${wp}%` }} />
            </div>
            <p className="water-label">
              <span>{Math.round(wp)}</span>% ของเป้าหมาย
            </p>
          </div>
          <div className="water-btns">
            {[250, 500, 750, 1000].map((ml) => (
              <button key={ml} type="button" className="btn btn--water" onClick={() => addWater(ml)}>
                +{ml} ml
              </button>
            ))}
          </div>
        </article>

        <article className="surface surface--elevated">
          <div className="surface__head">
            <h2 className="surface__title">สถิติ 7 วัน</h2>
            <p className="surface__sub">ค่าเฉลี่ยจากวันที่มีบันทึก (ย้อนหลังจากวันที่เลือก)</p>
          </div>
          <div className="weekly-grid">
            <div className="weekly-cell">
              <span className="muted small">Avg Calories</span>
              <strong>{wk ? `${Math.round(wk.cal).toLocaleString()} kcal` : '—'}</strong>
            </div>
            <div className="weekly-cell">
              <span className="muted small">Avg Protein</span>
              <strong>{wk ? `${wk.p.toFixed(1)} g` : '—'}</strong>
            </div>
            <div className="weekly-cell">
              <span className="muted small">Avg Carbs</span>
              <strong>{wk ? `${wk.c.toFixed(1)} g` : '—'}</strong>
            </div>
            <div className="weekly-cell">
              <span className="muted small">Avg Fat</span>
              <strong>{wk ? `${wk.f.toFixed(1)} g` : '—'}</strong>
            </div>
          </div>
          <div className="weekly-five-head">
            <h3 className="weekly-subtitle">โภชนาการ 5 หมวด</h3>
            <p className="muted small weekly-subtitle-hint">
              แต่ละแถว = จำนวนวันที่มีหมวดนั้นในมื้อ (จาก 7 วันย้อนหลัง)
            </p>
          </div>
          <div className="weekly-five weekly-five--rows" aria-label="สรุป 5 หมวด รายสัปดาห์">
            {NUTRIENT_LABELS.map(({ id, short }) => {
              const n = counts[id] ?? 0
              const pctBar = Math.min(100, (n / 7) * 100)
              return (
                <div key={id} className="weekly-five__row">
                  <span className="weekly-five__name">{short}</span>
                  <div className="weekly-five__track" aria-hidden="true">
                    <span className="weekly-five__fill" style={{ width: `${pctBar}%` }} />
                  </div>
                  <span className="weekly-five__score">
                    {n}
                    <span className="weekly-five__den">/7</span>
                  </span>
                </div>
              )
            })}
          </div>
        </article>
      </div>
    </div>
  )
}
