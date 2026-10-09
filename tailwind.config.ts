import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dfe9ff',
          200: '#c5d6ff',
          300: '#a1baff',
          400: '#7b93fc',
          500: '#5b6ef5',
          600: '#4a4ee8',
          700: '#3f43c8',
          800: '#3438a1',
          900: '#2f337e',
        },
      },
    },
  },
  plugins: [],
};

export default config;
