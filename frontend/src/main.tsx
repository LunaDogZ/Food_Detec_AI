import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { FoodProvider } from './context/FoodContext'
import { ChatProvider } from './context/ChatContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FoodProvider>
      <ChatProvider>
        <App />
      </ChatProvider>
    </FoodProvider>
  </StrictMode>,
)
