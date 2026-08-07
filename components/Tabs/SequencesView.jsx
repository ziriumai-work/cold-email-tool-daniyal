'use client';
import { useState, useEffect } from 'react';
import { C, glassCardStyle } from './theme.js';

export function SequencesView({ flash }) {
  const [seqData, setSeqData] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  // Form state for new / edited node
  const [nodeForm, setNodeForm] = useState({
    name: '',
    type: 'email',
    delayDays: 1,
    condition: 'opened_no_reply'
  });

  // Simulator State
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [simLog, setSimLog] = useState([]);
  const [simulating, setSimulating] = useState(false);

  // Enrollment State
  const [selectedEnrollCompanyId, setSelectedEnrollCompanyId] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/sequences').then((r) => r.json());
      if (res.ok) {
        setSeqData(res);
        if (res.sequence?.nodes) {
          setNodes(res.sequence.nodes);
        }
        if (res.companies?.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(String(res.companies[0].id));
          setSelectedEnrollCompanyId(String(res.companies[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load sequences data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addLog = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setSimLog((prev) => [{ id: Date.now() + Math.random(), timestamp, msg, type }, ...prev]);
  };

  async function saveSequenceNodes(updatedNodes) {
    setSaving(true);
    try {
      const res = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_sequence', nodes: updatedNodes, name: seqData?.sequence?.name }),
      }).then((r) => r.json());
      if (res.ok) {
        flash('Sequence layout saved successfully!');
        loadData();
      } else {
        flash(res.error || 'Failed to save sequence');
      }
    } catch (err) {
      flash('Error saving sequence');
    } finally {
      setSaving(false);
    }
  }

  const handleAddNode = () => {
    if (!nodeForm.name.trim()) return flash('Step name is required');
    const newNodeObj = {
      id: `step_${Date.now()}`,
      name: nodeForm.name.trim(),
      type: nodeForm.type,
      delayDays: Number(nodeForm.delayDays) || 0,
      condition: nodeForm.condition === 'none' ? null : nodeForm.condition
    };

    const nextNodes = [...nodes, newNodeObj];
    setNodes(nextNodes);
    setShowAddForm(false);
    setNodeForm({ name: '', type: 'email', delayDays: 1, condition: 'opened_no_reply' });
    saveSequenceNodes(nextNodes);
  };

  const handleUpdateNode = (index) => {
    if (!nodeForm.name.trim()) return flash('Step name is required');
    const updated = [...nodes];
    updated[index] = {
      ...updated[index],
      name: nodeForm.name.trim(),
      type: nodeForm.type,
      delayDays: Number(nodeForm.delayDays) || 0,
      condition: nodeForm.condition === 'none' ? null : nodeForm.condition
    };
    setNodes(updated);
    setEditingIndex(null);
    setNodeForm({ name: '', type: 'email', delayDays: 1, condition: 'opened_no_reply' });
    saveSequenceNodes(updated);
  };

  const handleDeleteNode = (index) => {
    if (nodes.length <= 1) return flash('Sequence must contain at least one step');
    const nextNodes = nodes.filter((_, i) => i !== index);
    setNodes(nextNodes);
    saveSequenceNodes(nextNodes);
  };

  const handleMoveNode = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= nodes.length) return;
    const nextNodes = [...nodes];
    const temp = nextNodes[index];
    nextNodes[index] = nextNodes[targetIndex];
    nextNodes[targetIndex] = temp;
    setNodes(nextNodes);
    saveSequenceNodes(nextNodes);
  };

  const handleTriggerEvent = async (eventType) => {
    if (!selectedCompanyId) return flash('Please select a target company to trigger event');
    setSimulating(true);
    try {
      const company = seqData?.companies?.find((c) => String(c.id) === String(selectedCompanyId));
      addLog(`Firing trigger event: [${eventType.toUpperCase()}] for ${company?.name || 'Company #' + selectedCompanyId}...`, 'info');

      const res = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_event', companyId: selectedCompanyId, eventType }),
      }).then((r) => r.json());

      if (res.ok) {
        addLog(`Trigger result: ${res.message}`, 'success');
        flash(`Workflow event "${eventType}" processed successfully!`);
        loadData();
      } else {
        addLog(`Trigger error: ${res.error}`, 'error');
        flash(res.error || 'Event trigger failed');
      }
    } catch (err) {
      addLog(`Network error executing trigger: ${err.message}`, 'error');
    } finally {
      setSimulating(false);
    }
  };

  const handleEnrollCompany = async () => {
    if (!selectedEnrollCompanyId) return flash('Select a lead company');
    try {
      const res = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enroll_company', companyId: selectedEnrollCompanyId }),
      }).then((r) => r.json());

      if (res.ok) {
        flash(res.message);
        loadData();
      } else {
        flash(res.error || 'Enrollment failed');
      }
    } catch {
      flash('Error enrolling company');
    }
  };

  async function completeTask(taskId) {
    const res = await fetch('/api/sequences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_task', taskId }),
    }).then((r) => r.json());
    if (res.ok) {
      flash('Task completed');
      loadData();
    }
  }

  if (!seqData) return <div style={glassCardStyle}>Loading sequence logic...</div>;

  const conditionLabels = {
    opened_no_reply: 'If Opened (No Reply)',
    clicked_no_reply: 'If Clicked (No Reply)',
    unopened_no_reply: 'If Unopened (No Reply)',
    no_reply: 'If No Reply After Delay',
    replied: 'If Replied (Stop)',
  };

  const typeBadges = {
    email: { label: 'Email Follow-up', color: '#0891b2', bg: 'rgba(8, 145, 178, 0.12)' },
    linkedin_connect: { label: 'LinkedIn Connect', color: '#0077b5', bg: 'rgba(0, 119, 181, 0.12)' },
    phone_call: { label: 'Phone Call Task', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' },
    task: { label: 'Manual Touchpoint', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    delay: { label: 'Wait Delay', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Sequence Visual Builder Header */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: 19, fontWeight: 750, color: C.ink, margin: 0 }}>
                {seqData.sequence?.name || 'Enterprise Branching Campaign Engine'}
              </h3>
              <span style={{ fontSize: 11, background: 'rgba(16, 185, 129, 0.15)', color: C.green, padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
                ● ACTIVE AGENT ENGINE
              </span>
            </div>
            <p style={{ fontSize: 13, color: C.sub, margin: '6px 0 0 0' }}>
              Multi-branching sequence builder. Workflows auto-trigger based on recipient engagement signals (Opened, Clicked, Replied, Unopened).
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingIndex(null);
                setNodeForm({ name: '', type: 'email', delayDays: 1, condition: 'opened_no_reply' });
              }}
              style={{ padding: '9px 16px', borderRadius: 10, background: C.accent, color: '#fff', border: 'none', fontWeight: 650, cursor: 'pointer', fontSize: 13 }}
            >
              {showAddForm ? 'Close Builder' : '+ Add Sequence Step'}
            </button>
          </div>
        </div>

        {/* Add / Edit Node Form */}
        {(showAddForm || editingIndex !== null) && (
          <div style={{ background: 'var(--subtle-card-bg)', padding: 18, borderRadius: 14, border: '1px solid var(--card-border)', marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 700, color: C.ink }}>
              {editingIndex !== null ? `Edit Step #${editingIndex + 1}` : 'Create New Sequence Workflow Step'}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 650, color: C.sub, display: 'block', marginBottom: 4 }}>Step Name</label>
                <input
                  type="text"
                  placeholder="e.g. Follow-up B (Clicked Link)"
                  value={nodeForm.name}
                  onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: C.text, fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 650, color: C.sub, display: 'block', marginBottom: 4 }}>Step Action Type</label>
                <select
                  value={nodeForm.type}
                  onChange={(e) => setNodeForm({ ...nodeForm, type: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: C.text, fontSize: 13 }}
                >
                  <option value="email">Send Follow-up Email</option>
                  <option value="linkedin_connect">LinkedIn Connection Task</option>
                  <option value="phone_call">Phone Call Task</option>
                  <option value="task">Manual Touchpoint Task</option>
                  <option value="delay">Wait Delay Only</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 650, color: C.sub, display: 'block', marginBottom: 4 }}>Delay (Days)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={nodeForm.delayDays}
                  onChange={(e) => setNodeForm({ ...nodeForm, delayDays: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: C.text, fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 650, color: C.sub, display: 'block', marginBottom: 4 }}>Branch Trigger Condition</label>
                <select
                  value={nodeForm.condition || 'none'}
                  onChange={(e) => setNodeForm({ ...nodeForm, condition: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: C.text, fontSize: 13 }}
                >
                  <option value="none">None (Initial / Mandatory Step)</option>
                  <option value="opened_no_reply">If Opened, No Reply</option>
                  <option value="clicked_no_reply">If Clicked Link, No Reply</option>
                  <option value="unopened_no_reply">If Unopened, No Reply</option>
                  <option value="no_reply">If No Reply (General)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingIndex(null);
                }}
                style={{ padding: '8px 14px', borderRadius: 8, background: 'transparent', border: '1px solid var(--card-border)', color: C.sub, cursor: 'pointer', fontSize: 12.5 }}
              >
                Cancel
              </button>
              <button
                onClick={() => (editingIndex !== null ? handleUpdateNode(editingIndex) : handleAddNode())}
                style={{ padding: '8px 18px', borderRadius: 8, background: C.green, color: '#fff', border: 'none', fontWeight: 650, cursor: 'pointer', fontSize: 12.5 }}
              >
                {editingIndex !== null ? 'Save Changes' : 'Add to Sequence'}
              </button>
            </div>
          </div>
        )}

        {/* 2. Visual Branching Flowchart Diagram */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {nodes.map((node, i) => {
            const badge = typeBadges[node.type] || typeBadges.email;
            return (
              <div key={node.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Branch connector line if not first step */}
                {i > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '-4px 0 10px 0' }}>
                    <div style={{ width: 2, height: 20, background: 'var(--card-border)' }} />
                    <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 999, background: 'rgba(8, 145, 178, 0.1)', color: C.accent, border: '1px dashed var(--card-border)' }}>
                      Trigger Path: {conditionLabels[node.condition] || 'Next Sequential Step'} (+{node.delayDays || 0}d delay)
                    </div>
                    <div style={{ width: 2, height: 16, background: 'var(--card-border)' }} />
                  </div>
                )}

                {/* Node Card */}
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--subtle-card-bg)', padding: '16px 20px', borderRadius: 16, border: '1px solid var(--card-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 750, fontSize: 13 }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>{node.name}</span>
                        <span style={{ fontSize: 11, background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 8, fontWeight: 700 }}>
                          {badge.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: C.sub, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span>Delay: <strong>{node.delayDays || 0} day(s)</strong></span>
                        <span>Condition: <strong>{node.condition ? conditionLabels[node.condition] : 'Initial Step'}</strong></span>
                        <span>Step ID: <code>{node.id}</code></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => handleMoveNode(i, -1)}
                      disabled={i === 0}
                      title="Move Up"
                      style={{ padding: '5px 9px', borderRadius: 6, background: 'var(--input-bg)', border: '1px solid var(--card-border)', cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.4 : 1, fontSize: 12 }}
                    >
                      Up
                    </button>
                    <button
                      onClick={() => handleMoveNode(i, 1)}
                      disabled={i === nodes.length - 1}
                      title="Move Down"
                      style={{ padding: '5px 9px', borderRadius: 6, background: 'var(--input-bg)', border: '1px solid var(--card-border)', cursor: i === nodes.length - 1 ? 'not-allowed' : 'pointer', opacity: i === nodes.length - 1 ? 0.4 : 1, fontSize: 12 }}
                    >
                      Down
                    </button>
                    <button
                      onClick={() => {
                        setEditingIndex(i);
                        setShowAddForm(false);
                        setNodeForm({
                          name: node.name,
                          type: node.type,
                          delayDays: node.delayDays || 0,
                          condition: node.condition || 'none'
                        });
                      }}
                      style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: C.text, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteNode(i)}
                      style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: C.red, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive Workflow Event Simulator Panel */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: 0 }}>Real-Time Workflow Trigger Simulator</h3>
            <p style={{ fontSize: 13, color: C.sub, margin: '4px 0 0 0' }}>
              Simulate recipient interaction events (Opens, Link Clicks, Replies) to test branching sequence logic in real time.
            </p>
          </div>
          <span style={{ fontSize: 11, background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
            TEST & TRIGGER BENCH
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ fontSize: 12, fontWeight: 650, color: C.sub, display: 'block', marginBottom: 4 }}>Select Target Lead / Company</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: C.text, fontSize: 13, fontWeight: 600 }}
            >
              {seqData.companies?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.contact_email || 'No email'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
            <button
              onClick={() => handleTriggerEvent('open')}
              disabled={simulating}
              style={{ padding: '10px 16px', borderRadius: 10, background: '#0891b2', color: '#fff', border: 'none', fontWeight: 650, cursor: 'pointer', fontSize: 12.5 }}
            >
              Simulate Email Open
            </button>
            <button
              onClick={() => handleTriggerEvent('click')}
              disabled={simulating}
              style={{ padding: '10px 16px', borderRadius: 10, background: '#7c3aed', color: '#fff', border: 'none', fontWeight: 650, cursor: 'pointer', fontSize: 12.5 }}
            >
              Simulate Link Click
            </button>
            <button
              onClick={() => handleTriggerEvent('reply')}
              disabled={simulating}
              style={{ padding: '10px 16px', borderRadius: 10, background: C.green, color: '#fff', border: 'none', fontWeight: 650, cursor: 'pointer', fontSize: 12.5 }}
            >
              Simulate Prospect Reply
            </button>
            <button
              onClick={() => handleTriggerEvent('advance')}
              disabled={simulating}
              style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--input-bg)', color: C.text, border: '1px solid var(--card-border)', fontWeight: 650, cursor: 'pointer', fontSize: 12.5 }}
            >
              Advance Next Step
            </button>
          </div>
        </div>

        {/* Live Simulator Log Output */}
        {simLog.length > 0 && (
          <div style={{ background: '#090d16', color: '#e2e8f0', borderRadius: 12, padding: 14, fontFamily: 'monospace', fontSize: 12, maxHeight: 180, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Live Simulator Output Log:</div>
            {simLog.map((log) => (
              <div key={log.id} style={{ marginBottom: 4, color: log.type === 'success' ? '#4ade80' : log.type === 'error' ? '#f87171' : '#38bdf8' }}>
                <span style={{ color: '#64748b' }}>[{log.timestamp}]</span> {log.msg}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Sequence Enrollments & Active Leads Table */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: 0 }}>Active Sequence Enrollments</h3>
            <p style={{ fontSize: 13, color: C.sub, margin: '4px 0 0 0' }}>Prospects currently active in the sequence pipeline and their current workflow node status.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select
              value={selectedEnrollCompanyId}
              onChange={(e) => setSelectedEnrollCompanyId(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: C.text, fontSize: 12.5 }}
            >
              {seqData.companies?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={handleEnrollCompany} style={{ padding: '8px 16px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none', fontWeight: 650, cursor: 'pointer', fontSize: 12.5 }}>
              Enroll Lead
            </button>
          </div>
        </div>

        {(!seqData.enrollments || seqData.enrollments.length === 0) ? (
          <div style={{ fontSize: 13, color: C.muted, padding: 12 }}>No leads currently enrolled in this sequence. Use the dropdown above to enroll a lead!</div>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', color: C.sub, background: 'var(--table-header-bg)' }}>
                <th style={{ padding: 10 }}>Company</th>
                <th style={{ padding: 10 }}>Contact Email</th>
                <th style={{ padding: 10 }}>Current Workflow Step</th>
                <th style={{ padding: 10 }}>Status</th>
                <th style={{ padding: 10, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {seqData.enrollments.map((item) => {
                const stepObj = nodes.find((n) => n.id === item.current_step_id);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: 10, fontWeight: 650 }}>{item.company_name || `Company #${item.company_id}`}</td>
                    <td style={{ padding: 10 }}>{item.contact_email || '—'}</td>
                    <td style={{ padding: 10 }}>
                      <span style={{ fontWeight: 600 }}>{stepObj ? stepObj.name : item.current_step_id}</span>
                    </td>
                    <td style={{ padding: 10 }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        background: item.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : item.status === 'paused' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(8, 145, 178, 0.15)',
                        color: item.status === 'completed' ? C.green : item.status === 'paused' ? C.amber : C.accent,
                      }}>
                        {item.status?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 10, textAlign: 'right' }}>
                      <button
                        onClick={async () => {
                          const newStatus = item.status === 'active' ? 'paused' : 'active';
                          await fetch('/api/sequences', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'update_enrollment', enrollmentId: item.id, status: newStatus }),
                          });
                          flash(`Enrollment ${newStatus}`);
                          loadData();
                        }}
                        style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: C.sub, cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}
                      >
                        {item.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. Sequence Email Outreach & Engagement Telemetry */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: 0 }}>Sequence Email Outreach & Interaction Telemetry</h3>
            <p style={{ fontSize: 13, color: C.sub, margin: '4px 0 0 0' }}>
              Full visibility into email recipients, open frequency, link click activity, and reply status across sequence steps.
            </p>
          </div>
          <span style={{ fontSize: 11, background: 'rgba(8, 145, 178, 0.12)', color: C.accent, padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
            LIVE RECIPIENT ENGAGEMENT AUDIT
          </span>
        </div>

        {(!seqData.drafts || seqData.drafts.length === 0) ? (
          <div style={{ fontSize: 13, color: C.muted, padding: 12 }}>No email outreach drafts generated for sequence leads yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <table style={{ width: '100%', textAlign: 'left', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', color: C.sub, background: 'var(--table-header-bg)' }}>
                  <th style={{ padding: 10 }}>Recipient Lead (Whom Email Sent)</th>
                  <th style={{ padding: 10 }}>Subject Line</th>
                  <th style={{ padding: 10 }}>Email Status</th>
                  <th style={{ padding: 10 }}>Open Telemetry (Who Opened)</th>
                  <th style={{ padding: 10 }}>Link Telemetry (Who Clicked)</th>
                  <th style={{ padding: 10, textAlign: 'right' }}>Event Triggers</th>
                </tr>
              </thead>
              <tbody>
                {seqData.drafts.map((draft) => {
                  const wasOpened = (draft.open_count || 0) > 0;
                  const wasClicked = (draft.click_count || 0) > 0;
                  const isReplied = draft.status === 'replied' || !!draft.replied_at;

                  return (
                    <tr key={draft.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: 10 }}>
                        <div style={{ fontWeight: 700, color: C.ink }}>{draft.company_name}</div>
                        <div style={{ fontSize: 11.5, color: C.sub }}>{draft.contact_email || '—'}</div>
                      </td>
                      <td style={{ padding: 10 }}>
                        <div style={{ fontWeight: 600, color: C.ink, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {draft.subject}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted }}>Draft #{draft.id}</div>
                      </td>
                      <td style={{ padding: 10 }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: isReplied ? 'rgba(16, 185, 129, 0.15)' : draft.status === 'sent' ? 'rgba(8, 145, 178, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isReplied ? C.green : draft.status === 'sent' ? C.accent : C.amber,
                        }}>
                          {draft.status?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: 10 }}>
                        {wasOpened ? (
                          <div>
                            <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(8, 145, 178, 0.12)', color: '#0891b2', fontWeight: 700, fontSize: 11.5 }}>
                              Opened ({draft.open_count}x)
                            </span>
                            {draft.last_opened_at && (
                              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3 }}>
                                {new Date(draft.last_opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11.5, color: C.muted }}>Not Opened Yet</span>
                        )}
                      </td>
                      <td style={{ padding: 10 }}>
                        {wasClicked ? (
                          <div>
                            <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', fontWeight: 700, fontSize: 11.5 }}>
                              Clicked ({draft.click_count}x)
                            </span>
                            {draft.last_clicked_at && (
                              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3 }}>
                                {new Date(draft.last_clicked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11.5, color: C.muted }}>No Link Clicks</span>
                        )}
                      </td>
                      <td style={{ padding: 10, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setSelectedCompanyId(String(draft.company_id));
                              handleTriggerEvent('open');
                            }}
                            title="Simulate Email Open for this recipient"
                            style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(8, 145, 178, 0.1)', border: '1px solid rgba(8, 145, 178, 0.2)', color: '#0891b2', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                          >
                            Open
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCompanyId(String(draft.company_id));
                              handleTriggerEvent('click');
                            }}
                            title="Simulate Link Click for this recipient"
                            style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)', color: '#7c3aed', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                          >
                            Click
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCompanyId(String(draft.company_id));
                              handleTriggerEvent('reply');
                            }}
                            title="Simulate Prospect Reply for this recipient"
                            style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: C.green, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                          >
                            Reply
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Multi-Channel Reminder Tasks */}
      <div style={glassCardStyle}>
        <h3 style={{ fontSize: 18, fontWeight: 750, color: C.ink, margin: '0 0 8px 0' }}>Multi-Channel Reminder Tasks</h3>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Manual tasks generated automatically by sequence steps (LinkedIn connection requests, phone calls, manual touchpoints).</p>

        {(!seqData.tasks || seqData.tasks.length === 0) ? (
          <div style={{ fontSize: 13, color: C.muted }}>No pending multi-channel tasks right now.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {seqData.tasks.map((task) => {
              const linkedinSearchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent((task.company_name || '') + ' ' + (task.contact_email || ''))}`;
              return (
                <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--subtle-card-bg)', padding: 14, borderRadius: 12, border: '1px solid var(--card-border)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{task.description} - {task.company_name}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                      Contact: <strong>{task.contact_email || 'N/A'}</strong> | Action Type: <code>{task.task_type}</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(task.task_type?.includes('linkedin') || task.task_type === 'linkedin_connect') && (
                      <>
                        <a
                          href={linkedinSearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding: '7px 14px', borderRadius: 8, background: '#0077b5', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          Connect on LinkedIn ↗
                        </a>
                        <button
                          onClick={() => {
                            const note = `Hi, came across ${task.company_name || 'your company'} — would love to connect on LinkedIn!`;
                            navigator.clipboard.writeText(note);
                            flash('LinkedIn intro note copied to clipboard!');
                          }}
                          style={{ padding: '7px 12px', borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: C.text, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                          Copy Intro Note
                        </button>
                      </>
                    )}

                    <button onClick={() => completeTask(task.id)} style={{ padding: '7px 16px', borderRadius: 8, background: C.green, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 650 }}>
                      Mark Completed
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
