import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppState, LogEntry } from '../types'
import { loadState, saveState } from '../lib/storage'
import { dateKey } from '../lib/dates'

type FoodContextValue = {
  state: AppState
  patchState: (fn: (s: AppState) => AppState) => void
  viewDate: Date
  setViewDate: (d: Date) => void
  dateKeyStr: string
}

const FoodContext = createContext<FoodContextValue | null>(null)

export function FoodProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())
  const [viewDate, setViewDateState] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const patchState = useCallback((fn: (s: AppState) => AppState) => {
    setState((prev) => {
      const next = fn(prev)
      saveState(next)
      return next
    })
  }, [])

  const setViewDate = useCallback((d: Date) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    setViewDateState(x)
  }, [])

  const dateKeyStr = useMemo(() => dateKey(viewDate), [viewDate])

  const value = useMemo(
    () => ({ state, patchState, viewDate, setViewDate, dateKeyStr }),
    [state, patchState, viewDate, setViewDate, dateKeyStr],
  )

  return <FoodContext.Provider value={value}>{children}</FoodContext.Provider>
}

export function useFood() {
  const ctx = useContext(FoodContext)
  if (!ctx) throw new Error('useFood must be used within FoodProvider')
  return ctx
}

export function useLogsForDay(key: string): LogEntry[] {
  const { state } = useFood()
  return state.logsByDate[key] || []
}
