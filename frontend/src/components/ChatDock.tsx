import { useCallback, useEffect, useRef, useState } from 'react'
import { useChat } from '../context/ChatContext'
import type { ChatMessage } from '../types'

function ChatMessageView({ m }: { m: ChatMessage }) {
  if (m.role === 'user') {
    return (
      <div className="msg msg--user">
        {m.imageDataUrl ? <img className="msg__img" src={m.imageDataUrl} alt="" /> : null}
        {m.text ? <div className="msg__text">{m.text}</div> : null}
      </div>
    )
  }
  return (
    <div className={`msg msg--assistant${m.isError ? ' msg--err' : ''}`}>
      <div dangerouslySetInnerHTML={{ __html: m.html }} />
    </div>
  )
}

export function ChatDock({
  onImageInChatClick,
}: {
  onImageInChatClick: (src: string) => void
}) {
  const {
    chatOpen,
    setChatOpen,
    chatSize,
    setChatSize,
    chatMessages,
    newChat,
    openSession,
    deleteSession,
    sessions,
    historyOpen,
    setHistoryOpen,
    sendChat,
    fabHintVisible,
    chatSessionId,
  } = useChat()

  const [text, setText] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = chatRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [chatMessages, sending, chatOpen])

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      if (historyOpen) {
        setHistoryOpen(false)
        return
      }
      if (chatOpen) setChatOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [chatOpen, historyOpen, setChatOpen, setHistoryOpen])

  const clearPending = useCallback(() => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [pendingPreview])

  const onPickFile = (f: File | null) => {
    clearPending()
    if (!f) return
    setPendingFile(f)
    setPendingPreview(URL.createObjectURL(f))
  }

  const onSend = async () => {
    const t = text.trim()
    if (!t && !pendingFile) return
    const f = pendingFile
    setSending(true)
    setText('')
    clearPending()
    try {
      await sendChat(t, f)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {!chatOpen && fabHintVisible && (
        <div className="chat-fab-hint">
          <span className="chat-fab-hint__arrow" aria-hidden>
            ↓
          </span>
          <p className="chat-fab-hint__text">กดปุ่มนี้เพื่อเปิดแชท AI</p>
        </div>
      )}

      <button
        type="button"
        className="chat-fab"
        aria-label="เปิด Nutrition AI"
        aria-expanded={chatOpen}
        aria-controls="ai-panel"
        hidden={chatOpen}
        onClick={() => setChatOpen(true)}
      >
        <svg
          className="chat-fab__icon"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </button>

      <div
        className="chat-panel-backdrop"
        hidden={!chatOpen}
        onClick={() => setChatOpen(false)}
        aria-hidden={!chatOpen}
      />

      <aside
        id="ai-panel"
        className="ai-panel"
        hidden={!chatOpen}
        aria-hidden={!chatOpen}
      >
        <div className="ai-panel__head">
          <div className="ai-panel__head-top">
            <div className="ai-panel__head-titles">
              <h2 id="ai-panel-title">Nutrition AI</h2>
              <span className="badge badge--live">Active</span>
            </div>
            <button
              type="button"
              className="btn-chat-close"
              title="ปิดแพนแชท"
              aria-label="ปิดแพนแชท"
              onClick={() => setChatOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="ai-panel__toolbar">
            <div className="ai-panel__size" role="group" aria-label="ขนาดแพนแชท">
              {(['normal', 'wide', 'max'] as const).map((m, i) => (
                <button
                  key={m}
                  type="button"
                  className={`btn-chat-size${chatSize === m ? ' btn-chat-size--active' : ''}`}
                  data-chat-size={m}
                  title={m === 'normal' ? 'แคบ' : m === 'wide' ? 'กลาง' : 'กว้าง'}
                  onClick={() => setChatSize(m)}
                >
                  {['S', 'M', 'L'][i]}
                </button>
              ))}
            </div>
            <div className="ai-panel__actions">
              <button
                type="button"
                className="btn-chat-history"
                aria-expanded={historyOpen}
                aria-controls="chat-history-sheet"
                onClick={() => setHistoryOpen(!historyOpen)}
              >
                ประวัติ
              </button>
              <button type="button" className="btn-new-chat" onClick={newChat}>
                แชทใหม่
              </button>
            </div>
          </div>
        </div>

        <div
          className="chat"
          id="chat"
          ref={chatRef}
          onClick={(ev) => {
            const img = (ev.target as HTMLElement).closest('.msg__img, .msg-visual img')
            if (!img || !(img instanceof HTMLImageElement)) return
            const src = img.getAttribute('src')
            if (src) {
              ev.preventDefault()
              onImageInChatClick(src)
            }
          }}
        >
          {!chatMessages.length && (
            <div className="chat__welcome muted small">
              อัปโหลดรูปอาหารแล้วกดส่ง — ระบบจะเรียก API วิเคราะห์จริงจากเซิร์ฟเวอร์ของคุณ
            </div>
          )}
          {chatMessages.map((m, i) => (
            <ChatMessageView key={i} m={m} />
          ))}
          {sending && (
            <div className="typing" id="chat-typing">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>

        <div className="chat-composer">
          {pendingFile && pendingPreview && (
            <div className="chat-pending">
              <div className="chat-pending__thumb-wrap">
                <img className="chat-pending__thumb" src={pendingPreview} alt="" width={48} height={48} />
              </div>
              <div className="chat-pending__info">
                <span className="chat-pending__badge">พร้อมส่ง</span>
                <span className="chat-pending__name">{pendingFile.name}</span>
              </div>
              <button
                type="button"
                className="chat-pending__clear"
                title="เอารูปออก"
                aria-label="เอารูปออก"
                onClick={clearPending}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="chat-input-wrap">
            <input
              type="text"
              className="chat-input"
              placeholder="พิมพ์ข้อความ หรือแนบรูปด้านขวา…"
              autoComplete="off"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void onSend()
                }
              }}
            />
            <div className="chat-input-wrap__tail">
              <div className="chat-attach">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className={`btn-attach${pendingFile ? ' btn-attach--ready' : ''}`}
                  title="แนบรูปอาหาร"
                  aria-label="แนบรูปอาหาร"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg className="btn-attach__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.85" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
                    <path
                      d="M21 15l-5-5L5 21"
                      stroke="currentColor"
                      strokeWidth="1.85"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <button type="button" className="btn btn--send" onClick={() => void onSend()} disabled={sending}>
                Send
              </button>
            </div>
          </div>
        </div>
        <p className="ai-foot muted small">
          ถ่ายรูปอาหารหรืออธิบายมื้อ — ผลลัพธ์มาจากการวิเคราะห์ภาพ (YOLO + Gemini)
        </p>

        <div className="chat-history-sheet" id="chat-history-sheet" hidden={!historyOpen}>
          <button
            type="button"
            className="chat-history-sheet__backdrop"
            tabIndex={-1}
            aria-hidden
            onClick={() => setHistoryOpen(false)}
          />
          <div
            className="chat-history-sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-history-title"
          >
            <div className="chat-history-sheet__head">
              <h3 className="chat-history-sheet__title" id="chat-history-title">
                ประวัติแชท
              </h3>
              <button
                type="button"
                className="chat-history-sheet__close"
                aria-label="ปิด"
                onClick={() => setHistoryOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="chat-history-sheet__hint muted small">เก็บในเบราว์เซอร์นี้เท่านั้น (สูงสุด ~40 รายการ)</p>
            <div className="chat-history-sheet__list-wrap">
              {!sessions.length ? (
                <p className="chat-history-sheet__empty muted small">ยังไม่มีแชทที่บันทึก</p>
              ) : (
                <div className="chat-history-sheet__list">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`chat-history-row${s.id === chatSessionId ? ' chat-history-row--current' : ''}`}
                    >
                      <button
                        type="button"
                        className="chat-history-item"
                        onClick={() => openSession(s.id)}
                      >
                        <span className="chat-history-item__title">{s.title || 'แชท'}</span>
                        <span className="chat-history-item__time muted">
                          {new Date(s.updatedAt).toLocaleString('th-TH', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="chat-history-item__del"
                        aria-label="ลบประวัตินี้"
                        onClick={() => deleteSession(s.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
