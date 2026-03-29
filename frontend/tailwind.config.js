/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0f14',
        card: '#121821',
        accent: {
          DEFAULT: '#22c55e',
          hover: '#16a34a',
          light: '#4ade80',
          dark: '#15803d',
        },
        text: {
          primary: '#f3f4f6',
          secondary: '#9ca3af',
          muted: '#6b7280'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        'neon': '0 0 10px rgba(34, 197, 94, 0.2), 0 0 20px rgba(34, 197, 94, 0.1)',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(145deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
      }
    },
  },
  plugins: [],
}
