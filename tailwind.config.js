/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy colors (mantidas para compatibilidade)
        'boss-black': '#000000',
        'boss-white': '#FFFFFF',
        'boss-dark-gray': '#1A1A1A',
        'boss-medium-gray': '#2D2D2D',
        'boss-light-gray': '#444444',
        'boss-red': '#FF4500',
        'boss-orange': '#FF8C00',
        'boss-gold': '#FFD700',
        'text-primary': '#FFFFFF',
        'text-secondary': '#CCCCCC',
        'text-tertiary': '#999999',
        'text-placeholder': '#666666',
        // New Design System colors (Design.md)
        'boss-bg': '#0F0A1F',
        'boss-purple-deep': '#3A007F',
        'boss-purple': '#6F3DFF',
        'boss-purple-light': '#8B5CF6',
        'boss-blue': '#00A6FF',
        'boss-magenta': '#D946EF',
        'boss-teal': '#2DD4BF',
        'boss-pink': '#EC4899',
      },
      backgroundImage: {
        // Legacy gradients
        'gradient-boss': 'linear-gradient(135deg, #FF4500 0%, #FF8C00 50%, #FFD700 100%)',
        'gradient-boss-text': 'linear-gradient(135deg, #FF4500 0%, #FF8C00 50%, #FFD700 100%)',
        // New Design System gradients (Design.md)
        'gradient-bg': 'linear-gradient(180deg, #1A0B2E 0%, #16213E 50%, #0F0A1F 100%)',
        'gradient-orb': 'linear-gradient(135deg, #6F3DFF 0%, #00A6FF 50%, #D946EF 100%)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'subtle': '0 2px 4px rgba(0, 0, 0, 0.3)',
        'medium': '0 4px 8px rgba(0, 0, 0, 0.4)',
        'high': '0 8px 16px rgba(0, 0, 0, 0.5)',
        // New Design System shadows
        'glass': '0 8px 32px rgba(0, 0, 0, 0.2)',
        'glow-purple': '0 0 40px rgba(111, 61, 255, 0.15)',
        'glow-blue': '0 0 40px rgba(0, 166, 255, 0.15)',
      },
      fontFamily: {
        'display': ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'body': ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        'sans': ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      boxShadow: {
        'subtle': '0 2px 4px rgba(0, 0, 0, 0.3)',
        'medium': '0 4px 8px rgba(0, 0, 0, 0.4)',
        'high': '0 8px 16px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
