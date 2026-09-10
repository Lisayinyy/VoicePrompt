import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
const resources = path.resolve(process.argv[2] || path.join(homedir(), 'Applications/Voice Prompt.app/Contents/Resources'));
const home = await mkdtemp(path.join(tmpdir(),'voice-prompt-clean-'));
const token = randomBytes(32).toString('hex'), port=17967;
await writeFile(path.join(home,'config.json'),JSON.stringify({ token,port,provider:'unconfigured',engineCommand:path.join(resources,'bin/voice-asr'),speechModel:path.join(resources,'models/sensevoice-small.gguf') }));
const child=spawn(path.join(resources,'bin/node'),[path.join(resources,'plugin/server.mjs'),'serve'],{env:{HOME:home,PATH:'/usr/bin:/bin',VOICE_PROMPT_CONFIG:path.join(home,'config.json')},stdio:['ignore','ignore','pipe']});
let stderr='';child.stderr.on('data',d=>stderr+=d);
const api=async(route,body)=>{const r=await fetch(`http://127.0.0.1:${port}${route}`,{method:body?'POST':'GET',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(JSON.stringify(d));return d;};
try {
 let ready=false;for(let i=0;i<50;i++){try{await api('/api/status');ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}}
 if(!ready)throw Error(stderr);
 const status=await api('/api/status'),models=await api('/api/models'),samples=[];
 for(const language of ['zh','en']){
  const result=await api('/api/transcribe',{path:`/tmp/prompt-ai-voice-${language}.wav`});
  if(!result.text?.length)throw Error('No transcript');
  const draft=await api('/api/prepare',{text:result.text,session:'verification'});
  if(!draft.fallback || draft.text!==result.text)throw Error('Unconfigured AI must preserve original');
  samples.push({language,...result,fallback:draft.fallback});
 }
 const report={product:'Voice Prompt',version:'0.3.0',test:'fresh temporary HOME, only system PATH, no installed speech app, embedded Node+ASR+model',status,models,samples,microphoneHotkeyPasteVerified:false};
 console.log(JSON.stringify(report,null,2));
}finally{child.kill();await once(child,'exit');await rm(home,{recursive:true,force:true});}
