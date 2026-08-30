// Shared Tailwind theme — the event's brand colors live here.
// When the backend exists, GET /api/events/{slug} can return a `theme`
// object and this file becomes a small function that maps it onto the
// same token names, so no page markup ever has to change.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF1F2', 100: '#FFE1E3', 200: '#FFC2C7', 300: '#FF97A0',
          400: '#F65C6B', 500: '#E11D3C', 600: '#C4142F', 700: '#9F0F27',
          800: '#7A0C1F', 900: '#5C0918'
        },
        ink: {
          50: '#F7F5F4', 100: '#EDE8E6', 200: '#D9D0CC', 300: '#B8A9A2',
          400: '#8F7B72', 500: '#6B5A52', 600: '#4D3F39', 700: '#372B27',
          800: '#241B18', 900: '#1A1310'
        },
        cream: '#FFFBF8',
        sand: '#F3ECE7',
        gold: { 400: '#F0B429', 500: '#E8A33D', 600: '#C77F1E' },
        blush: '#FFD9CE'
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'serif'],
        body: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: { '3xl': '1.75rem', '4xl': '2.25rem' },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(26,19,16,0.08), 0 8px 24px -8px rgba(26,19,16,0.10)',
        lift: '0 14px 32px -10px rgba(225,29,60,0.35)'
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(14px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pop: { '0%': { opacity: 0, transform: 'scale(.92)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        slideUp: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } }
      },
      animation: {
        rise: 'rise .5s cubic-bezier(.2,.7,.3,1) both',
        pop: 'pop .28s cubic-bezier(.2,.7,.3,1) both',
        slideUp: 'slideUp .32s cubic-bezier(.2,.7,.3,1) both'
      }
    }
  }
}
