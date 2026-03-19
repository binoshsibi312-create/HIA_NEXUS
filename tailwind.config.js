export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'cursive'],
        heading: ['"DM Sans"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        midnight: '#0B1120',
        navy: '#0F1A2E',
        surface: '#131F35',
        card: '#1A2740',
        border: '#243350',
        muted: '#64748B',
        teal: { 400: '#2DD4BF', 500: '#14B8A6', 600: '#0D9488' },
        amber: { 400: '#FBBF24', 500: '#F59E0B' },
        rose: { 400: '#FB7185', 500: '#F43F5E' },
        emerald: { 400: '#34D399', 500: '#10B981' },
      },
    },
  },
  plugins: [],
}