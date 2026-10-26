import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext.jsx'
import App from './App.jsx'
import { sincronizarFila } from './lib/sync.js'

// Tenta sincronizar assim que o app abrir
sincronizarFila()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)