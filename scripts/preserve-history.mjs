// Temporary update helper: keep transcripts only in process memory, never on disk/stdout.
import { request } from '../plugin/lib/client.mjs';
const {drafts} = await request('/api/drafts?session=desktop');
const pending = drafts.filter(d => Date.now()-d.createdAt<3600000).slice(-20);
console.log(JSON.stringify({heldInMemory:pending.length}));
if (!pending.length) process.exit(0);
const deadline=Date.now()+300000;
let sawOffline = !process.argv.includes("--restart");
while(Date.now()<deadline) {
  try {
    const status=await request('/api/status');
    if(sawOffline && status.version==='0.6.5') {
      const result=await request('/api/history/restore',{drafts:pending});
      console.log(JSON.stringify(result)); process.exit(0);
    }
  } catch { sawOffline = true; }
  await new Promise(resolve=>setTimeout(resolve,500));
}
console.error('Update recovery timed out; in-memory handoff was not confirmed.'); process.exitCode=1;
