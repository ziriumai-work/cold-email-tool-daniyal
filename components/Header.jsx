import { C } from './constants.js';
import { MenuIcon, ZapIcon } from './Icons.jsx';

const TAB_META = {
  pipeline: { title: 'Outreach Pipeline', desc: 'Target prospects, email signatures, & approval draft queue' },
  deliverability: { title: 'Deliverability & Health', desc: 'Domain telemetry, DNS checks, inbox placement & SPF/DKIM' },
  sequences: { title: 'Branching Sequences', desc: 'Automated multi-step condition trees & smart delay triggers' },
  compliance: { title: 'Compliance & Spam', desc: 'CAN-SPAM/GDPR risk auditing, unsubscribe links & sentiment rules' },
  inbox: { title: 'AI Unified Inbox', desc: 'Centralized prospect conversation engine with auto-sentiment' },
  scoring: { title: 'Lead Scoring & Copilot', desc: 'AI intent scoring, prospect qualification & next action guidance' },
  crm: { title: 'CRM & Webhooks', desc: 'HubSpot/Salesforce bi-directional sync & real-time webhook events' },
  audit: { title: 'Security & Audit', desc: 'Role permissions, API token security logs & activity history' },
  roi: { title: 'Revenue ROI', desc: 'Attributed revenue metrics, deal tracking & pipeline conversion' },
};

export function Header({
  navVisible = true,
  activeTab = 'pipeline',
  onToggleMobileSidebar,
  displayTz,
  setDisplayTz,
  logout,
  theme = 'light',
  toggleTheme,
}) {
  const currentTabInfo = TAB_META[activeTab] || { title: 'Dashboard', desc: 'Cold Email Outreach Platform' };

  return (
    <header
      className="app-floating-header"
      style={{
        position: 'sticky',
        top: 16,
        zIndex: 900,
        margin: '16px 28px 12px 28px',
        background: 'var(--header-bg)',
        backdropFilter: 'blur(32px) saturate(220%)',
        WebkitBackdropFilter: 'blur(32px) saturate(220%)',
        border: '1px solid var(--card-border)',
        borderRadius: 20,
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxShadow: 'var(--card-shadow)',
        transform: navVisible ? 'translateY(0)' : 'translateY(-140%)',
        opacity: navVisible ? 1 : 0,
        pointerEvents: navVisible ? 'auto' : 'none',
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
      }}
    >
      {/* Top Specular Highlight Line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Left: Mobile Toggle + Active View Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              borderRadius: 12,
              padding: '8px 10px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="mobile-menu-btn"
            title="Toggle Menu"
          >
            <MenuIcon size={20} />
          </button>
        )}
        <div>
          <h1 className="header-title">
            {currentTabInfo.title}
          </h1>
          <p className="header-subtitle">
            {currentTabInfo.desc}
          </p>
        </div>
      </div>

      {/* Right: Quick Telemetry & Status Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="header-status-pill">
          <ZapIcon size={13} color={C.green} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 750 }}>Active System</span>
        </div>
      </div>
    </header>
  );
}


