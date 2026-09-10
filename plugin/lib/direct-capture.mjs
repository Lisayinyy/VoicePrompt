import { randomUUID } from 'node:crypto';

// One explicit editor-owned recording at a time. No focus guessing or draft broadcast.
export function createDirectCapture(now = Date.now) {
  let job;
  const live = () => {
    if (job && !['done', 'error', 'cancelled'].includes(job.state) && now() - job.created > 330000) { job.state = 'error'; job.error = 'Recording timed out'; delete job.text; job.command = 'cancel'; }
    return job;
  };
  const match = input => {
    live();
    if (!job || input.id !== job.id) throw new Error('Unknown recording');
    return job;
  };
  return (route, input = {}) => {
    if (route === 'start') {
      live();
      if (job && (job.command || !['done', 'error', 'cancelled'].includes(job.state))) throw new Error('Another recording is active');
      if (typeof input.owner !== 'string' || !/^[\w:.-]{1,150}$/.test(input.owner)) throw new Error('Invalid recording owner');
      job = { id: randomUUID(), owner: input.owner, state: 'queued', command: 'start', created: now() };
      return { id: job.id, state: job.state };
    }
    if (route === 'next') {
      live();
      if (!job?.command) return {};
      const command = job.command; delete job.command;
      return { id: job.id, command };
    }
    const current = match(input);
    if (route === 'update') {
      if (['done', 'error', 'cancelled'].includes(current.state)) return { state: current.state };
      if (!['recording', 'transcribing', 'ready', 'error', 'cancelled'].includes(input.state)) throw new Error('Invalid recording state');
      if (input.state === 'ready' && (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 16000)) throw new Error('Invalid transcript');
      const order = { queued: 0, recording: 1, transcribing: 2, ready: 3 };
      if (order[input.state] !== undefined && order[input.state] < order[current.state]) return { state: current.state };
      current.state = input.state;
      if (input.state === 'ready') { current.text = input.text; current.readyAt = now(); }
      if (input.error) current.error = String(input.error).slice(0, 300);
      return { state: current.state };
    }
    if (input.owner !== current.owner) throw new Error('Recording owner mismatch');
    if (route === 'status') return { id: current.id, state: current.state, text: current.text, error: current.error };
    if (route === 'control') {
      if (input.action === 'cancel') { current.state = 'cancelled'; delete current.text; current.command = 'cancel'; }
      else if (input.action === 'finish') {
        if (['queued', 'recording'].includes(current.state)) current.command = current.state === 'queued' ? 'start-finish' : 'finish';
      } else if (input.action === 'ack') {
        if (current.state !== 'ready') throw new Error('No transcript to acknowledge');
        current.state = input.inserted === true ? 'done' : 'error'; current.command = input.inserted === true ? 'inserted' : 'rejected'; delete current.text;
      } else throw new Error('Invalid recording action');
      return { state: current.state };
    }
    throw new Error('Unknown recording route');
  };
}
