import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0b0f19',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px',
      textAlign: 'center'
    }}>
      <div style={{
        backgroundColor: '#161b26',
        border: '1px solid #2d3748',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '480px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        <h1 style={{ fontSize: '72px', fontWeight: 800, margin: '0 0 8px 0', color: '#3b82f6', lineHeight: 1 }}>404</h1>
        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 12px 0', color: '#f8fafc' }}>Page Not Found</h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: 1.5 }}>
          The page or resource you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none'
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
