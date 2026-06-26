import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { seedIfNeeded } from './db/seed'
import { processRecurring } from './services/recurring'
import './styles/global.css'

const savedTheme = localStorage.getItem('finflow.web.theme')
if (savedTheme && savedTheme !== 'auto') {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

seedIfNeeded().then(() => {
  processRecurring().catch(err => console.error('Failed to process recurring:', err))
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
