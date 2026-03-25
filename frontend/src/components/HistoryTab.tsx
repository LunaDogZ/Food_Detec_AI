import { useMemo, useState } from 'react'
import { useFood } from '../context/FoodContext'
import { DiaryList } from './DiaryList'
import { dateKey, startOfMonth, daysInMonth } from '../lib/dates'
import { monthDayTotals, yearMonthTotals } from '../lib/nutrition'

type Period = 'day' | 'month' | 'year'

const MONTH_NAMES = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

export function HistoryTab({ onOpenLightbox }: { onOpenLightbox: (src: string) => void }) {
  const { state, dateKeyStr, viewDate, setViewDate, patchState } = useFood()
  const [period, setPeriod] = useState<Period>('day')

  const entries = state.logsByDate[dateKeyStr] || []

  const monthAnchor = useMemo(() => startOfMonth(viewDate), [viewDate])
  const year = viewDate.getFullYear()
  const monthIndex = viewDate.getMonth()

  const dayCalMap = useMemo(
    () => monthDayTotals(year, monthIndex, state.logsByDate),
    [year, monthIndex, state.logsByDate],
  )

  const yearMonths = useMemo(
    () => yearMonthTotals(year, state.logsByDate),
    [year, state.logsByDate],
  )

  const maxMonthCal = useMemo(() => Math.max(1, ...yearMonths), [yearMonths])
  const maxDayCal = useMemo(() => {
    let m = 0
    dayCalMap.forEach((v) => {
      if (v > m) m = v
    })
    return Math.max(1, m)
  }, [dayCalMap])

  function deleteEntry(index: number) {
    patchState((s) => {
      const key = dateKeyStr
      const arr = s.logsByDate[key] ? [...s.logsByDate[key]] : []
      arr.splice(index, 1)
      const next = { ...s.logsByDate }
      if (arr.length === 0) delete next[key]
      else next[key] = arr
      return { ...s, logsByDate: next }
    })
  }

  function shiftMonth(delta: number) {
    const d = new Date(monthAnchor)
    d.setMonth(d.getMonth() + delta)
    setViewDate(d)
  }

  function shiftYear(delta: number) {
    const d = new Date(viewDate)
    d.setFullYear(d.getFullYear() + delta)
    setViewDate(d)
  }

  function pickDay(day: number) {
    const d = new Date(year, monthIndex, day)
    setViewDate(d)
    setPeriod('day')
  }

  const dim = daysInMonth(year, monthIndex)
  const firstDow = new Date(year, monthIndex, 1).getDay()
  const blanks = Array.from({ length: firstDow }, (_, i) => <div key={`b-${i}`} className="cal-cell cal-cell--blank" />)
  const cells = Array.from({ length: dim }, (_, i) => {
    const day = i + 1
    const k = dateKey(new Date(year, monthIndex, day))
    const cal = dayCalMap.get(day)
    const isToday = k === dateKey(new Date())
    const intensity = cal != null ? Math.min(100, (cal / maxDayCal) * 100) : 0
    return (
      <button
        key={k}
        type="button"
        className={`cal-cell${isToday ? ' cal-cell--today' : ''}${cal ? ' cal-cell--has' : ''}`}
        onClick={() => pickDay(day)}
        title={cal != null ? `${cal} kcal` : 'ไม่มีข้อมูล'}
      >
        <span className="cal-cell__num">{day}</span>
        {cal != null && (
          <span className="cal-cell__heat" style={{ opacity: 0.15 + (intensity / 100) * 0.85 }} />
        )}
        {cal != null && <span className="cal-cell__kcal">{cal}</span>}
      </button>
    )
  })

  return (
    <div className="tab-panel tab-panel--history">
      <div className="subtabs" role="tablist" aria-label="มุมมองประวัติ">
        <button
          type="button"
          role="tab"
          aria-selected={period === 'day'}
          className={`subtab${period === 'day' ? ' subtab--on' : ''}`}
          onClick={() => setPeriod('day')}
        >
          รายวัน
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={period === 'month'}
          className={`subtab${period === 'month' ? ' subtab--on' : ''}`}
          onClick={() => setPeriod('month')}
        >
          รายเดือน
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={period === 'year'}
          className={`subtab${period === 'year' ? ' subtab--on' : ''}`}
          onClick={() => setPeriod('year')}
        >
          รายปี
        </button>
      </div>

      {period === 'day' && (
        <article className="surface surface--elevated surface--full history-day">
          <div className="surface__head">
            <h2 className="surface__title">Food Diary</h2>
            <p className="surface__sub">มื้อทั้งหมดของวันที่เลือก (เก็บในเบราว์เซอร์นี้)</p>
          </div>
          <DiaryList entries={entries} onDelete={deleteEntry} onImageClick={onOpenLightbox} />
        </article>
      )}

      {period === 'month' && (
        <article className="surface surface--elevated surface--full">
          <div className="surface__head surface__head--row">
            <div>
              <h2 className="surface__title">ปฏิทินแคลอรี่</h2>
              <p className="surface__sub">คลิกวันเพื่อไปดูรายละเอียดมื้อ (แท็บรายวัน)</p>
            </div>
            <div className="period-nav">
              <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="เดือนก่อน">
                ‹
              </button>
              <span className="period-nav__label">
                {viewDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
              </span>
              <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="เดือนถัดไป">
                ›
              </button>
            </div>
          </div>
          <div className="cal-weekdays" aria-hidden>
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => (
              <span key={d} className="cal-weekdays__d">
                {d}
              </span>
            ))}
          </div>
          <div className="cal-grid">
            {blanks}
            {cells}
          </div>
        </article>
      )}

      {period === 'year' && (
        <article className="surface surface--elevated surface--full">
          <div className="surface__head surface__head--row">
            <div>
              <h2 className="surface__title">สรุปพลังงานรายเดือน</h2>
              <p className="surface__sub">ผลรวม kcal ทั้งเดือน (จากมื้อที่บันทึก)</p>
            </div>
            <div className="period-nav">
              <button type="button" className="icon-btn" onClick={() => shiftYear(-1)} aria-label="ปีก่อน">
                ‹
              </button>
              <span className="period-nav__label">{year}</span>
              <button type="button" className="icon-btn" onClick={() => shiftYear(1)} aria-label="ปีถัดไป">
                ›
              </button>
            </div>
          </div>
          <div className="year-bars" role="list">
            {yearMonths.map((total, mi) => {
              const w = Math.min(100, (total / maxMonthCal) * 100)
              return (
                <div key={MONTH_NAMES[mi]} className="year-bar-row" role="listitem">
                  <span className="year-bar__name">{MONTH_NAMES[mi]}</span>
                  <div className="year-bar__track">
                    <span className="year-bar__fill" style={{ width: `${w}%` }} />
                  </div>
                  <span className="year-bar__val">{total.toLocaleString()} kcal</span>
                </div>
              )
            })}
          </div>
        </article>
      )}
    </div>
  )
}
