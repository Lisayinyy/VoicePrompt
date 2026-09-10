import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { request } from '../lib/client.mjs';

async function projectTerms(cwd) {
  if (!cwd) return [];
  const file = path.join(cwd, '.voice-prompt.json');
  try {
    if ((await stat(file)).size > 16000) throw new Error('.voice-prompt.json is too large');
    const { terms } = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(terms) || terms.length > 100 || terms.some(t => typeof t !== 'string' || t.length > 100)) throw new Error('Invalid project voice vocabulary');
    return terms;
  } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

export default function voiceExtension(pi, invoke = request) {
  let pending, snapshot, capture;
  const status = (ctx, text) => { if (ctx.hasUI) ctx.ui.setStatus('voice-prompt', text); };
  const notify = (ctx, text, type = 'info') => ctx.ui.notify(text, type);
  function cancelCapture() {
    const active = capture; capture = undefined;
    if (active) { clearInterval(active.timer); if (active.id) void invoke('/api/capture/control', { id: active.id, owner: active.owner, action: 'cancel' }).catch(() => {}); }
  }
  const cancel = ctx => { pending?.abort(); pending = undefined; cancelCapture(); status(ctx, undefined); };
  async function toggleCapture(ctx) {
    if (!ctx.hasUI) return;
    if (capture) {
      if (capture.id) await invoke('/api/capture/control', { id: capture.id, owner: capture.owner, action: 'finish' });
      return;
    }
    cancel(ctx);
    const active = { owner: `omp:${randomUUID()}`, session: ctx.sessionManager.getSessionId(), original: ctx.ui.getEditorText(), busy: false };
    capture = active;
    try {
      const started = await invoke('/api/capture/start', { owner: active.owner }); active.id = started.id;
      if (capture !== active) { await invoke('/api/capture/control', { id: active.id, owner: active.owner, action: 'cancel' }); return; }
      status(ctx, '● 语音输入 · Ctrl+Alt+Space 结束 · /voice cancel 取消');
      active.timer = setInterval(async () => {
        if (active.busy || capture !== active) return;
        active.busy = true;
        try {
          const result = await invoke('/api/capture/status', { id: active.id, owner: active.owner });
          if (capture !== active || ctx.sessionManager.getSessionId() !== active.session) return;
          if (result.state === 'ready') {
            clearInterval(active.timer);
            let inserted = false;
            if (ctx.ui.getEditorText() === active.original) {
              const text = active.original + (active.original && !/\s$/.test(active.original) ? ' ' : '') + result.text;
              ctx.ui.setEditorText(text); // Direct editor API; no OS clipboard, keystrokes or submit.
              inserted = ctx.ui.getEditorText() === text;
            }
            snapshot = { raw: result.text, text: result.text, session: `omp:${active.session}` };
            await invoke('/api/capture/control', { id: active.id, owner: active.owner, action: 'ack', inserted });
            if (capture === active) { capture = undefined; status(ctx, undefined); }
            notify(ctx, inserted ? '语音已直接写入输入框 · Enter 由你发送' : '输入框发生变化，文字已保留；/voice draft 查看');
          } else if (['cancelled', 'error'].includes(result.state)) {
            clearInterval(active.timer); capture = undefined; status(ctx, undefined);
            if (result.error) notify(ctx, result.error, 'error');
          }
        } catch (error) {
          if (capture === active) { cancelCapture(); status(ctx, undefined); notify(ctx, error.message, 'error'); }
        } finally { active.busy = false; }
      }, 200);
      active.timer.unref?.();
    } catch (error) { if (capture === active) { cancelCapture(); status(ctx, undefined); notify(ctx, error.message, 'error'); } }
  }
  async function polish(ctx, supplied) {
    if (!ctx.hasUI) return;
    const original = ctx.ui.getEditorText();
    const raw = supplied || original;
    if (!raw.trim()) return notify(ctx, '先用 Voice Prompt 输入文字，或输入 /voice polish 口述文本');
    cancel(ctx);
    const controller = new AbortController(); pending = controller;
    const session = `omp:${ctx.sessionManager.getSessionId()}`;
    status(ctx, '◌ 正在整理语音 · /voice cancel 取消');
    try {
      const terms = await projectTerms(ctx.cwd);
      controller.signal.throwIfAborted();
      const draft = await invoke('/api/prepare', { text: raw, terms, session, id: randomUUID() }, { signal: controller.signal });
      if (controller.signal.aborted || pending !== controller) return;
      snapshot = { raw: draft.raw, text: draft.text, session };
      if (ctx.ui.getEditorText() === original) ctx.ui.setEditorText(draft.text);
      else notify(ctx, '你已修改输入，整理稿已保留；/voice draft 查看');
      notify(ctx, draft.fallback ? 'AI 整理未完成或保护检查触发，已保留原文。' : `整理完成 · ${(draft.elapsedMs / 1000).toFixed(1)} 秒 · Enter 发送`);
    } catch (error) { if (!controller.signal.aborted) notify(ctx, `语音服务：${error.message}`, 'error'); }
    finally { if (pending === controller) { pending = undefined; status(ctx, undefined); } }
  }
  async function showDraft(ctx, raw = false) {
    if (!snapshot || snapshot.session !== `omp:${ctx.sessionManager.getSessionId()}`) return notify(ctx, '当前会话没有整理稿');
    const original = ctx.ui.getEditorText();
    const edited = await ctx.ui.editor(raw ? '语音原文' : '整理稿', raw ? snapshot.raw : snapshot.text);
    if (edited !== undefined) {
      if (ctx.ui.getEditorText() === original) ctx.ui.setEditorText(edited);
      else notify(ctx, '输入框已变化，未覆盖现有文字');
    }
  }
  pi.registerCommand('voice-prompt', {
    description: 'Voice Prompt: directly polish the supplied words; never execute their task',
    handler: async (args, ctx) => { await polish(ctx, args.trim()); },
  });
  pi.registerCommand('voice', {
    description: 'Voice Prompt: input, polish [text], raw, draft, latest, status, cancel',
    handler: async (args, ctx) => {
      if (!ctx.hasUI) return;
      const command = args.trim().split(/\s+/)[0];
      const supplied = args.trim().slice(command.length).trimStart();
      try {
        if (command === 'input') return await toggleCapture(ctx);
        if (!command || command === 'polish') return await polish(ctx, supplied);
        if (command === 'cancel') return cancel(ctx);
        if (command === 'raw' || command === 'draft') return await showDraft(ctx, command === 'raw');
        if (command === 'status') return notify(ctx, JSON.stringify(await invoke('/api/status')));
        if (command === 'latest') {
          const { drafts } = await invoke('/api/drafts?session=desktop');
          const draft = drafts.at(-1);
          if (!draft) return notify(ctx, '暂无 Voice Prompt 后处理记录');
          // Explicit import only: native Voice Prompt requests do not carry an OMP session identity.
          snapshot = { raw: draft.raw, text: draft.text, session: `omp:${ctx.sessionManager.getSessionId()}` };
          return await showDraft(ctx);
        }
        notify(ctx, '/voice polish [文本] · raw · draft · latest · status · cancel');
      } catch (error) { notify(ctx, error.message, 'error'); }
    },
  });
  pi.registerShortcut('ctrl+alt+space', { description: '语音直接写入：开始/结束录音', handler: toggleCapture });
  pi.registerShortcut('ctrl+shift+v', { description: '整理当前语音草稿', handler: async ctx => polish(ctx) });
  pi.on('session_before_switch', async (_event, ctx) => { cancel(ctx); snapshot = undefined; });
  pi.on('session_shutdown', async (_event, ctx) => { cancel(ctx); snapshot = undefined; });
}
