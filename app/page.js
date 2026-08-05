'use client';
import { useEffect, useState, useRef } from 'react';
import {
  EnterpriseTabBar,
  DeliverabilityView,
  SequencesView,
  ComplianceView,
  UnifiedInboxView,
  ScoringCopilotView,
  CrmView,
  SecurityAuditView,
  RevenueRoiView,
} from '../components/EnterpriseTabs.js';
import { Header } from '../components/Header.jsx';
import { ToastContainer } from '../components/ToastContainer.jsx';
import { ConfirmModal } from '../components/ConfirmModal.jsx';
import { ScheduleModal } from '../components/ScheduleModal.jsx';
import { GenModal } from '../components/GenModal.jsx';
import { ImportSection } from '../components/ImportSection.jsx';
import { SignatureSection } from '../components/SignatureSection.jsx';
import { CompaniesSection } from '../components/CompaniesSection.jsx';
import { DraftsSection } from '../components/DraftsSection.jsx';
import { RepliesSection } from '../components/RepliesSection.jsx';

export default function Dashboard() {
  const [offer, setOffer] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [sig, setSig] = useState({ sig_name: '', sig_title: '', sig_tagline: '', sig_website: '', sig_logo: '', sig_calendly: '' });
  const [sigSaved, setSigSaved] = useState('{}');
  const [authEnabled, setAuthEnabled] = useState(false);
  const [senders, setSenders] = useState([]);
  const [senderKey, setSenderKey] = useState('');
  const [companies, setCompanies] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [busy, setBusy] = useState('');
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null); // { mode:'ai'|'custom', target: companyId | 'all' }
  const [schedModal, setSchedModal] = useState(null); // a draft object, or null
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm, confirmText, danger }
  const [replies, setReplies] = useState([]);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [displayTz, setDisplayTz] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('displayTz') : null) || 'Asia/Karachi');
  const [csvInfo, setCsvInfo] = useState(null);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 15) {
        setNavVisible(true);
      } else if (currentScrollY > lastScrollY.current + 6) {
        setNavVisible(false);
      } else if (currentScrollY < lastScrollY.current - 6) {
        setNavVisible(true);
      }
      lastScrollY.current = currentScrollY;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function load() {
    const [c, d, rp] = await Promise.all([
      fetch('/api/companies').then((r) => r.json()),
      fetch('/api/drafts').then((r) => r.json()),
      fetch('/api/replies').then((r) => r.json()),
    ]);
    setCompanies(c.companies || []);
    setDrafts(d.drafts || []);
    setReplies(rp.replies || []);
  }

  async function checkReplies() {
    setBusy('replies');
    const res = await fetch('/api/replies', { method: 'POST' }).then((r) => r.json());
    setBusy('');
    if (res.error) return flash(res.error, false);
    flash(res.found ? `Found ${res.found} new repl${res.found === 1 ? 'y' : 'ies'}.` : 'No new replies.');
    load();
  }

  async function updateReply(id, patch) {
    const res = await fetch('/api/replies', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    setReplies((rs) => rs.map((r) => (r.id === id ? res.reply : r)));
  }

  useEffect(() => {
    setOffer(localStorage.getItem('offer') || '');
    setCustomPrompt(localStorage.getItem('customPrompt') || '');
    fetch('/api/senders').then((r) => r.json()).then((s) => {
      const list = s.senders || [];
      setSenders(list);
      const saved = localStorage.getItem('senderKey') || '';
      setSenderKey(list.some((x) => x.key === saved) ? saved : (list[0]?.key || ''));
    }).catch(() => {});
    fetch('/api/login').then((r) => r.json()).then((s) => setAuthEnabled(!!s.enabled)).catch(() => {});
    load();
    // Auto-refresh every 10s so open/click counts update without manual reload
    const poll = setInterval(load, 10000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => { if (senderKey) localStorage.setItem('senderKey', senderKey); }, [senderKey]);
  useEffect(() => { localStorage.setItem('displayTz', displayTz); }, [displayTz]);
  useEffect(() => {
    if (!senderKey) return;
    fetch(`/api/settings?senderKey=${encodeURIComponent(senderKey)}`).then((r) => r.json()).then((s) => {
      const v = { sig_name: s.sig_name || '', sig_title: s.sig_title || '', sig_tagline: s.sig_tagline || '', sig_website: s.sig_website || '', sig_logo: s.sig_logo || '', sig_calendly: s.sig_calendly || '' };
      setSig(v);
      setSigSaved(JSON.stringify(v));
    }).catch(() => {});
  }, [senderKey]);

  async function logout() {
    await fetch('/api/login', { method: 'DELETE' });
    window.location.href = '/login';
  }

  async function saveSignature() {
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sig, senderKey }),
    }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    const v = { sig_name: res.sig_name || '', sig_title: res.sig_title || '', sig_tagline: res.sig_tagline || '', sig_website: res.sig_website || '', sig_logo: res.sig_logo || '', sig_calendly: res.sig_calendly || '' };
    setSig(v);
    setSigSaved(JSON.stringify(v));
    flash('Signature saved.');
  }

  useEffect(() => { localStorage.setItem('offer', offer); }, [offer]);
  useEffect(() => { localStorage.setItem('customPrompt', customPrompt); }, [customPrompt]);

  function invalidFor() {
    return !customPrompt.trim() && 'Write your custom email prompt first.';
  }

  function payloadFor(companyId) {
    return { companyId, mode: 'custom', customPrompt, senderKey };
  }

  function openGen(target) { setModal({ mode: 'custom', target }); }

  async function runModal() {
    const { target } = modal;
    const bad = invalidFor();
    if (bad) return flash(bad, false);
    setModal(null);
    if (target === 'all') await generateAll();
    else await generateOne(target);
  }

  function flash(text, ok = true) {
    const id = String(Date.now() + Math.random());
    const type = ok === true ? 'success' : ok === false ? 'error' : ok;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function generateOne(companyId) {
    const bad = invalidFor();
    if (bad) return flash(bad, false);
    setBusy(`custom-${companyId}`);
    const res = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFor(companyId)),
    }).then((r) => r.json());
    setBusy('');
    if (res.error) return flash(res.error, false);
    if (res.site_note) flash(`Generated (note: ${res.site_note})`);
    await load();
  }

  async function generateAll() {
    const bad = invalidFor();
    if (bad) return flash(bad, false);
    const pending = companies.filter((c) => !c.draft_id);
    if (pending.length === 0) return flash('No companies without a draft.', false);
    let ok = 0;
    let failed = 0;
    for (let i = 0; i < pending.length; i++) {
      setBusy(`all-custom:Custom ${i + 1}/${pending.length}`);
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payloadFor(pending[i].id), senderKey }),
      }).then((r) => r.json());
      if (res.error) failed += 1;
      else ok += 1;
    }
    setBusy('');
    flash(failed ? `Generated ${ok}/${pending.length} custom draft(s), ${failed} failed.` : `Generated custom drafts for ${pending.length} companies.`, !failed);
    await load();
  }

  function promptClearAll() {
    setConfirmModal({
      title: 'Delete All Companies',
      message: 'Are you sure you want to delete ALL companies and drafts? This action cannot be undone.',
      confirmText: 'Delete All',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        await clearAll();
      }
    });
  }

  async function clearAll() {
    const res = await fetch('/api/companies', { method: 'DELETE' }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    flash('All companies and drafts deleted successfully.', 'delete');
    await load();
  }

  function promptClearOne(companyId, companyName) {
    setConfirmModal({
      title: 'Delete Company',
      message: `Are you sure you want to delete "${companyName}" and its draft? This action cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        await clearOne(companyId, companyName);
      }
    });
  }

  async function clearOne(companyId, companyName) {
    const res = await fetch(`/api/companies?id=${companyId}`, { method: 'DELETE' }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    flash(`Deleted "${companyName}" and its draft.`, 'delete');
    await load();
  }

  async function updateDraft(id, patch) {
    const res = await fetch('/api/drafts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    setDrafts((ds) => ds.map((d) => (d.id === id ? res.draft : d)));
    if (patch.status === 'rejected') {
      flash('Email draft rejected.', 'delete');
    } else if (patch.status === 'approved') {
      flash('Email draft approved successfully!', 'success');
    } else if (patch.subject !== undefined || patch.body !== undefined) {
      flash('Draft changes saved successfully.', 'success');
    }
    load();
  }

  async function sendOne(draftId) {
    setBusy('send-' + draftId);
    const res = await fetch('/api/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId }),
    }).then((r) => r.json());
    setBusy('');
    if (res.error) { flash(res.error, false); await load(); return false; }
    setDrafts((ds) => ds.map((d) => (d.id === draftId ? res.draft : d)));
    const recipient = res.draft?.contact_email ? ` to ${res.draft.contact_email}` : '';
    flash(`Email sent successfully${recipient}!`, 'success');
    load();
    return true;
  }

  async function scheduleDraft(id, sendAtMs, tz) {
    const res = await fetch('/api/schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, sendAtMs, tz }),
    }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    setDrafts((ds) => ds.map((d) => (d.id === id ? res.draft : d)));
    const recipient = res.draft?.contact_email ? ` to ${res.draft.contact_email}` : '';
    flash(`Email scheduled successfully${recipient}!`, 'success');
    load();
  }

  async function unschedule(id) {
    const res = await fetch('/api/schedule', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then((r) => r.json());
    if (res.error) return flash(res.error, false);
    setDrafts((ds) => ds.map((d) => (d.id === id ? res.draft : d)));
    flash('Email schedule cancelled.');
    load();
  }

  function promptSendAllApproved() {
    const approved = drafts.filter((d) => d.status === 'approved' && d.contact_email);
    if (approved.length === 0) return flash('No approved drafts with a contact email.', false);
    setConfirmModal({
      title: 'Send Approved Emails',
      message: `Send ${approved.length} approved email(s) now?`,
      confirmText: 'Send Now',
      danger: false,
      onConfirm: async () => {
        setConfirmModal(null);
        await sendAllApproved(approved);
      }
    });
  }

  async function sendAllApproved(approvedList) {
    const approved = approvedList || drafts.filter((d) => d.status === 'approved' && d.contact_email);
    if (approved.length === 0) return flash('No approved drafts with a contact email.', false);
    let sent = 0;
    for (let i = 0; i < approved.length; i++) {
      setBusy(`send-all:${i + 1}/${approved.length}`);
      const res = await fetch('/api/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: approved[i].id }),
      }).then((r) => r.json());
      if (!res.error) {
        sent++;
        if (res.draft) {
          setDrafts((ds) => ds.map((d) => (d.id === res.draft.id ? res.draft : d)));
        }
      }
      if (i < approved.length - 1) await new Promise((r) => setTimeout(r, 2500));
    }
    setBusy('');
    flash(`Sent ${sent}/${approved.length} approved email(s).`, sent === approved.length);
    await load();
  }

  async function approveAllPending() {
    const pending = drafts.filter((d) => d.status === 'pending');
    if (pending.length === 0) return flash('No pending drafts.', false);
    let ok = 0;
    let failed = 0;
    for (const d of pending) {
      const res = await fetch('/api/drafts', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id, status: 'approved' }),
      }).then((r) => r.json());
      if (res.error) {
        failed += 1;
      } else {
        ok += 1;
        if (res.draft) {
          setDrafts((ds) => ds.map((item) => (item.id === res.draft.id ? res.draft : item)));
        }
      }
    }
    flash(failed ? `Approved ${ok}/${pending.length} draft(s), ${failed} failed.` : `Approved ${pending.length} draft(s).`, !failed);
    await load();
  }

  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('zirium_theme') : null) || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zirium_theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  // Calculate live KPI metrics
  const totalCompaniesCount = companies.length;
  const totalDraftsCount = drafts.length;
  const approvedDraftsCount = drafts.filter((d) => d.status === 'approved').length;
  const sentEmailsCount = drafts.filter((d) => d.status === 'sent').length;
  const totalRepliesCount = replies.length;
  const totalOpensCount = drafts.reduce((acc, d) => acc + (d.open_count || 0), 0);

  return (
    <>
      <Header
        navVisible={navVisible}
        displayTz={displayTz}
        setDisplayTz={setDisplayTz}
        logout={logout}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '110px 24px 80px' }}>
        <ToastContainer
          toasts={toasts}
          navVisible={navVisible}
          removeToast={removeToast}
        />

        <EnterpriseTabBar activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === 'deliverability' && <DeliverabilityView flash={flash} />}
        {activeTab === 'sequences' && <SequencesView flash={flash} />}
        {activeTab === 'compliance' && <ComplianceView flash={flash} />}
        {activeTab === 'inbox' && <UnifiedInboxView flash={flash} />}
        {activeTab === 'scoring' && <ScoringCopilotView flash={flash} />}
        {activeTab === 'crm' && <CrmView flash={flash} />}
        {activeTab === 'audit' && <SecurityAuditView />}
        {activeTab === 'roi' && <RevenueRoiView />}

        {activeTab === 'pipeline' && (
          <>
            {/* KPI Metric Overview Bar */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{
                flex: '1 1 220px',
                background: 'var(--card-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--card-border)',
                borderRadius: 20,
                padding: '20px 22px',
                boxShadow: 'var(--card-shadow)',
                display: 'flex',
                alignItems: 'center',
                gap: 16
              }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(2, 132, 199, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                  🏢
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target Prospects</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{totalCompaniesCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 550 }}>Companies in database</div>
                </div>
              </div>

              <div style={{
                flex: '1 1 220px',
                background: 'var(--card-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--card-border)',
                borderRadius: 20,
                padding: '20px 22px',
                boxShadow: 'var(--card-shadow)',
                display: 'flex',
                alignItems: 'center',
                gap: 16
              }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(124, 92, 255, 0.12)', border: '1px solid rgba(124, 92, 255, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c5cff' }}>
                  ✏️
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Drafts Queue</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{totalDraftsCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 550 }}>{approvedDraftsCount} approved for send</div>
                </div>
              </div>

              <div style={{
                flex: '1 1 220px',
                background: 'var(--card-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--card-border)',
                borderRadius: 20,
                padding: '20px 22px',
                boxShadow: 'var(--card-shadow)',
                display: 'flex',
                alignItems: 'center',
                gap: 16
              }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  🚀
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sent Emails</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{sentEmailsCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 550 }}>{totalOpensCount} total email opens</div>
                </div>
              </div>

              <div style={{
                flex: '1 1 220px',
                background: 'var(--card-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--card-border)',
                borderRadius: 20,
                padding: '20px 22px',
                boxShadow: 'var(--card-shadow)',
                display: 'flex',
                alignItems: 'center',
                gap: 16
              }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                  💬
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prospect Replies</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{totalRepliesCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 550 }}>Active conversations</div>
                </div>
              </div>
            </div>

            <ImportSection
              busy={busy}
              setBusy={setBusy}
              csvInfo={csvInfo}
              setCsvInfo={setCsvInfo}
              flash={flash}
              load={load}
            />

            <SignatureSection
              senders={senders}
              senderKey={senderKey}
              setSenderKey={setSenderKey}
              sig={sig}
              setSig={setSig}
              sigSaved={sigSaved}
              saveSignature={saveSignature}
            />

            <CompaniesSection
              companies={companies}
              busy={busy}
              openGen={openGen}
              promptClearAll={promptClearAll}
              promptClearOne={promptClearOne}
            />

            <DraftsSection
              drafts={drafts}
              senders={senders}
              replies={replies}
              busy={busy}
              updateDraft={updateDraft}
              sendOne={sendOne}
              setSchedModal={setSchedModal}
              unschedule={unschedule}
              displayTz={displayTz}
              approveAllPending={approveAllPending}
              promptSendAllApproved={promptSendAllApproved}
            />

            <RepliesSection
              replies={replies}
              busy={busy}
              checkReplies={checkReplies}
              updateReply={updateReply}
            />
          </>
        )}

        {modal && (
          <GenModal
            modal={modal}
            companies={companies}
            senders={senders}
            senderKey={senderKey}
            setSenderKey={setSenderKey}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt}
            onCancel={() => setModal(null)}
            onSubmit={runModal}
          />
        )}

        {schedModal && (
          <ScheduleModal
            draft={schedModal}
            onCancel={() => setSchedModal(null)}
            onConfirm={async (id, ms, tz) => {
              setSchedModal(null);
              await scheduleDraft(id, ms, tz);
            }}
          />
        )}

        {confirmModal && (
          <ConfirmModal
            config={confirmModal}
            onCancel={() => setConfirmModal(null)}
          />
        )}
      </main>
    </>
  );
}

