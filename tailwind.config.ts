// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        point: '#5B5BD6',
        'point-light': 'rgba(91,91,214,0.10)',
        bg: '#FAFAF9',
        text: '#1A1A1A',
      },
      fontFamily: {
        pretendard: ['Pretendard', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
