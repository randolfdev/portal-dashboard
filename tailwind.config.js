/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb, 37 99 235) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover-rgb, 29 78 216) / <alpha-value>)',
          light: 'rgb(var(--color-primary-light-rgb, 147 187 253) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary-rgb, 124 58 237) / <alpha-value>)',
          hover: 'var(--color-secondary-hover, #6d28d9)',
          light: 'var(--color-secondary-light, #ede9fe)',
        },
      },
    },
  },
  plugins: [],
}
