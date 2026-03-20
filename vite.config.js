import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.VITE_GROQ_API_KEY) console.log('\n✅  Groq key loaded\n')
  else console.warn('\n⚠️  No Groq key in .env\n')

  return {
    plugins: [react()],
    server: { port: 5173 },
  }
})