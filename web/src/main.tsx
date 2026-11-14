import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { initPWA } from './services/pwa'
import App from './App'
import './theme'
import './styles/global.css'

initPWA()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/finflow">
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
