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
export async function processSequenceStepForCompany(companyId, currentDraft) {
  try {
    if (!companyId || !currentDraft) return;

    // Check if company has already replied, bounced, or unsubscribed -> STOP sequence
    if (currentDraft.status === 'replied' || currentDraft.replied_at) {
      await db.run("UPDATE sequence_enrollments SET status = 'completed' WHERE company_id = ?", [companyId]);
      return;
    }

    const enrollment = await db.get('SELECT * FROM sequence_enrollments WHERE company_id = ? AND status = \'active\'', [companyId]);
    if (!enrollment) return;

    const sequence = await db.get('SELECT * FROM sequences WHERE id = ?', [enrollment.sequence_id]);
    if (!sequence) return;

    const nodes = sequence.nodes_json ? JSON.parse(sequence.nodes_json) : getDefaultSequenceNodes();
    const currentStepIndex = nodes.findIndex((n) => n.id === enrollment.current_step_id);

    const nextStep = nodes[currentStepIndex + 1];
    if (!nextStep) {
      await db.run("UPDATE sequence_enrollments SET status = 'completed' WHERE company_id = ?", [companyId]);
      return;
    }

    // Branch Condition Evaluation
    const wasOpened = (currentDraft.open_count || 0) > 0 || !!currentDraft.opened_at;
    const wasClicked = (currentDraft.click_count || 0) > 0 || !!currentDraft.clicked_at;

    if (nextStep.condition === 'opened_no_reply' && !wasOpened) return;
    if (nextStep.condition === 'clicked_no_reply' && !wasClicked) return;

    if (nextStep.type.startsWith('linkedin') || nextStep.type === 'phone_call' || nextStep.type === 'manual_followup') {
      // Create multi-channel manual reminder task
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
  } catch (err) {
    console.error('Error processing sequence step:', err.message);
  }
}
