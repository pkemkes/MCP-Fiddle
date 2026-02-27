/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fiddle: {
          bg: '#0f1117',
          panel: '#1a1d27',
          border: '#2a2d3a',
          accent: '#6366f1',
          'accent-hover': '#818cf8',
          success: '#22c55e',
          error: '#ef4444',
          warning: '#f59e0b',
          muted: '#6b7280',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
