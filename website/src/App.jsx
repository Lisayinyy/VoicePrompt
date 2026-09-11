import { useState, useRef } from 'react';
import { ArrowRight, Microphone, Sparkle, DownloadSimple, X, Check, Waveform, ArrowUpRight } from '@phosphor-icons/react';
const repo='https://github.com/Lisayinyy/VoicePrompt';
const release=repo+'/releases/tag/v0.7.0-beta.3';
const download=repo+'/releases/download/v0.7.0-beta.3/voice-prompt-desktop-0.7.0-macos-arm64.zip';
const examples=[
 {label:'产品介绍',raw:'嗯……帮我写一个产品介绍，主要是面向开发者，突出语音输入的效率提升，语气专业一点，但不要太正式……顺便提一下隐私',result:'请撰写一段面向开发者的产品介绍，突出语音输入带来的效率提升，语气专业但不刻板，同时简要说明隐私保护机制'},
 {label:'开发需求',raw:'帮我看看那个登录页，嗯，按钮好像不太明显，然后先给我方案就好，不要修改数据库，版本还是 2.0',result:'请检查 2.0 版本的登录页，重点改善按钮的辨识度。先提供方案，不要修改数据库'},
 {label:'英文表达',raw:'Um, could you help me draft a short update for the team, about the new voice feature, just three bullets, and don’t promise a release date yet',result:'Draft a brief team update about the new voice feature in three bullet points. Do not commit to a release date'}
];
export function App(){
 const [selected,setSelected]=useState(0); const [modal,setModal]=useState(null); const dialog=useRef(null); const [shown,setShown]=useState(true);
 const show=(kind)=>{setModal(kind);dialog.current.showModal()}; const close=()=>dialog.current.close(); const ex=examples[selected];
 return <>
 <a className="skip" href="#main">跳到内容</a>
 <header><a className="brand" href="#" aria-label="Voice Prompt 首页"><Waveform weight="bold"/>Voice Prompt</a><nav aria-label="主导航"><a href="#about">关于</a><a href={repo+'/blob/main/CHANGELOG.md'} target="_blank" rel="noreferrer">更新记录</a><a href={repo} target="_blank" rel="noreferrer">开发者</a><button className="button dark small" onClick={()=>show('download')}>下载 macOS 内测版</button></nav></header>
 <main id="main">
 <section className="hero" aria-labelledby="hero-title">
 <div className="ribbon" aria-hidden="true"><img src="/hero-ribbon.png" alt=""/><div className="ribbon-labels"><span>捕捉想法</span><span>理解意图</span><span>生成清晰的 Prompt</span></div></div>
 <div className="hero-copy"><h1 id="hero-title">想法说出来<br/><span>Prompt 自然清晰</span></h1><p className="lead">用自然的语言记录你的想法，Voice Prompt 将它整理成<br className="wide-break"/>清晰的 Prompt，让你更从容地开始创作</p><div className="actions"><button className="button dark" onClick={()=>show('download')}>下载 macOS 内测版 <ArrowRight/></button><button className="text-button" onClick={()=>show('guide')}>MiniMax Code 使用指南 <ArrowRight/></button></div><p className="hint">按下快捷键，开始说话</p></div>
 </section>
 <section className="demo" aria-label="语音润色示例">
 <div className="demo-heading"><strong>示例</strong><div className="rule"/><span>等待确认发送</span></div>
 <div className="demo-grid"><article className="sample raw"><div className="icon-circle"><Microphone size={26}/></div><div><span className="tag">你说的话</span><p>{ex.raw}</p></div></article><ArrowRight className="between" size={26}/><article className="sample polished"><div className="icon-circle purple"><Sparkle size={28} weight="fill"/></div><div><span className="tag purple">Voice Prompt 整理后的 Prompt</span><p aria-live="polite">{shown?ex.result:'点击「查看整理结果」，看看表达如何变清晰'}</p><button className="result-button" onClick={()=>setShown(!shown)}>{shown?'收起整理结果':'查看整理结果'} <ArrowRight size={14}/></button></div></article></div>
 <div className="demo-bottom"><div className="example-switch" aria-label="选择示例">{examples.map((item,i)=><button key={item.label} aria-pressed={selected===i} onClick={()=>{setSelected(i);setShown(true)}}>{item.label}</button>)}</div><span>预设示例 · 不录音、不上传</span></div>
 <p className="closing-line">更自然地思考，更清晰地表达</p>
 </section>
 <section className="about" id="about"><div><span className="eyebrow">你的思路，你做主</span><h2>表达可以随意<br/>意思不能走样</h2></div><div className="about-copy"><p>整理口头禅、重复和零散的表达，保留你说的数字、限制和重点。润色后的文字填回输入框，最后一次确认，始终留给你</p><div className="facts"><span><Check/> 本地语音识别</span><span><Check/> 可选择 AI 润色</span><span><Check/> 确认后发送</span></div><button className="text-button" onClick={()=>show('privacy')}>数据如何处理 <ArrowUpRight/></button></div></section>
 <section className="start"><h2>下一次想法，试着说出来</h2><p>从你的 Mac 开始，连接熟悉的 Agent 工作流</p><button className="button dark" onClick={()=>show('download')}>下载 macOS 内测版 <DownloadSimple/></button><small>Apple Silicon · Qwen 本地识别需 macOS 15 或以上</small></section>
 </main>
 <footer><a className="brand" href="#"><Waveform weight="bold"/>Voice Prompt</a><span>个人开发 · 开源内测</span><div><button onClick={()=>show('guide')}>安装指南</button><button onClick={()=>show('privacy')}>数据说明</button><a href={repo+'/issues'} target="_blank" rel="noreferrer">反馈问题</a></div></footer>
 <dialog ref={dialog} onClick={e=>{if(e.target===dialog.current)close()}} aria-labelledby="dialog-title"><button className="close" onClick={close} aria-label="关闭"><X size={22}/></button>
 {modal==='download'&&<><span className="eyebrow">macOS 内测版 · 0.7.0</span><h2 id="dialog-title">把声音带进工作流</h2><p>适用于 Apple Silicon Mac。使用 Qwen 本地模型需要 macOS 15 或以上，首次使用会下载约 2.46 GB 的模型</p><ol><li>下载并解压，将 Voice Prompt 放入「应用程序」</li><li>按照安装指南准备模型，完成麦克风与辅助功能授权</li><li>配置润色服务，在目标输入框按应用中设置的快捷键开始</li></ol><p className="notice">当前是未公证的内测包，macOS 可能提示安全检查。请按安装指南操作。共享云端润色尚未开放，AI 服务费用取决于你的配置</p><a className="button dark" href={download}>下载桌面应用 <DownloadSimple/></a><div className="modal-links"><a href={repo+'/blob/main/docs/agent-setup.md'} target="_blank" rel="noreferrer">完整安装指南</a><a href={release} target="_blank" rel="noreferrer">版本与校验文件</a></div></>}
 {modal==='guide'&&<><span className="eyebrow">MiniMax Code</span><h2 id="dialog-title">从说话到输入框</h2><p>桌面应用负责录音、预览和填入，插件帮助 Agent 检查配置、完成安装和整理文字</p><ol><li>安装 Voice Prompt 桌面应用与模型，按系统提示完成授权</li><li>在 MiniMax Code 中导入对应插件包，允许 Agent 按指南协助安装</li><li>发送下方指令，检查首次配置</li></ol><pre>@Voice Prompt 帮我完成首次安装并开启录音后 AI 润色</pre><p>之后点击目标输入框，使用应用里配置的快捷键说话；结束后查看草稿，确认再发送</p><p className="notice">插件市场审核尚未完成。目前使用仓库提供的内测安装流程，不会自动继承 MiniMax Code 的账号额度</p><a className="button dark" href={repo+'/blob/main/docs/agent-setup.md'} target="_blank" rel="noreferrer">打开完整安装指南 <ArrowUpRight/></a></>}
 {modal==='privacy'&&<><span className="eyebrow">清楚的数据边界</span><h2 id="dialog-title">声音留在本地<br/>润色由你选择</h2><p>使用本地 Qwen 识别时，录音在你的 Mac 上转为文字</p><p>开启云端 AI 润色后，转录文字会发送给你配置的模型服务。第三方的数据政策与费用适用；不要将敏感信息发送给不适合处理它的服务</p><p>这个演示网站不录音、不调用模型，也不收集邮箱。点击下载和文档链接后会访问 GitHub</p><a className="text-button" href={repo} target="_blank" rel="noreferrer">查看开源实现 <ArrowUpRight/></a></>}
 </dialog></>;
}
