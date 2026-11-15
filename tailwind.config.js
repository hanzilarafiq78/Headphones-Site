/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./headphones.html",
    "./mouse.html",
    "./keyboard.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#050608',
          900: '#08090C',
          850: '#0C0E14',
          800: '#11141D',
          700: '#181D29',
        },
        cyber: {
          cyan: '#00F0FF',
          blue: '#0070F3',
          purple: '#7928CA',
          neon: '#10B981',
          gold: '#E5A93C',
        },
        stealth: {
          white: '#F0F4F8',
          gray: '#94A3B8',
          dark: '#334155',
        }
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Playfair Display', 'Cinzel', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Cabinet Grotesk', 'Plus Jakarta Sans', 'sans-serif'],
      },
      letterSpacing: {
        widest: '.2em',
        ultra: '.3em',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}

