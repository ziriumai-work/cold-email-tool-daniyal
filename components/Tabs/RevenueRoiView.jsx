'use client';
import { useState, useEffect, useCallback } from 'react';
import { C, glassCardStyle } from './theme.js';

export function RevenueRoiView() {
  const [metrics, setMetrics] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const fetchMetrics = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await fetch(`/api/attribution?t=${Date.now()}`, { cache: 'no-store' });
      const d = await res.json();
      if (d.ok && d.metrics) {
        setMetrics(d.metrics);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch realtime attribution metrics:', err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchMetrics();
    }, 5000);
    return () => clearInterval(interval);
  }, [isLive, fetchMetrics]);

  const getTimeAgo = () => {
    if (!lastSyncTime) return 'Syncing...';
    const seconds = Math.floor((new Date() - lastSyncTime) / 1000);
    if (seconds < 2) return 'Just now';
    return `${seconds}s ago`;
  };

  if (!metrics) return <div style={glassCardStyle}>Loading realtime revenue metrics...</div>;

  return (
    <div style={glassCardStyle}>
      <style>{`
        @keyframes pulseDot {
          0% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>

      {/* Header & Realtime Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: 0 }}>Revenue Attribution & ROI Analytics</h3>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                background: isLive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                color: isLive ? C.green : C.amber,
                border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: isLive ? C.green : C.amber,
                  animation: isLive ? 'pulseDot 2s infinite' : 'none',
                }}
              />
              {isLive ? 'REALTIME ROI ACTIVE' : 'REALTIME PAUSED'}
            </span>
          </div>
          <p style={{ fontSize: 13, color: C.sub, margin: '6px 0 0 0' }}>
            Financial calculation of outreach expenses vs. pipeline deal attribution value. Realtime database sync.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: C.muted }}>Last synced: {getTimeAgo()}</span>
          <button
            onClick={() => setIsLive((prev) => !prev)}
            style={{
              background: 'var(--subtle-card-bg)',
              color: C.ink,
              border: '1px solid var(--card-border)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isLive ? 'Pause Stream' : 'Resume Stream'}
          </button>
          <button
            onClick={fetchMetrics}
            disabled={isFetching}
            style={{
              background: C.accent,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: isFetching ? 'not-allowed' : 'pointer',
              opacity: isFetching ? 0.7 : 1,
            }}
          >
            {isFetching ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: 12, color: C.sub }}>Total Cost (SMTP + AI API)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, marginTop: 4 }}>${metrics.totalCost}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            SMTP: ${metrics.totalSmtpCost} | AI: ${metrics.totalAiCost} ({metrics.totalSent} emails)
          </div>
        </div>

        <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: 12, color: C.sub }}>Cost Per Reply</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.accent, marginTop: 4 }}>${metrics.costPerReply}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            Across {metrics.totalReplies} replies ({metrics.replyRatePct}% reply rate)
          </div>
        </div>

        <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: 12, color: C.sub }}>Cost Per Qualified Meeting</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginTop: 4 }}>${metrics.costPerMeeting}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            Across {metrics.interestedReplies} interested ({metrics.meetingConversionRatePct}% conv.)
          </div>
        </div>

        <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: 12, color: C.sub }}>Pipeline Deal Value & ROI</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginTop: 4 }}>${metrics.estimatedPipelineRevenue}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            ROI: <strong style={{ color: C.green }}>{metrics.netRoiPct}%</strong> ({metrics.roiMultiplier}x multiplier)
          </div>
        </div>

        <div style={{ background: 'var(--subtle-card-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: 12, color: C.sub }}>Net Attributed Profit</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: metrics.netProfit >= 0 ? C.green : C.red, marginTop: 4 }}>
            ${metrics.netProfit}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            Attributed pipeline value minus total cost
          </div>
        </div>
      </div>
    </div>
  );
}

