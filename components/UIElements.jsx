import { C } from './constants.js';
import { SearchIcon } from './Icons.jsx';

export function Section({ title, kicker, right, children }) {
  return (
    <section style={{
      marginTop: 24,
      background: 'var(--card-bg)',
      backdropFilter: 'blur(24px) saturate(190%)',
      WebkitBackdropFilter: 'blur(24px) saturate(190%)',
      border: '1px solid var(--card-border)',
      borderRadius: 24,
      boxShadow: 'var(--card-shadow)',
      overflow: 'hidden',
      transition: 'all 0.25s ease'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '18px 24px',
        borderBottom: '1px solid var(--card-border)',
        background: 'var(--table-header-bg)',
        flexWrap: 'wrap'
      }}>
        <div>
          {kicker && <div style={{ color: C.accent, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{kicker}</div>}
          <h2 style={{ fontSize: 17, margin: 0, fontWeight: 800, color: C.ink, letterSpacing: '-0.02em' }}>{title}</h2>
        </div>
        {right}
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </section>
  );
}

export function KPICard({ label, value, subtext, icon: IconComponent, color = C.accent }) {
  return (
    <div style={{
      flex: '1 1 200px',
      background: 'var(--card-bg)',
      backdropFilter: 'blur(20px)',
      border: '1px solid var(--card-border)',
      borderRadius: 20,
      padding: '18px 22px',
      boxShadow: 'var(--card-shadow)',
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }}>
      {IconComponent && (
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: color + '14',
          border: `1px solid ${color}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          flexShrink: 0
        }}>
          <IconComponent size={22} color={color} />
        </div>
      )}
      <div>
        <div style={{ fontSize: 12, fontWeight: 650, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, marginTop: 2, letterSpacing: '-0.03em' }}>{value}</div>
        {subtext && <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontWeight: 550 }}>{subtext}</div>}
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <SearchIcon size={15} color={C.sub} style={{ position: 'absolute', left: 12, pointerEvents: 'none' }} />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          padding: '8px 14px 8px 36px',
          borderRadius: 999,
          border: '1px solid var(--input-border)',
          background: 'var(--input-bg)',
          fontSize: 13,
          color: C.ink,
          outline: 'none',
          width: 220,
          transition: 'all 0.2s ease',
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.03)'
        }}
      />
    </div>
  );
}

export function Badge({ color, children, icon: IconComponent }) {
  return (
    <span style={{
      background: color + '14',
      color: color,
      border: `1px solid ${color}33`,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderRadius: 999,
      padding: '4px 11px',
      fontSize: 11,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }}>
      {IconComponent && <IconComponent size={12} color={color} />}
      {children}
    </span>
  );
}

export function Empty({ children, icon: IconComponent }) {
  return (
    <div style={{
      color: C.sub,
      margin: 0,
      fontSize: 14,
      padding: '32px 24px',
      border: '1px dashed var(--input-border)',
      borderRadius: 20,
      background: 'var(--subtle-card-bg)',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10
    }}>
      {IconComponent && <IconComponent size={32} color={C.muted} />}
      <div>{children}</div>
    </div>
  );
}

