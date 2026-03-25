import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ChatMessage, ChatSessionRecord } from '../types'
import { formatAssistantReply, escapeHtml } from '../lib/format'
import { buildLogEntryFromAnalysis } from '../lib/entryFromApi'
import { useFood } from './FoodContext'
import { thumbDataUrl } from '../api/analyze'

const CHAT_HISTORY_KEY = 'food-ai-chat-history-v1'
const MAX_CHAT_SESSIONS = 40
const CHAT_SIZE_KEY = 'food-ai-chat-size-v1'
const FAB_HINT_KEY = 'food-ai-chat-fab-hint-v1'

export type ChatSize = 'normal' | 'wide' | 'max'

function loadChatStore(): { sessions: ChatSessionRecord[] } {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY)
    if (!raw) return { sessions: [] }
    const p = JSON.parse(raw) as { sessions?: ChatSessionRecord[] }
    return { sessions: Array.isArray(p.sessions) ? p.sessions : [] }
  } catch {
    return { sessions: [] }
  }
}

function saveChatStore(store: { sessions: ChatSessionRecord[] }) {
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(store))
  } catch {
    if (store.sessions.length > 1) {
      store.sessions = store.sessions.slice(0, Math.ceil(store.sessions.length / 2))
      try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(store))
      } catch {
        /* quota */
      }
    }
  }
}

function sessionTitleFromMessages(messages: ChatMessage[]): string {
  const u = messages.find((m) => m.role === 'user')
  if (u && u.role === 'user' && u.text && String(u.text).trim()) {
    const t = String(u.text).trim()
    return t.length > 56 ? `${t.slice(0, 56)}…` : t
  }
  if (u && u.role === 'user' && 'imageDataUrl' in u && u.imageDataUrl) return 'แชทมีรูปภาพ'
  return 'แชท'
}

type ChatContextValue = {
  chatOpen: boolean
  setChatOpen: (v: boolean) => void
  chatSize: ChatSize
  setChatSize: (m: ChatSize) => void
  chatMessages: ChatMessage[]
  chatSessionId: string
  newChat: () => void
  openSession: (id: string) => void
  deleteSession: (id: string) => void
  sessions: ChatSessionRecord[]
  historyOpen: boolean
  setHistoryOpen: (v: boolean) => void
  sendChat: (text: string, file: File | null) => Promise<void>
  fabHintVisible: boolean
  dismissFabHint: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const { patchState, dateKeyStr } = useFood()
  const [chatOpen, setChatOpenState] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [chatSize, setChatSizeState] = useState<ChatSize>(() => {
    try {
      const s = localStorage.getItem(CHAT_SIZE_KEY)
      if (s === 'wide' || s === 'max') return s
    } catch {
      /* ignore */
    }
    return 'normal'
  })
  const [chatSessionId, setChatSessionId] = useState<string>(() => crypto.randomUUID())
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [sessionsTick, setSessionsTick] = useState(0)
  const [fabHintVisible, setFabHintVisible] = useState(() => {
    try {
      return !localStorage.getItem(FAB_HINT_KEY)
    } catch {
      return false
    }
  })

  const sessions = useMemo(() => {
    const store = loadChatStore()
    return [...store.sessions].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }, [sessionsTick, chatSessionId, chatMessages])

  const persistSession = useCallback((sid: string, messages: ChatMessage[]) => {
    if (!sid || messages.length === 0) return
    const store = loadChatStore()
    const title = sessionTitleFromMessages(messages)
    const updatedAt = new Date().toISOString()
    const record: ChatSessionRecord = {
      id: sid,
      title,
      updatedAt,
      messages: JSON.parse(JSON.stringify(messages)) as ChatMessage[],
    }
    const others = store.sessions.filter((s) => s.id !== sid)
    store.sessions = [record, ...others].slice(0, MAX_CHAT_SESSIONS)
    saveChatStore(store)
    setSessionsTick((x) => x + 1)
  }, [])

  const setChatSize = useCallback((m: ChatSize) => {
    const mode = m === 'wide' || m === 'max' ? m : 'normal'
    setChatSizeState(mode)
    try {
      localStorage.setItem(CHAT_SIZE_KEY, mode)
    } catch {
      /* ignore */
    }
  }, [])

  const dismissFabHint = useCallback(() => {
    setFabHintVisible(false)
    try {
      localStorage.setItem(FAB_HINT_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [])

  const setChatOpen = useCallback(
    (v: boolean) => {
      if (v) dismissFabHint()
      setChatOpenState(v)
    },
    [dismissFabHint],
  )

  const newChat = useCallback(() => {
    persistSession(chatSessionId, chatMessages)
    setChatSessionId(crypto.randomUUID())
    setChatMessages([])
  }, [chatSessionId, chatMessages, persistSession])

  const openSession = useCallback(
    (id: string) => {
      if (!id) return
      const store = loadChatStore()
      const s = store.sessions.find((x) => x.id === id)
      if (!s || !Array.isArray(s.messages)) return
      persistSession(chatSessionId, chatMessages)
      setChatSessionId(s.id)
      setChatMessages(JSON.parse(JSON.stringify(s.messages)) as ChatMessage[])
      setHistoryOpen(false)
    },
    [chatSessionId, chatMessages, persistSession],
  )

  const deleteSession = useCallback(
    (id: string) => {
      if (!id) return
      const store = loadChatStore()
      store.sessions = store.sessions.filter((s) => s.id !== id)
      saveChatStore(store)
      if (id === chatSessionId) {
        setChatSessionId(crypto.randomUUID())
        setChatMessages([])
      }
      setSessionsTick((x) => x + 1)
    },
    [chatSessionId],
  )

  useEffect(() => {
    const store = loadChatStore()
    if (!store.sessions.length) return
    const sorted = [...store.sessions].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    const latest = sorted[0]
    setChatSessionId(latest.id)
    setChatMessages(JSON.parse(JSON.stringify(latest.messages || [])) as ChatMessage[])
  }, [])

  useEffect(() => {
    if (!fabHintVisible) return
    const t = window.setTimeout(() => dismissFabHint(), 9000)
    return () => window.clearTimeout(t)
  }, [fabHintVisible, dismissFabHint])

  const sendChat = useCallback(
    async (text: string, file: File | null) => {
      const trimmed = text.trim()
      if (!file && !trimmed) return

      let userMsg: ChatMessage
      if (file) {
        const imageDataUrl = await thumbDataUrl(file)
        userMsg = { role: 'user', text: trimmed, imageDataUrl }
      } else {
        userMsg = { role: 'user', text: trimmed }
      }

      setChatMessages((prev) => {
        const next = [...prev, userMsg]
        persistSession(chatSessionId, next)
        return next
      })

      if (!file) {
        const assistantHtml = `<div class="msg__text">แนบรูปอาหารแล้วกดส่งได้เลยครับ — ระบบจะวิเคราะห์ผ่าน API จริง (YOLO + Gemini) และส่ง JSON โภชนาการกลับมาให้</div>`
        const assistantMsg: ChatMessage = { role: 'assistant', html: assistantHtml, isError: false }
        setChatMessages((prev) => {
          const next = [...prev, assistantMsg]
          persistSession(chatSessionId, next)
          return next
        })
        return
      }

      try {
        const { entry, data } = await buildLogEntryFromAnalysis(file)
        patchState((s) => {
          const key = dateKeyStr
          const arr = s.logsByDate[key] ? [...s.logsByDate[key]] : []
          arr.unshift(entry)
          return { ...s, logsByDate: { ...s.logsByDate, [key]: arr } }
        })
        const assistantHtml = formatAssistantReply(data)
        const assistantMsg: ChatMessage = { role: 'assistant', html: assistantHtml, isError: false }
        setChatMessages((prev) => {
          const next = [...prev, assistantMsg]
          persistSession(chatSessionId, next)
          return next
        })
      } catch (e) {
        const err = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'
        const errHtml = `<div class="msg__text">${escapeHtml(err)}</div>`
        const assistantMsg: ChatMessage = { role: 'assistant', html: errHtml, isError: true }
        setChatMessages((prev) => {
          const next = [...prev, assistantMsg]
          persistSession(chatSessionId, next)
          return next
        })
      }
    },
    [chatSessionId, dateKeyStr, patchState, persistSession],
  )

  const value = useMemo(
    () => ({
      chatOpen,
      setChatOpen,
      chatSize,
      setChatSize,
      chatMessages,
      chatSessionId,
      newChat,
      openSession,
      deleteSession,
      sessions,
      historyOpen,
      setHistoryOpen,
      sendChat,
      fabHintVisible,
      dismissFabHint,
    }),
    [
      chatOpen,
      setChatOpen,
      chatSize,
      setChatSize,
      chatMessages,
      chatSessionId,
      newChat,
      openSession,
      deleteSession,
      sessions,
      historyOpen,
      sendChat,
      fabHintVisible,
      dismissFabHint,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
