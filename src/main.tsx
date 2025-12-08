import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import App from './App'
import './globals.css'

// Shell hiding is handled by CSS: #root:not(:empty) ~ #shell { display: none }
// This JS call is just a backup for edge cases
declare global {
  interface Window {
    __shellHide?: () => void
  }
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

// Backup: hide shell after first paint (CSS handles this, but just in case)
requestAnimationFrame(() => {
  window.__shellHide?.()
})
