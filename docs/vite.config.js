import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // Esta linha diz ao Vite para adicionar '/Z-containment/'
  // na frente de todos os caminhos de arquivos (CSS, JS, imagens, etc.).
  base: '/Z-containment/',
})