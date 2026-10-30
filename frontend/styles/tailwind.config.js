/**
 * Frontend Styles — Tailwind CSS Configuration
 * Maps the exact Luminous Void (Dark) & Google Workspace (Light) CSS variables
 * to semantic Tailwind utility classes.
 */
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
          'Google Sans',
          'Google Sans Display',
          'Product Sans',
          'Plus Jakarta Sans',
          'Roboto',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif'
        ],
        mono: [
          'Google Sans Mono',
          'JetBrains Mono',
          'Roboto Mono',
          'monospace'
        ]
      },
      boxShadow: {
        card: 'var(--card-shadow)',
        'btn-primary': '0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(26, 115, 232, 0.25)',
        toast: '0 6px 24px rgba(0, 0, 0, 0.3)'
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease forwards',
        'modal-in': 'modalIn 0.2s ease forwards'
      }
    }
  }
};
