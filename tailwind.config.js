/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Use Satoshi as the default sans font across the app
        sans: [
          'Satoshi',
          'ui-sans-serif',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
      },
      colors: {
        // Legacy brand tokens (kept for backward compatibility if referenced)
        'brand-blue': 'rgb(var(--brand-blue) / <alpha-value>)',
        'brand-coral': 'rgb(var(--brand-coral) / <alpha-value>)',
        'brand-butter': 'rgb(var(--brand-butter) / <alpha-value>)',
        'brand-lavender': 'rgb(var(--brand-lavender) / <alpha-value>)',
        'brand-cream': 'rgb(var(--brand-cream) / <alpha-value>)',
        // Varuna palette
        'v-offblack': 'rgb(var(--v-offblack) / <alpha-value>)',
        'v-paper': 'rgb(var(--v-paper) / <alpha-value>)',
        'v-turquoise': 'rgb(var(--v-turquoise) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
