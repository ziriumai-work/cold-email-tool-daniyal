'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[Global Error Boundary Caught Error]:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        backgroundColor: '#0b0f19',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div style={{
          backgroundColor: '#161b26',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '480px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 12px 0' }}>Critical Application Error</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 24px 0' }}>
            {error?.message || 'A critical error occurred in the system layout.'}
          </p>
          <button
            onClick={() => reset()}
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
