import { formatHeaderDate } from '../lib/dates'
import { useFood } from '../context/FoodContext'

export function DateNav() {
  const { viewDate, setViewDate } = useFood()

  const prev = () => {
    const d = new Date(viewDate)
    d.setDate(d.getDate() - 1)
    setViewDate(d)
  }

  const next = () => {
    const tomorrow = new Date(viewDate)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (tomorrow > today) return
    setViewDate(tomorrow)
  }

  const canNext = (() => {
    const tomorrow = new Date(viewDate)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return tomorrow <= today
  })()

  return (
    <div className="date-nav" role="group" aria-label="เลือกวันที่">
      <button type="button" className="icon-btn" onClick={prev} aria-label="วันก่อน">
        ‹
      </button>
      <span className="date-nav__label">{formatHeaderDate(viewDate)}</span>
      <button
        type="button"
        className="icon-btn"
        onClick={next}
        disabled={!canNext}
        aria-label="วันถัดไป"
      >
        ›
      </button>
    </div>
  )
}
