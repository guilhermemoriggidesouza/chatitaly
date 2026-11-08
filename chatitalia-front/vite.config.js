import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // O padrão do Vite 8 é Safari 16.4+. O navegador do Instagram/Facebook usa
    // a WebView do sistema, e iPhones em iOS 14–16.3 receberiam sintaxe que não
    // entendem (tela branca). Gera para navegadores com suporte a ES modules.
    target: ['es2020', 'safari14', 'chrome87', 'firefox78', 'edge88'],
  },
})
