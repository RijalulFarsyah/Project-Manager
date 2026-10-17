/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#FFFFFF',
        bg: '#F8FAFC',
        'text-primary': '#0F172A',
        'text-secondary': '#64748B',
        border: '#E2E8F0',
        primary: '#2563EB',
        'primary-hover': '#1D4ED8',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
        critical: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '8px',
        'input': '6px',
      },
    },
  },
  plugins: [],
};
