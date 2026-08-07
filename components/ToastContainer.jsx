import { CheckIcon, XIcon, AlertCircleIcon, TrashIcon } from './Icons.jsx';

export function ToastContainer({ toasts, navVisible, removeToast }) {
  return (
    <div style={{
      position: 'fixed',
      top: 24,
      transition: 'top 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      pointerEvents: 'none',
      width: '100%',
      maxWidth: 520,
      padding: '0 16px',
    }}>
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isDelete = t.type === 'delete';
        const bg = isSuccess ? '#10b981' : (isError || isDelete) ? '#f43f5e' : '#0284c7';
        const borderClr = isSuccess ? 'rgba(167, 243, 208, 0.9)' : (isError || isDelete) ? 'rgba(254, 202, 202, 0.9)' : 'rgba(186, 230, 253, 0.9)';
        const bgBox = isSuccess ? 'rgba(240, 253, 244, 0.92)' : (isError || isDelete) ? 'rgba(254, 242, 242, 0.92)' : 'rgba(240, 249, 255, 0.92)';
        const textClr = isSuccess ? '#065f46' : (isError || isDelete) ? '#991b1b' : '#075985';
        
        return (
          <div key={t.id} style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: bgBox,
            backdropFilter: 'blur(24px) saturate(190%)',
            WebkitBackdropFilter: 'blur(24px) saturate(190%)',
            color: textClr,
            border: `1px solid ${borderClr}`,
            borderRadius: 16,
            padding: '12px 18px',
            boxShadow: '0 15px 35px -5px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.6) inset',
            fontSize: 14,
            fontWeight: 650,
            width: '100%',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: bg,
              color: '#fff',
              flexShrink: 0,
              boxShadow: `0 2px 8px ${bg}44`
            }}>
              {isSuccess ? <CheckIcon size={14} color="#fff" /> : (isError ? <XIcon size={14} color="#fff" /> : (isDelete ? <TrashIcon size={14} color="#fff" /> : <AlertCircleIcon size={14} color="#fff" />))}
            </span>
            <span style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.45' }}>{t.text}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: 14,
                padding: '2px 6px',
                opacity: 0.6,
                borderRadius: 6,
                lineHeight: 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
            >
              <XIcon size={14} color="currentColor" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

