import { C, overlay, modalCard, btn } from './constants.js';

export function ConfirmModal({ config, onCancel }) {
  if (!config) return null;
  const { title, message, onConfirm, confirmText = 'Confirm', danger = false } = config;

  return (
    <div onClick={onCancel} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 42,
            height: 42,
            borderRadius: 14,
            background: danger ? 'rgba(254, 242, 242, 0.9)' : 'rgba(239, 246, 255, 0.9)',
            color: danger ? '#f43f5e' : C.accent,
            fontSize: 20,
            border: `1px solid ${danger ? 'rgba(254, 202, 202, 0.8)' : 'rgba(191, 219, 254, 0.8)'}`,
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
            flexShrink: 0
          }}>
            {danger ? '🗑' : '✉️'}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 750, color: C.ink, letterSpacing: '-0.01em' }}>
              {title}
            </h3>
          </div>
        </div>

        <p style={{ color: C.sub, fontSize: 14, margin: '0 0 20px', lineHeight: 1.55 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button style={btn(C.sub, true)} onClick={onCancel}>
            Cancel
          </button>
          <button style={btn(danger ? C.red : C.accent)} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
