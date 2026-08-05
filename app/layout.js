export const metadata = {
  title: 'Zirium AI — Cold Email Tool',
  description: 'Personalized outreach with human approval',
  icons: { icon: '/logo.png' },
};

// Global Liquid Glass & Interaction styles with Theme Variables
const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  :root {
    --bg-page: #f8fafc;
    --bg-mesh-1: rgba(14, 165, 233, 0.08);
    --bg-mesh-2: rgba(99, 102, 241, 0.08);
    --bg-mesh-3: rgba(16, 185, 129, 0.05);
    --card-bg: rgba(255, 255, 255, 0.75);
    --card-border: rgba(255, 255, 255, 0.85);
    --card-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.7) inset;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --accent: #0284c7;
    --accent-glow: rgba(2, 132, 199, 0.16);
    --input-bg: rgba(255, 255, 255, 0.85);
    --input-border: rgba(203, 213, 225, 0.8);
    --header-bg: rgba(255, 255, 255, 0.72);
    --subtle-card-bg: rgba(241, 245, 249, 0.8);
    --table-header-bg: rgba(248, 250, 252, 0.6);
    --table-hover-bg: rgba(241, 245, 249, 0.5);
    --preview-bg: #ffffff;
    --preview-header-bg: #f8fafc;
    --preview-border: #e2e8f0;
  }

  [data-theme='dark'] {
    --bg-page: #0b0f17;
    --bg-mesh-1: rgba(14, 165, 233, 0.12);
    --bg-mesh-2: rgba(99, 102, 241, 0.14);
    --bg-mesh-3: rgba(16, 185, 129, 0.08);
    --card-bg: rgba(15, 23, 42, 0.75);
    --card-border: rgba(255, 255, 255, 0.12);
    --card-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --accent: #38bdf8;
    --accent-glow: rgba(56, 189, 248, 0.2);
    --input-bg: rgba(30, 41, 59, 0.75);
    --input-border: rgba(51, 65, 85, 0.8);
    --header-bg: rgba(15, 23, 42, 0.8);
    --subtle-card-bg: rgba(30, 41, 59, 0.6);
    --table-header-bg: rgba(15, 23, 42, 0.8);
    --table-hover-bg: rgba(30, 41, 59, 0.5);
    --preview-bg: #0f172a;
    --preview-header-bg: #1e293b;
    --preview-border: #334155;
  }

  * {
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  html {
    scroll-behavior: smooth;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
  }
  body {
    margin: 0;
    min-height: 100vh;
    background: var(--bg-page);
    background-image: 
      radial-gradient(at 0% 0%, var(--bg-mesh-1) 0px, transparent 50%),
      radial-gradient(at 100% 0%, var(--bg-mesh-2) 0px, transparent 50%),
      radial-gradient(at 50% 100%, var(--bg-mesh-3) 0px, transparent 50%);
    background-attachment: fixed;
    color: var(--text-primary);
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  /* Glowing liquid focus ring */
  input:focus, textarea:focus, select:focus {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 4px var(--accent-glow), inset 0 1px 2px rgba(255, 255, 255, 0.5) !important;
    outline: none !important;
  }

  button {
    font-family: inherit;
    transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), 
                box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1), 
                background-color 0.15s ease, 
                border-color 0.15s ease, 
                opacity 0.15s ease, 
                filter 0.15s ease;
  }
  button:hover:not(:disabled) {
    filter: brightness(1.05);
    transform: translateY(-1px);
  }
  button:active:not(:disabled) {
    transform: scale(0.98) translateY(0px) !important;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Sleek table rows */
  tbody tr {
    transition: background-color 0.15s ease, transform 0.15s ease;
  }
  tbody tr:hover {
    background-color: var(--table-hover-bg) !important;
  }

  /* Pulse animation */
  @keyframes pulseGlow {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.15); }
  }
  .pulse-dot {
    animation: pulseGlow 2s infinite ease-in-out;
  }

  /* Custom glass scrollbars */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: rgba(241, 245, 249, 0.3);
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
    border-radius: 999px;
    border: 2px solid rgba(241, 245, 249, 0.3);
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.6);
  }

  ::placeholder {
    color: var(--text-muted);
  }
  ::selection {
    background: var(--accent-glow);
    color: var(--text-primary);
  }

  @media (max-width: 720px) {
    main {
      padding-left: 14px !important;
      padding-right: 14px !important;
    }
    textarea {
      min-height: 140px !important;
    }
  }
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Zirium AI — Enterprise Cold Email Outreach</title>
        <meta name="description" content="AI-Powered Personalized Cold Email Outreach with Live Approval & Analytics" />
        <link rel="icon" href="/logo.png" />
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}


