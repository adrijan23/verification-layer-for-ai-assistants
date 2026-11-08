/** Chat UI for the demo assistant ("Instinct"): chat + live view of the browser the agent drives. */
export function uiHtml(steps: { id: string; label: string }[], llm: boolean, opts: { demoTools: boolean; agentTag: string }): string {
  const tools = opts.demoTools;
  const buttons = steps
    .map(
      (s, i) =>
        `<button class="step" data-step="${s.id}" data-testid="step-${s.id}"><kbd>${i + 1}</kbd><span>${s.label}</span></button>`,
    )
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Instinct · assistant</title>
<style>
:root{--bg:#F6F5F2;--panel:#FFFFFF;--ink:#17171A;--muted:#6E6B66;--line:#E7E4DE;--accent:#5B4BFF;--ok:#15803D;--warn:#B45309;--err:#C0392B;--wait:#4C5BD4}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font:14px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.app{display:grid;grid-template-columns:400px minmax(0,1fr);height:100vh}
.chat{display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--line);background:var(--panel)}
.head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line)}
.logo{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--ink);color:#fff;font-size:18px}
.head b{font-size:15px}.head small{display:block;color:var(--muted);font-size:12px}
.llm{margin-left:auto;font-size:11px;padding:3px 8px;border-radius:999px;background:#EFEDE8;color:var(--muted)}
.msgs{flex:1;min-height:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px}
.m{max-width:88%;padding:9px 12px;border-radius:16px;animation:in .25s ease-out;white-space:pre-wrap;word-wrap:break-word}
.m.user{align-self:flex-end;background:var(--ink);color:#fff;border-bottom-right-radius:5px}
.m.agent{align-self:flex-start;background:#F1EFEA;border-bottom-left-radius:5px}
.m.agent.ok{background:#E9F7EF;color:#14532D}.m.agent.warn{background:#FEF3E2;color:#7C3A06}
.m.agent.error{background:#FDECEA;color:#8E2A1F}.m.agent.wait{background:#ECEEFE;color:#2A3591}
.m.system{align-self:center;background:transparent;color:var(--muted);font-size:12px;text-align:center}
.typing{align-self:flex-start;color:var(--muted);font-size:12px;padding:0 4px}
.steps{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:10px 12px;border-top:1px solid var(--line)}
.step{display:flex;align-items:center;gap:8px;text-align:left;border:1px solid var(--line);background:#FBFAF8;border-radius:10px;padding:7px 9px;font:inherit;font-size:12.5px;color:var(--ink);cursor:pointer}
.step:hover{border-color:#CFCBC3}.step:disabled{opacity:.45;cursor:wait}
kbd{display:inline-grid;place-items:center;min-width:20px;height:20px;border-radius:6px;background:#EFEDE8;font:600 11px ui-monospace,monospace;color:var(--muted)}
.compose{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line)}
.compose input{flex:1;min-width:0;border:1px solid var(--line);border-radius:12px;padding:10px 12px;font:inherit;outline:none;background:#FBFAF8}
.compose input:focus{border-color:var(--accent)}
.compose button,.reset{border:0;border-radius:12px;padding:0 14px;font:600 13px inherit;background:var(--ink);color:#fff;cursor:pointer}
.reset{background:transparent;color:var(--muted);padding:4px 0;font-size:12px;text-decoration:underline;text-underline-offset:2px}
.view{display:flex;flex-direction:column;min-width:0;min-height:0;padding:16px;gap:10px}
.bar{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:12px 12px 0 0;padding:8px 10px}
.dots{display:flex;gap:5px}.dots i{width:10px;height:10px;border-radius:50%;background:#E3E0DA}
.url{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#F3F1ED;border-radius:8px;padding:5px 10px;font:12px ui-monospace,monospace;color:#4A4743}
.ua{font:11px ui-monospace,monospace;color:var(--muted)}
.screen{position:relative;flex:1;min-height:0;background:#fff;border:1px solid var(--line);border-top:0;border-radius:0 0 12px 12px;overflow:hidden;display:grid;place-items:center}
.screen img{width:100%;height:100%;object-fit:contain;object-position:top center;display:block}
.screen .idle{color:var(--muted)}
.busy{position:absolute;right:10px;bottom:10px;background:rgba(23,23,26,.85);color:#fff;font-size:12px;border-radius:999px;padding:5px 10px;display:none}
.busy.on{display:block}
@keyframes in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media (max-width:1000px){
  .app{grid-template-columns:1fr;grid-template-rows:minmax(0,46vh) minmax(0,1fr);height:100vh}
  .view{order:-1;padding:10px 10px 0}
  .chat{border-right:0;border-top:1px solid var(--line)}
}
@media (prefers-reduced-motion:reduce){.m{animation:none}}
</style></head><body>
<div class="app">
  <section class="chat">
    <div class="head"><span class="logo">✦</span><div><b>Instinct</b><small>Your personal assistant</small></div>
      ${tools ? `<span class="llm" title="Intent parsing">${llm ? 'Claude intent parsing' : 'Scripted mode'}</span>` : ''}</div>
    <div class="msgs" id="msgs" data-testid="agent-chat"></div>
    ${tools ? `<div class="steps">${buttons}</div>` : ''}
    <form class="compose" id="form"><input id="text" data-testid="agent-input" autocomplete="off" placeholder="Ask Instinct… e.g. Book me a flight to Paris this Friday">
      <button data-testid="agent-send">Send</button></form>
    ${tools ? `<div style="padding:0 12px 10px;display:flex;justify-content:space-between;align-items:center">
      <button class="reset" id="reset" data-testid="agent-reset"><kbd>0</kbd> New agent session</button>
      <span class="ua">UA: …${opts.agentTag}</span></div>` : ''}
  </section>
  <section class="view">
    <div style="display:flex;flex-direction:column;min-height:0;flex:1">
      <div class="bar"><span class="dots"><i></i><i></i><i></i></span><span class="url" id="url">about:blank</span></div>
      <div class="screen"><img id="frame" alt="Live view of the agent's browser" hidden><span class="idle" id="idle">The agent’s browser appears here.</span>
        <span class="busy" id="busy" data-testid="agent-busy">● working…</span></div>
    </div>
  </section>
</div>
<script>
(function(){
  var msgs=document.getElementById('msgs'),frame=document.getElementById('frame'),idle=document.getElementById('idle'),
      url=document.getElementById('url'),busyEl=document.getElementById('busy'),steps=[].slice.call(document.querySelectorAll('.step'));
  function add(m){var d=document.createElement('div');d.className='m '+m.role+(m.tone?' '+m.tone:'');d.textContent=m.text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;}
  function setBusy(b,task){busyEl.className='busy'+(b?' on':'');busyEl.textContent=b?'● '+(task||'working')+'…':'';steps.forEach(function(s){s.disabled=b;});}
  var es=new EventSource('/api/stream');
  es.onmessage=function(ev){var d=JSON.parse(ev.data);
    if(d.type==='history'){msgs.innerHTML='';d.items.forEach(add);setBusy(!!d.busy,d.busy);}
    else if(d.type==='chat')add(d);
    else if(d.type==='frame'){frame.src='data:image/jpeg;base64,'+d.data;frame.hidden=false;idle.hidden=true;if(d.url&&d.url.indexOf('data:')!==0)url.textContent=d.url;}
    else if(d.type==='status')setBusy(d.busy,d.task);
    else if(d.type==='reset'){msgs.innerHTML='';}
  };
  function post(u,b){return fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:b?JSON.stringify(b):undefined});}
  steps.forEach(function(s){s.addEventListener('click',function(){post('/api/run/'+s.dataset.step);});});
  document.getElementById('form').addEventListener('submit',function(e){e.preventDefault();var t=document.getElementById('text');if(!t.value.trim())return;post('/api/chat',{text:t.value});t.value='';});
  var rb=document.getElementById('reset');if(rb)rb.addEventListener('click',function(){post('/api/reset');});
  if(${tools ? 'true' : 'false'})document.addEventListener('keydown',function(e){if(e.target&&e.target.tagName==='INPUT')return;
    if(e.key==='0'){post('/api/reset');return;}var n=parseInt(e.key,10);if(n>=1&&n<=steps.length&&!steps[n-1].disabled)steps[n-1].click();});
})();
</script></body></html>`;
}
