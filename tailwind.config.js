/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      width: {
        '58mm': '58mm',
        '80mm': '80mm', 
        '112mm': '112mm',
      },
      maxWidth: {
        '58mm': '58mm',
        '80mm': '80mm',
        '112mm': '112mm',
      },
      minWidth: {
        '58mm': '58mm', 
        '80mm': '80mm',
        '112mm': '112mm',
      },
      colors: {
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          400: '#4ade80',
          700: '#15803d',
          800: '#166534',
        },
        yellow: {
          50: '#fefce8',
          200: '#fef08a',
          800: '#854d0e',
        },
        red: {
          50: '#fef2f2',
          200: '#fecaca',
          700: '#b91c1c',
        }
      }
    },
  },
  plugins: [],
}
