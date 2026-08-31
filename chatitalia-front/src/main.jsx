import { ClerkProvider } from '@clerk/react';
import { ptBR } from '@clerk/localizations';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider localization={ptBR} afterSignOutUrl="/your-time">
      <App />
    </ClerkProvider>
  </StrictMode>,
)