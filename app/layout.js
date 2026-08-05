export const metadata = {
  title: 'Zirium AI — Cold Email Tool',
  description: 'Personalized outreach with human approval',
  icons: { icon: '/logo.png' },
};

// Global interaction styles (focus rings, hover, disabled) that inline styles
// can't express — these are what make the UI feel finished.
const globalCss = `
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
  input:focus, textarea:focus, select:focus {
    border-color: #1597c8 !important;
    box-shadow: 0 0 0 3px rgba(21, 151, 200, 0.16);
  }
  button { transition: filter .12s ease, opacity .12s ease, background .12s ease, border-color .12s ease, transform .12s ease; }
  button:hover:not(:disabled) { filter: brightness(0.97); }
  button:active:not(:disabled) { transform: translateY(1px); }
  button:disabled { opacity: .5; cursor: not-allowed; }
  tbody tr { transition: background .1s ease; }
  tbody tr:hover { background: #fbfcfe; }
  ::placeholder { color: #9aa3b0; }
  ::selection { background: rgba(21, 151, 200, 0.22); }
  @media (max-width: 720px) {
    main { padding-left: 14px !important; padding-right: 14px !important; }
    textarea { min-height: 140px !important; }
  }
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body
        style={{ margin: 0, background: '#f5f7fb', color: '#1f2933', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
