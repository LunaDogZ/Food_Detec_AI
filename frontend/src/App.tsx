import { useState } from 'react'
import { useChat } from './context/ChatContext'
import { DateNav } from './components/DateNav'
import { DashboardTab } from './components/DashboardTab'
import { AdviceTab } from './components/AdviceTab'
import { HistoryTab } from './components/HistoryTab'
import { AddFoodModal } from './components/AddFoodModal'
import { ChatDock } from './components/ChatDock'

type MainTab = 'dashboard' | 'advice' | 'history'

function ImageLightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src) return null
  return (
    <div
      className="img-lightbox"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <button type="button" className="img-lightbox__close" onClick={onClose} aria-label="ปิด">
        ×
      </button>
      <img className="img-lightbox__img" src={src} alt="" />
    </div>
  )
}

export default function App() {
  const { chatOpen, chatSize } = useChat()
  const [tab, setTab] = useState<MainTab>('dashboard')
  const [modalOpen, setModalOpen] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const wClass =
    chatSize === 'wide' ? 'app--chat-w-wide' : chatSize === 'max' ? 'app--chat-w-max' : 'app--chat-w-normal'

  return (
    <div className={`app ${wClass}${chatOpen ? ' app--chat-open' : ''}`}>
      <main className="shell">
        <header className="shell__hero">
          <div className="shell__brand">
            <h1 className="shell__logo">
              <span className="shell__logo-mark" aria-hidden />
              Food AI
            </h1>
            <p className="shell__tagline">
              แดชบอร์ดโภชนาการ · คำแนะนำ · ประวัติมื้อ — ข้อมูลบันทึกในเบราว์เซอร์ของคุณ
            </p>
          </div>
          <div className="shell__toolbar">
            <DateNav />
            <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
              + เพิ่มมื้ออาหาร
            </button>
          </div>
        </header>

        <nav className="main-tabs" role="tablist" aria-label="มุมมองหลัก">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'dashboard'}
            className={`main-tab${tab === 'dashboard' ? ' main-tab--on' : ''}`}
            onClick={() => setTab('dashboard')}
          >
            แดชบอร์ด
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'advice'}
            className={`main-tab${tab === 'advice' ? ' main-tab--on' : ''}`}
            onClick={() => setTab('advice')}
          >
            คำแนะนำ
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'history'}
            className={`main-tab${tab === 'history' ? ' main-tab--on' : ''}`}
            onClick={() => setTab('history')}
          >
            ประวัติ &amp; ไดอารี่
          </button>
        </nav>

        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'advice' && <AdviceTab onOpenLightbox={setLightbox} />}
        {tab === 'history' && <HistoryTab onOpenLightbox={setLightbox} />}

        <footer className="dash-footer">
          <a href="/docs">API docs</a>
          <span className="sep">·</span>
          <a href="/health">Health</a>
        </footer>
      </main>

      <ChatDock onImageInChatClick={setLightbox} />
      <AddFoodModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  )
}
