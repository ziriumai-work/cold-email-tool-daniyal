import { useState, useRef } from 'react';
import { C, btn } from './constants.js';
import { Section } from './UIElements.jsx';
import { UploadIcon, CheckCircleIcon, FileIcon, SpinnerIcon } from './Icons.jsx';

export function ImportSection({ busy, setBusy, csvInfo, setCsvInfo, flash, load }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }

  async function handleFileUpload(file) {
    if (!file) return;
    const allowedExts = ['csv', 'xlsx', 'xls', 'pdf', 'docx', 'txt'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!allowedExts.includes(ext)) {
      return flash(`Unsupported file format (.${ext}). Please upload a CSV, Excel, PDF, or Word file.`, false);
    }

    setCsvInfo({ fileName: file.name, state: 'importing' });
    setBusy('import');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      }).then((r) => r.json());

      setBusy('');
      if (fileRef.current) fileRef.current.value = '';

      if (res.error) {
        setCsvInfo(null);
        return flash(res.error, false);
      }

      setCsvInfo({
        fileName: file.name,
        imported: res.imported,
        skipped: res.skipped,
        total: res.total,
        state: 'done',
      });
      flash(`Successfully imported ${res.imported} lead${res.imported === 1 ? '' : 's'} from "${file.name}"${res.skipped ? `, ${res.skipped} skipped (missing email or name)` : ''}.`);
      load();
    } catch (err) {
      setBusy('');
      setCsvInfo(null);
      flash(`Upload failed: ${err.message || err}`, false);
    }
  }

  return (
    <Section title="Import Target Companies" kicker="Drag & Drop Leads File">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? C.accent : 'var(--input-border)'}`,
          borderRadius: 22,
          padding: '28px 32px',
          background: isDragging
            ? 'var(--accent-glow)'
            : 'var(--card-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: isDragging
            ? '0 12px 30px -5px rgba(2, 132, 199, 0.15), 0 0 0 4px rgba(56, 189, 248, 0.2)'
            : 'var(--card-shadow)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          cursor: 'pointer',
          position: 'relative'
        }}>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf,.docx,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
          style={{ display: 'none' }}
          disabled={busy === 'import'}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            background: isDragging ? C.accent : 'rgba(2, 132, 199, 0.12)',
            color: isDragging ? '#fff' : C.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(14, 165, 233, 0.12)',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}>
            {busy === 'import' ? <SpinnerIcon size={24} color={C.accent} /> : <UploadIcon size={24} color={isDragging ? '#fff' : C.accent} />}
          </div>

          <div style={{ textAlign: 'left', flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>
              {busy === 'import' ? 'Extracting & Parsing leads file...' : isDragging ? 'Drop file to upload' : 'Drag & drop your leads file here'}
            </div>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 3, fontWeight: 500 }}>
              Supports <strong>CSV</strong>, <strong>Excel (.xlsx / .xls)</strong>, <strong>PDF (.pdf)</strong>, or <strong>Word (.docx)</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
            disabled={busy === 'import'}
            style={{
              ...btn(C.accent),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0
            }}>
            {busy === 'import' ? <SpinnerIcon size={16} color="#fff" /> : <UploadIcon size={16} color="#fff" />}
            {busy === 'import' ? 'Uploading…' : 'Browse File'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
          {['CSV (.csv)', 'Excel (.xlsx / .xls)', 'PDF (.pdf)', 'Word (.docx)'].map((fmt) => (
            <span key={fmt} style={{
              fontSize: 11,
              fontWeight: 650,
              color: C.sub,
              background: 'var(--subtle-card-bg)',
              padding: '4px 12px',
              borderRadius: 999,
              border: '1px solid var(--input-border)'
            }}>
              {fmt}
            </span>
          ))}
        </div>

        {busy === 'import' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: 'rgba(224, 242, 254, 0.95)', color: '#0369a1', border: '1px solid rgba(186, 230, 253, 0.9)', borderRadius: 14, fontSize: 13, fontWeight: 700, backdropFilter: 'blur(10px)', width: '100%', justifyContent: 'center', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.1)' }}>
            <SpinnerIcon size={18} color="#0284c7" />
            <span>{csvInfo?.fileName ? `Extracting data from ${csvInfo.fileName}…` : 'Importing leads file…'}</span>
          </div>
        )}
        {busy !== 'import' && csvInfo && csvInfo.state === 'done' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(240, 253, 244, 0.9)', color: '#15803d', border: '1px solid rgba(187, 247, 208, 0.9)', borderRadius: 14, fontSize: 13, backdropFilter: 'blur(8px)', width: '100%', justifyContent: 'center' }}>
            <CheckCircleIcon size={16} color={C.green} />
            <span><strong>{csvInfo.fileName}</strong>: {csvInfo.total} companies parsed ({csvInfo.imported} imported{csvInfo.skipped ? `, ${csvInfo.skipped} skipped` : ''})</span>
          </div>
        )}
      </div>
    </Section>
  );
}

