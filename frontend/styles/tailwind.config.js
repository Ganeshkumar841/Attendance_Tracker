window.tailwind = window.tailwind || {};
window.tailwind.config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg)',
        elevated: 'var(--bg-elevated)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        'surface-hover': 'var(--surface-hover)',
        'surface-tint': 'var(--surface-tint)',
        input: 'var(--input-bg)',
        header: 'var(--header-bg)',
        theme: 'var(--border)',
        strong: 'var(--border-strong)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          text: 'var(--primary-text)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          2: 'var(--accent2)'
        },
        success: {
          DEFAULT: 'var(--success)',
          bg: 'var(--success-bg)'
        },
        warning: {
          DEFAULT: 'var(--warning)',
          bg: 'var(--warning-bg)'
        },
        danger: {
          DEFAULT: 'var(--danger)',
          bg: 'var(--danger-bg)'
        },
        main: 'var(--text)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--muted)'
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'Roboto Mono',
          'monospace'
        ]
      },
      boxShadow: {
        card: 'var(--card-shadow)',
        'btn-primary': '0 1px 2px rgba(0, 0, 0, 0.22), 0 4px 12px rgba(37, 99, 235, 0.26)',
        toast: '0 10px 30px rgba(0, 0, 0, 0.35)'
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        'slide-in': 'slideIn 0.18s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'modal-in': 'modalIn 0.18s cubic-bezier(0.22, 1, 0.36, 1) forwards'
      }
    }
  }
};
