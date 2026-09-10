const $ = id => document.getElementById(id);
const incomingToken = location.hash.slice(1);
if (incomingToken) { sessionStorage.setItem('voice-prompt-token', incomingToken); history.replaceState(null, '', location.pathname); }
const token = sessionStorage.getItem('voice-prompt-token');
const session = `web:${crypto.randomUUID()}`;
let pending, draft, showRaw = false;
const notice = (text, warning = false) => { $('notice').textContent = text; $('notice').className = warning ? 'warning' : ''; };
async function api(route, body, signal) {
  const r = await fetch(route, { method: body === undefined ? 'GET' : 'POST', signal, headers: { authorization: `Bearer ${token || ''}`, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const value = await r.json(); if (!r.ok) throw new Error(value.error?.message || '请求失败'); return value;
}
function display(value) {
  draft = value; showRaw = false;
  $('output').value = value.text; $('original').disabled = false; $('copy').disabled = false;
  $('original').textContent = '查看原文'; $('timing').textContent = `${(value.elapsedMs / 1000).toFixed(1)} 秒`;
  notice(value.fallback ? 'AI 整理未完成或保护检查触发，已保留原文。你可以直接使用或重试。' : '草稿已准备好。检查后复制到 Agent 输入框。', value.fallback);
}
$('prepare').onclick = async () => {
  if (!$('input').value.trim()) return notice('请先输入一段口述。');
  pending?.abort(); const controller = new AbortController(); pending = controller;
  $('cancel').disabled = false; $('prepare').disabled = true; notice('正在整理… 可以取消，原文会保留。');
  const beforeOutput = $('output').value;
  try {
    const value = await api('/api/prepare', { text: $('input').value, mode: $('mode').value, session }, controller.signal);
    if (!controller.signal.aborted && pending === controller) {
      if ($('output').value !== beforeOutput) notice('你正在编辑结果，未覆盖现有草稿。请重新整理以查看新结果。', true);
      else display(value);
    }
  } catch (e) { if (!controller.signal.aborted) notice(e.message, true); }
  finally { if (pending === controller) { pending = undefined; $('cancel').disabled = true; $('prepare').disabled = false; } }
};
$('cancel').onclick = () => { pending?.abort(); pending = undefined; $('cancel').disabled = true; $('prepare').disabled = false; notice('已取消整理，原文仍在。Voice Prompt 录音需用它自己的取消快捷键。'); };
$('original').onclick = () => { if (!draft) return; if (!showRaw) draft.text = $('output').value; showRaw = !showRaw; $('output').value = showRaw ? draft.raw : draft.text; $('original').textContent = showRaw ? '返回整理稿' : '查看原文'; };
$('copy').onclick = async () => { try { await navigator.clipboard.writeText($('output').value); notice('已复制。粘贴到 Agent 输入框后，由你发送。'); } catch { $('output').select(); notice('请按 ⌘C 复制选中的草稿。'); } };
$('latest').onclick = async () => { try { const { drafts } = await api('/api/drafts?session=desktop'); if (!drafts.length) return notice('还没有 Voice Prompt 后处理记录。先用 Voice Prompt 的后处理快捷键说一段话。'); const d = drafts.at(-1); $('input').value = d.raw; display(d); } catch (e) { notice(e.message, true); } };
try { const state = await api('/api/status'); $('connection').textContent = state.aiConfigured ? '● 本地服务已连接' : '● 语音可用 · AI 未配置'; $('default-mode').value = state.defaultMode || 'clean'; $('provider').textContent = `整理后端：${state.provider} / ${state.model}。识别由 Voice Prompt 本地完成；文字会发送给配置的 AI 后端。`; }
catch (e) { $('connection').textContent = '未连接'; notice(e.message + '。请从 Voice Prompt 菜单打开设置。', true); }

$('save-mode').onclick = async () => {
  $('save-mode').disabled = true;
  try { const value = await api('/api/preferences', { defaultMode: $('default-mode').value }); $('preference-status').textContent = value.defaultMode === 'clean' ? '已切换为轻润色，下次 @ 润色时生效。' : '已切换为任务整理，下次 @ 润色时生效。'; }
  catch (e) { $('preference-status').textContent = e.message; }
  finally { $('save-mode').disabled = false; }
};
