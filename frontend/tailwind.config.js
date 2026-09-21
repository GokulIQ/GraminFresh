/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],

  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2F5233',
          light: '#4C7A52',
          dark: '#1E3A22',
        },

        accent: {
          DEFAULT: '#E3A008',
          light: '#F4C430',
        },

        husk: '#FBF9F4',
        clay: '#C0392B',
        ink: '#1E2B1F',
      },

      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        admin: ['"Inter"', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },

      borderRadius: {
        card: '1.875rem',
        input: '1rem',
      },

      boxShadow: {
        crate: '0 16px 44px -12px rgba(47, 82, 51, 0.30)',

        glass:
          '0 24px 60px rgba(29, 54, 35, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.85)',

        input:
          '0 8px 24px rgba(29, 54, 35, 0.07)',
      },

      backdropBlur: {
        glass: '24px',
      },
    },
  },

  plugins: [],
}