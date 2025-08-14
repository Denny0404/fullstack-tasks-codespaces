import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'   // ⬅️ add this line
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
