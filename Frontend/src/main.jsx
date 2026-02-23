import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import logoUrl from './shared/assets/LogoWebsite.jpg?url'

// Set favicon to app logo (tab icon)
const favicon = document.getElementById('favicon')
if (favicon && logoUrl) {
  favicon.href = logoUrl
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
