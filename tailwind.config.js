export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        heading:  ['"Syne"', 'sans-serif'],
        body:     ['"Outfit"', 'sans-serif'],
        mono:     ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink:     '#0C0F1A',
        deep:    '#111827',
        surface: '#161D2E',
        card:    '#1C2539',
        raised:  '#222D42',
        border:  '#2A3550',
        muted:   '#556080',
        dim:     '#8896B0',
        soft:    '#B8C4D8',
        bright:  '#E8EEF8',
        emerald: '#10B981',
        rose:    '#F43F5E',
        sky:     '#38BDF8',
      },
      boxShadow: {
        'card':        '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'raised':      '0 4px 16px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)',
        'glow-amber':  '0 0 24px rgba(245,158,11,0.2)',
        'glow-teal':   '0 0 24px rgba(20,184,166,0.15)',
      },
      backgroundOpacity: {
        '5':  '0.05',
        '8':  '0.08',
        '10': '0.10',
        '15': '0.15',
        '20': '0.20',
      },
    },
  },
  plugins: [],
}