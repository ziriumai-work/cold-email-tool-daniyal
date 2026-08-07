import * as db from './db.js';

/**
 * Default Conditional Sequence Definition Generator
 */
export function getDefaultSequenceNodes() {
  return [
    {
      id: 'step_1',
      type: 'email',
      name: 'Initial Outreach Email',
      delayDays: 0,
      condition: null,
    },
    {
      id: 'step_2_opened',
      type: 'email',
      name: 'Follow-up A (If Opened, No Reply)',
      delayDays: 2,
      condition: 'opened_no_reply',
    },
    {
      id: 'step_2_unopened',
      type: 'email',
      name: 'Follow-up B (If Unopened, No Reply)',
      delayDays: 4,
      condition: 'unopened_no_reply',
    },
    {
      id: 'step_3_linkedin',
      type: 'linkedin_connect',
      name: 'LinkedIn Connection Task',
      delayDays: 1,
      condition: 'no_reply',
    },
    {
      id: 'step_4_call',
      type: 'phone_call',
      name: 'Phone Call Task',
      delayDays: 2,
      condition: 'no_reply',
    }
  ];
}

/**
 * Evaluate if recipient local time is currently within working hours (e.g. 9am - 5pm Mon-Fri)
 */
export function isWithinRecipientWorkingHours(timezone = 'UTC', currentHours = null) {
  try {
    const now = new Date();
    const targetTimeStr = now.toLocaleString('en-US', { timeZone: timezone || 'UTC' });
    const localDate = new Date(targetTimeStr);
    const day = localDate.getDay(); // 0 = Sun, 6 = Sat
    const hour = currentHours !== null ? currentHours : localDate.getHours();

    if (day === 0 || day === 6) return false; // Weekend check
    return hour >= 9 && hour < 17; // 9:00 AM - 5:00 PM
  } catch (err) {
    return true; // Fallback to allow delivery if timezone parsing fails
  }
}

/**
 * Schedule next step in conditional sequence
 */
export async function enrollCompanyInSequence(companyId, sequenceId = null) {
  try {
    if (!companyId) return { ok: false, error: 'Company ID is required' };

    let targetSeqId = sequenceId;
    if (!targetSeqId) {
      const activeSeq = await db.get("SELECT id FROM sequences WHERE status = 'active' ORDER BY id DESC LIMIT 1");
      targetSeqId = activeSeq?.id;
    }

    if (!targetSeqId) {
      const defaultNodes = getDefaultSequenceNodes();
      await db.run(
        "INSERT INTO sequences (name, nodes_json, status, created_at) VALUES ('Standard Enterprise Branching Campaign', ?, 'active', datetime('now'))",
        [JSON.stringify(defaultNodes)]
      );
      const newSeq = await db.get("SELECT id FROM sequences ORDER BY id DESC LIMIT 1");
      targetSeqId = newSeq?.id || 1;
    }

    const seq = await db.get('SELECT * FROM sequences WHERE id = ?', [targetSeqId]);
    const nodes = seq?.nodes_json ? JSON.parse(seq.nodes_json) : getDefaultSequenceNodes();
    const firstStepId = nodes[0]?.id || 'step_1';

    // Check if existing active enrollment
    const existing = await db.get('SELECT id FROM sequence_enrollments WHERE company_id = ? AND status = \'active\'', [companyId]);
    if (existing) {
      await db.run(
        'UPDATE sequence_enrollments SET sequence_id = ?, current_step_id = ?, updated_at = datetime(\'now\') WHERE id = ?',
        [targetSeqId, firstStepId, existing.id]
      );
    } else {
      await db.run(
        'INSERT INTO sequence_enrollments (sequence_id, company_id, current_step_id, status, created_at) VALUES (?, ?, ?, \'active\', datetime(\'now\'))',
        [targetSeqId, companyId, firstStepId]
      );
    }

    return { ok: true, message: `Company #${companyId} successfully enrolled in sequence #${targetSeqId}` };
  } catch (err) {
    console.error('Error enrolling company in sequence:', err.message);
    return { ok: false, error: err.message };
  }
}

export async function processSequenceStepForCompany(companyId, currentDraft, eventType = null) {
  try {
    if (!companyId) return { ok: false, error: 'Missing company ID' };

    // Check if company has already replied, bounced, or unsubscribed -> STOP sequence
    if (currentDraft?.status === 'replied' || currentDraft?.replied_at || eventType === 'reply') {
      await db.run("UPDATE sequence_enrollments SET status = 'completed' WHERE company_id = ?", [companyId]);
      return { ok: true, message: 'Sequence completed due to reply' };
    }

    let enrollment = await db.get('SELECT * FROM sequence_enrollments WHERE company_id = ? AND status = \'active\'', [companyId]);
    if (!enrollment) {
      await enrollCompanyInSequence(companyId);
      enrollment = await db.get('SELECT * FROM sequence_enrollments WHERE company_id = ? AND status = \'active\'', [companyId]);
    }
    enrollment = enrollment || { id: 1, sequence_id: 1, current_step_id: 'step_1', status: 'active' };

    const sequence = await db.get('SELECT * FROM sequences WHERE id = ?', [enrollment.sequence_id]);
    const nodes = sequence?.nodes_json ? JSON.parse(sequence.nodes_json) : getDefaultSequenceNodes();
    let currentStepIndex = nodes.findIndex((n) => n.id === enrollment.current_step_id);

    if (currentStepIndex === -1) currentStepIndex = 0;

    const nextStep = nodes[currentStepIndex + 1];
    if (!nextStep) {
      await db.run("UPDATE sequence_enrollments SET status = 'completed' WHERE id = ?", [enrollment.id]);
      return { ok: true, message: 'Sequence reached final step and is completed' };
    }

    // Branch Condition Evaluation
    const draftInfo = currentDraft || (await db.get('SELECT * FROM drafts WHERE company_id = ? ORDER BY id DESC LIMIT 1', [companyId])) || {};
    const wasOpened = eventType === 'open' || (draftInfo.open_count || 0) > 0 || !!draftInfo.opened_at;
    const wasClicked = eventType === 'click' || (draftInfo.click_count || 0) > 0 || !!draftInfo.clicked_at;

    if (nextStep.condition === 'opened_no_reply' && !wasOpened) {
      return { ok: true, message: `Skipped step "${nextStep.name}": waiting for email open` };
    }
    if (nextStep.condition === 'clicked_no_reply' && !wasClicked) {
      return { ok: true, message: `Skipped step "${nextStep.name}": waiting for link click` };
    }
    if (nextStep.condition === 'unopened_no_reply' && wasOpened) {
      return { ok: true, message: `Skipped step "${nextStep.name}": email was opened` };
    }

    // Task / Action Generation
    if (nextStep.type.startsWith('linkedin') || nextStep.type === 'phone_call' || nextStep.type === 'manual_followup' || nextStep.type === 'task') {
      await db.run(
        `INSERT INTO multi_channel_tasks (company_id, task_type, description, status, due_at, created_at)
         VALUES (?, ?, ?, 'pending', datetime('now', '+1 day'), datetime('now'))`,
        [companyId, nextStep.type, nextStep.name]
      );
    }

    // Advance step
    await db.run(
      'UPDATE sequence_enrollments SET current_step_id = ? WHERE id = ?',
      [nextStep.id, enrollment.id]
    );

    return {
      ok: true,
      message: `Triggered step "${nextStep.name}" (${nextStep.type}) for company #${companyId}`,
      step: nextStep
    };
  } catch (err) {
    console.error('Error processing sequence step:', err.message);
    return { ok: false, error: err.message };
  }
}
