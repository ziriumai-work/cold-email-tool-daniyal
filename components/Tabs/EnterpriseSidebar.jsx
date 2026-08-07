'use client';
import { useState } from 'react';
import {
  MailIcon,
  ShieldIcon,
  ZapIcon,
  BarChartIcon,
  CheckCircleIcon,
  UserIcon,
  BuildingIcon,
  SparklesIcon,
  ClockIcon,
  SunIcon,
  MoonIcon,
  LogOutIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from '../Icons.jsx';
import { DISPLAY_TZS } from '../constants.js';
import { C } from './theme.js';

export function EnterpriseSidebar({
  activeTab,
  setActiveTab,
  displayTz,
  setDisplayTz,
  theme,
  toggleTheme,
  logout,
  mobileOpen,
  setMobileOpen,
  collapsed = false,
  setCollapsed,
  width = 270,
  setWidth,
}) {
  const [isResizing, setIsResizing] = useState(false);

  function handleMouseDown(e) {
    e.preventDefault();
    setIsResizing(true);

    function handleMouseMove(moveEvent) {
      if (setWidth) {
        const newWidth = Math.max(200, Math.min(480, moveEvent.clientX));
        setWidth(newWidth);
      }
    }

    function handleMouseUp() {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  const sections = [
    {
      title: 'CAMPAIGNS & WORKFLOW',
      items: [
        { id: 'pipeline', label: 'Outreach Pipeline', icon: MailIcon, badge: 'Core' },
        { id: 'inbox', label: 'AI Unified Inbox', icon: SparklesIcon, badge: 'AI' },
        { id: 'sequences', label: 'Branching Sequences', icon: ClockIcon },
      ],
    },
    {
      title: 'ANALYTICS & LEADS',
      items: [
        { id: 'deliverability', label: 'Deliverability & Health', icon: ZapIcon },
        { id: 'scoring', label: 'Lead Scoring & Copilot', icon: UserIcon },
        { id: 'crm', label: 'CRM & Webhooks', icon: BuildingIcon },
        { id: 'roi', label: 'Revenue ROI', icon: BarChartIcon },
      ],
    },
    {
      title: 'GOVERNANCE & AUDIT',
      items: [
        { id: 'compliance', label: 'Compliance & Spam', icon: ShieldIcon },
        { id: 'audit', label: 'Security & Audit', icon: CheckCircleIcon },
      ],
    },
  ];

  return (
    <aside
      className={`sidebar-container ${mobileOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        width: collapsed ? undefined : width,
        background: 'var(--header-bg)',
        backdropFilter: 'blur(32px) saturate(220%)',
        WebkitBackdropFilter: 'blur(32px) saturate(220%)',
        borderRight: '1px solid var(--card-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        boxShadow: 'var(--card-shadow)',
        userSelect: 'none',
        transition: isResizing ? 'none' : 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Draggable Resizer Bar on Right Border */}
      {!collapsed && (
        <div
          className={`sidebar-resizer ${isResizing ? 'resizing' : ''}`}
          onMouseDown={handleMouseDown}
          onDoubleClick={() => setWidth && setWidth(270)}
          title="Drag left/right to adjust sidebar width (Double-click to reset)"
        />
      )}

      {/* Top Specular Reflection Line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Brand Header */}
      <div
        style={{
          padding: collapsed ? '16px 10px 14px' : '20px 18px 16px',
          borderBottom: '1px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: collapsed ? 'center' : 'stretch',
        }}
      >
        {/* Logo & Brand Info Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', width: '100%' }}>
          <div
            onClick={() => {
              if (collapsed && setCollapsed) setCollapsed(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: collapsed ? 'pointer' : 'default',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
            title={collapsed ? 'Click to expand sidebar' : 'Zirium AI'}
          >
            <div className="sidebar-logo-box">
              <img src="/logo.png" alt="Zirium AI" style={{ height: 26, width: 26, objectFit: 'contain' }} />
            </div>
            {!collapsed && (
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ZiriumAI
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 2, fontWeight: 600 }}>Cold Email Outreach Platform</div>
              </div>
            )}
          </div>
        </div>

        {/* Dedicated Toggle Button BELOW Logo & Status Pill */}
        {setCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-toggle-action-btn"
            style={{
              padding: collapsed ? '8px 0' : '7px 12px',
            }}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
            {!collapsed && <span>Collapse Sidebar</span>}
          </button>
        )}
      </div>

      {/* Vertical Navigation Links */}
      <div style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '12px 8px' : '16px 14px', display: 'flex', flexDirection: 'column', gap: collapsed ? 14 : 20 }}>
        {sections.map((sec, idx) => (
          <div key={idx}>
            {!collapsed && (
              <div className="sidebar-section-title">
                {sec.title}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sec.items.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (setMobileOpen) setMobileOpen(false);
                    }}
                    title={tab.label}
                    className="sidebar-nav-item"
                    style={{
                      padding: collapsed ? '12px 0' : '10px 14px',
                      border: isActive ? '1px solid rgba(2, 132, 199, 0.35)' : '1px solid transparent',
                      background: isActive ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.14), rgba(99, 102, 241, 0.12))' : 'transparent',
                      color: isActive ? C.accent : 'var(--text-secondary)',
                      fontWeight: isActive ? 750 : 600,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      gap: 12,
                      textAlign: 'left',
                      position: 'relative',
                      boxShadow: isActive ? '0 4px 14px rgba(2, 132, 199, 0.12)' : 'none',
                    }}
                  >
                    {isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '20%',
                          bottom: '20%',
                          width: 3.5,
                          borderRadius: '0 4px 4px 0',
                          background: C.accent,
                        }}
                      />
                    )}
                    <Icon size={18} color={isActive ? C.accent : 'var(--text-secondary)'} />
                    {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>}
                    {!collapsed && tab.badge && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 750,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: isActive ? 'rgba(2, 132, 199, 0.2)' : 'var(--input-bg)',
                          color: isActive ? C.accent : 'var(--text-muted)',
                          border: '1px solid var(--card-border)',
                        }}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Controls (Timezone, Theme, Logout) */}
      <div
        style={{
          padding: collapsed ? '12px 8px' : '16px 14px',
          borderTop: '1px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: 'var(--subtle-card-bg)',
          alignItems: collapsed ? 'center' : 'stretch',
        }}
      >
        {/* Timezone Selector */}
        {displayTz && setDisplayTz && !collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', paddingLeft: 4 }}>
              Display Timezone
            </label>
            <select
              value={displayTz}
              onChange={(e) => setDisplayTz(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                borderRadius: 12,
                padding: '7px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {DISPLAY_TZS?.map(([tz, label]) => (
                <option key={tz} value={tz}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Buttons: Theme Switch & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: collapsed ? 'column' : 'row', width: '100%' }}>
          {toggleTheme && (
            <button
              onClick={toggleTheme}
              style={{
                flex: 1,
                width: collapsed ? '100%' : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                borderRadius: 12,
                padding: collapsed ? '8px 0' : '8px 12px',
                fontSize: 12,
                fontWeight: 650,
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <SunIcon size={15} color="#f59e0b" /> : <MoonIcon size={15} color="#6366f1" />}
              {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
          )}

          {logout && (
            <button
              onClick={logout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: collapsed ? '100%' : 'auto',
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                borderRadius: 12,
                padding: collapsed ? '8px 0' : '8px 12px',
                fontSize: 12,
                fontWeight: 650,
                color: C.red,
                cursor: 'pointer',
              }}
              title="Logout"
            >
              <LogOutIcon size={15} color={C.red} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
