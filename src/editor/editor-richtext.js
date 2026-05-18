
const CODE_LANGS=[
  ['plaintext','Text'],['python','Python'],['javascript','JavaScript'],['typescript','TypeScript'],
  ['java','Java'],['cpp','C++'],['csharp','C#'],['go','Go'],['rust','Rust'],['bash','Bash'],
  ['sql','SQL'],['json','JSON'],['yaml','YAML'],['xml','XML'],['html','HTML'],['css','CSS'],['markdown','Markdown']
];
function normalizeCodeLang(lang){
  const key=String(lang||'plaintext').toLowerCase().replace(/^language-/,'');
  const aliases={plain:'plaintext',text:'plaintext',txt:'plaintext',js:'javascript',ts:'typescript',sh:'bash',shell:'bash',c:'cpp','c++':'cpp','c#':'csharp',md:'markdown'};
  const val=aliases[key]||key;
  return CODE_LANGS.some(([id])=>id===val)?val:'plaintext';
}
function codeLangOptions(active){
  const lang=normalizeCodeLang(active);
  return CODE_LANGS.map(([id,label])=>'<option value="'+id+'"'+(id===lang?' selected':'')+'>'+label+'</option>').join('');
}
function createCodeBlock(lang){
  const active=normalizeCodeLang(lang);
  const pre=document.createElement('pre');
  const code=document.createElement('code');
  code.className='language-'+active;
  code.setAttribute('contenteditable','true');
  code.setAttribute('spellcheck','false');
  code.appendChild(document.createElement('br'));
  pre.appendChild(code);
  const sel=document.createElement('select');
  sel.className='code-lang';
  sel.setAttribute('contenteditable','false');
  sel.innerHTML=codeLangOptions(active);
  pre.appendChild(sel);
  const dots=document.createElement('span');
  dots.className='code-dots';
  dots.setAttribute('contenteditable','false');
  dots.textContent='···';
  pre.appendChild(dots);
  appendCodeDeleteButton(pre);
  return pre;
}
function getCodeLang(code){
  const cls=Array.from(code.classList).find(c=>c.startsWith('language-'));
  return normalizeCodeLang(cls||'plaintext');
}
function syncCodeSelect(select,lang){
  const active=normalizeCodeLang(lang);
  select.value=active;
  Array.from(select.options).forEach(opt=>{
    if(opt.value===active)opt.setAttribute('selected','selected');
    else opt.removeAttribute('selected');
  });
}
function ensureCodeBlock(pre){
  const code=pre.querySelector('code');
  if(!code)return;
  code.setAttribute('contenteditable','true');
  code.setAttribute('spellcheck','false');
  const active=getCodeLang(code);
  let select=pre.querySelector('select.code-lang');
  const oldLabel=pre.querySelector('span.code-lang');
  if(!select){
    select=document.createElement('select');
    select.className='code-lang';
    select.setAttribute('contenteditable','false');
    const oldLang=oldLabel?oldLabel.textContent:active;
    select.innerHTML=codeLangOptions(oldLang);
    if(oldLabel)oldLabel.replaceWith(select);else pre.appendChild(select);
  }
  syncCodeSelect(select,active);
  if(!pre.querySelector('.code-dots')){
    const dots=document.createElement('span');
    dots.className='code-dots';
    dots.setAttribute('contenteditable','false');
    dots.textContent='···';
    pre.appendChild(dots);
  }
  appendCodeDeleteButton(pre);
}
function appendCodeDeleteButton(pre){
  if(pre.querySelector('.code-delete'))return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='code-delete';
  btn.setAttribute('contenteditable','false');
  btn.title='删除代码块';
  btn.setAttribute('aria-label','删除代码块');
  btn.textContent='×';
  pre.appendChild(btn);
}
function placeCursorInCode(code,offset){
  code.focus();
  const sel=window.getSelection();
  const range=document.createRange();
  if(!code.textContent){
    range.setStart(code,0);
  }else{
    const walker=document.createTreeWalker(code,NodeFilter.SHOW_TEXT,null);
    let pos=0,placed=false;
    while(walker.nextNode()){
      const node=walker.currentNode;
      if(pos+node.length>=offset){
        range.setStart(node,Math.max(0,offset-pos));
        placed=true;
        break;
      }
      pos+=node.length;
    }
    if(!placed)range.selectNodeContents(code);
  }
  range.collapse(true);
  sel.removeAllRanges();sel.addRange(range);
}
function rehighlightCode(code,keepCursor){
  if(!code||typeof hljs==='undefined')return;
  const offset=keepCursor?getCursorOffsetInCode(code):null;
  code.removeAttribute('data-highlighted');
  try{hljs.highlightElement(code)}catch(e){}
  if(keepCursor&&offset!==null)placeCursorInCode(code,offset);
}
function getCursorOffsetInCode(code){
  const s=window.getSelection();if(!s.rangeCount)return null;
  const range=s.getRangeAt(0);
  if(!code.contains(range.startContainer))return null;
  const preRange=document.createRange();
  preRange.selectNodeContents(code);
  preRange.setEnd(range.startContainer,range.startOffset);
  return preRange.toString().length;
}

// ===== Render on load =====
function waitForLibs(){
  if(typeof katex!=='undefined'&&typeof hljs!=='undefined'){
    renderAllContent();return;
  }
  setTimeout(waitForLibs,100);
}
waitForLibs();

function ensureFoldButton(){
  const bar=document.getElementById('fbar');
  if(!bar||bar.querySelector('[data-action="toggle-fold-selection"]'))return;
  const bodyBtn=bar.querySelector('[data-action="set-block-format"][data-format="p"]');
  if(!bodyBtn)return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.dataset.action='toggle-fold-selection';
  btn.title='折叠/展开选中行';
  btn.setAttribute('aria-label','折叠/展开选中行');
  btn.innerHTML='<span class="txt fold-style">⌄</span>';
  btn.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    toggleFoldSelection();
  });
  bodyBtn.after(btn);
}
ensureFoldButton();
let lastFoldTriggerAt=0;
function triggerFoldFromToolbarEvent(e){
  const btn=e.target&&e.target.closest&&e.target.closest('[data-action="toggle-fold-selection"]');
  if(!btn)return false;
  e.preventDefault();
  e.stopImmediatePropagation();
  const now=Date.now();
  if(now-lastFoldTriggerAt<220)return true;
  lastFoldTriggerAt=now;
  toggleFoldSelection();
  return true;
}
document.addEventListener('pointerdown',triggerFoldFromToolbarEvent,true);
document.addEventListener('mousedown',triggerFoldFromToolbarEvent,true);
document.addEventListener('click',triggerFoldFromToolbarEvent,true);
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.altKey&&e.key.toLowerCase()==='f'){
    e.preventDefault();
    toggleFoldSelection();
  }
},true);

function editorBlockRootFromNode(node){
  let el=node&&node.nodeType===1?node:node&&node.parentElement;
  while(el&&el.parentElement&&el.parentElement!==doc)el=el.parentElement;
  return el&&el.parentElement===doc?el:null;
}
function activeEditorBlockRoot(){
  const sel=window.getSelection();
  if(!sel||!sel.rangeCount)return null;
  return editorBlockRootFromNode(sel.anchorNode);
}
function renderEditorBlock(root){
  if(!root)return;
  normalizeEditorTypography(root);
  root.querySelectorAll('.tex,.tex-display').forEach(el=>{
    const s=el.getAttribute('data-tex');
    if(s&&typeof katex!=='undefined'){try{katex.render(s,el,{throwOnError:false,displayMode:el.classList.contains('tex-display')})}catch(e){}}
  });
  const pres=root.matches&&root.matches('pre')?[root]:Array.from(root.querySelectorAll('pre'));
  pres.forEach(pre=>{
    ensureCodeBlock(pre);
    const code=pre.querySelector('code');
    if(code&&!code.classList.contains('hljs'))rehighlightCode(code,false);
  });
  root.querySelectorAll('span[style*="background-color"]').forEach(s=>{
    if(!s.classList.contains('hl'))s.classList.add('hl');
  });
  root.querySelectorAll('a[href]').forEach(a=>{
    const href=normalizeLinkHref(a.getAttribute('href'));
    if(href){
      a.setAttribute('href',href);
      a.target='_blank';
      a.rel='noopener noreferrer';
    }else{
      a.removeAttribute('href');
    }
  });
}
function renderActiveEditorBlock(){
  if(getCursorCode())return;
  renderEditorBlock(activeEditorBlockRoot());
  queueGravityUI();
}
function renderAllContent(){
  normalizeEditorTypography(doc);
  const roots=Array.from(doc.childNodes).filter(node=>node.nodeType===1);
  if(roots.length)roots.forEach(renderEditorBlock);
  else renderEditorBlock(doc);
  queueGravityUI();
}
function topLevelBlockFromPointNode(node){
  let el=node&&node.nodeType===1?node:node&&node.parentElement;
  while(el&&el.parentElement&&el.parentElement!==doc)el=el.parentElement;
  return el&&el.parentElement===doc?el:null;
}
function ensureTopLevelTextBlocks(){
  Array.from(doc.childNodes).forEach(node=>{
    if(node.nodeType!==3||!node.textContent.trim())return;
    const p=document.createElement('p');
    p.textContent=node.textContent;
    node.replaceWith(p);
  });
}
function selectionFoldBlocks(){
  ensureTopLevelTextBlocks();
  const sel=window.getSelection();
  let range=sel&&sel.rangeCount?sel.getRangeAt(0):null;
  if((!range||!doc.contains(range.commonAncestorContainer))&&editorSavedRange)range=editorSavedRange.cloneRange();
  if(!range)return [];
  if(!doc.contains(range.commonAncestorContainer))return [];
  if(range.collapsed){
    const block=topLevelBlockFromPointNode(range.startContainer);
    if(block)return [block];
    const active=activeEditorBlockRoot();
    return active?[active]:[];
  }
  const blocks=Array.from(doc.children).filter(el=>range.intersectsNode(el));
  return blocks.length?blocks:(activeEditorBlockRoot()?[activeEditorBlockRoot()]:[]);
}
function wrapFoldBlocks(blocks){
  const valid=blocks.filter(block=>block&&block.parentElement===doc);
  if(!valid.length)return null;
  const box=document.createElement('div');
  box.className='folded-block';
  box.setAttribute('data-folded','1');
  box.setAttribute('contenteditable','false');
  const content=document.createElement('div');
  content.className='fold-content';
  box.appendChild(content);
  doc.insertBefore(box,valid[0]);
  valid.forEach(block=>content.appendChild(block));
  return box;
}
function unwrapFoldBlock(block){
  if(!block||!block.classList||!block.classList.contains('folded-block'))return false;
  const content=block.querySelector(':scope > .fold-content');
  const parent=block.parentNode;
  const restored=content?Array.from(content.childNodes):Array.from(block.childNodes);
  restored.forEach(node=>parent.insertBefore(node,block));
  block.remove();
  return restored.find(node=>node.nodeType===1)||null;
}
function setBlocksFolded(blocks,folded){
  let target=null;
  if(folded){
    target=wrapFoldBlocks(blocks);
  }else{
    blocks.forEach(block=>{
      const foldedBlock=block.classList&&block.classList.contains('folded-block')?block:block.closest&&block.closest('.folded-block');
      target=unwrapFoldBlock(foldedBlock)||target;
    });
  }
  pushUndo();
  save();
  return target;
}
function toggleFoldSelection(){
  restoreEditorSelection();
  let blocks=selectionFoldBlocks();
  if(!blocks.length){
    const block=activeEditorBlockRoot()||getCursorBlock();
    if(!block)return;
    blocks.push(block);
  }
  const shouldUnfold=blocks.some(block=>block.classList&&block.classList.contains('folded-block'));
  const target=setBlocksFolded(blocks,!shouldUnfold);
  if(target&&target.parentNode){
    const range=document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    const sel=window.getSelection();
    sel.removeAllRanges();sel.addRange(range);
  }
  rememberEditorSelection();
}
function unfoldBlock(block){
  const restored=setBlocksFolded([block],false);
  if(!restored)return false;
  const range=document.createRange();
  range.selectNodeContents(restored);
  range.collapse(false);
  const sel=window.getSelection();
  sel.removeAllRanges();sel.addRange(range);
  return true;
}

// ===== Auto-save =====
doc.addEventListener('input',()=>{
  const activeCode=getCursorCode();
  trackDailyWriting();
  scheduleLocalDraftSave();
  showSt('saving');clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{queueFileWrite(latestFileSnapshot);showSt('saved')},FILE_WRITE_DELAY);
  if(activeCode){
    queueGravityUI();
    return;
  }
  // Trigger auto-render checks (also handles markdown shortcuts like ```python)
  setTimeout(()=>{autoRenderCheck()},0);
  setTimeout(()=>{renderActiveEditorBlock()},0);
  // Real-time syntax highlighting in code blocks
  highlightCodeBlock();
  queueGravityUI();
});
doc.addEventListener('click',e=>{
  const folded=e.target&&e.target.closest&&e.target.closest('.folded-block');
  if(folded&&doc.contains(folded)){
    e.preventDefault();
    unfoldBlock(folded);
  }
});
doc.addEventListener('blur',()=>{clearTimeout(saveTimer);save()});
doc.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&handleCodeEnter(e))return;
  if(e.key==='Enter'&&!e.shiftKey&&handleHeadingEnter(e))return;
  if((e.key==='Backspace'||e.key==='Delete')&&handleEmptyListExit(e))return;
  if((e.key===' '||e.key==='Enter')&&renderPendingMarkdownLink(e))return;
  if(e.key==='Enter'){handleMdEnter(e)}
  if(e.key==='Tab'){handleTab(e)}
});
window.addEventListener('beforeunload',()=>{clearTimeout(saveTimer);save()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){clearTimeout(saveTimer);save()}});

let hlTimer=null;
function highlightCodeBlock(){
  clearTimeout(hlTimer);
  hlTimer=setTimeout(()=>{
    const s=window.getSelection();if(!s.rangeCount)return;
    let n=s.anchorNode;
    if(!n)return;
    const codeEl=n.nodeType===3?n.parentElement:n;
    if(!codeEl)return;
    const pre=codeEl.closest('pre');
    if(!pre)return;
    const code=pre.querySelector('code');
    if(!code||typeof hljs==='undefined')return;
    code.classList.remove('hljs');
    code.removeAttribute('data-highlighted');
  },300);
}

function restoreCursorInCode(code,offset){
  placeCursorInCode(code,offset);
}

function save(){
  clearTimeout(localSaveTimer);
  const snapshot=saveLocalDraft(true);
  renderCal({animate:false});
  queueFileWrite(snapshot);
}
function scheduleLocalDraftSave(){
  setPendingSync(true);
  clearTimeout(localSaveTimer);
  localSaveTimer=setTimeout(()=>{
    latestFileSnapshot=saveLocalDraft(true,{normalize:false});
    renderCal({animate:false});
  },LOCAL_SAVE_DELAY);
}
function saveLocalDraft(pending,options={}){
  markDate();
  flushDailyWriting();
  if(options.normalize!==false)normalizeEditorTypography(doc);
  const snapshot={doc:doc.innerHTML,dates:getDates(),stats:getStats(),todos:getTodos(),savedAt:new Date().toISOString()};
  try{
    trySaveLocalSnapshot(snapshot);
  }catch(e){
    console.error('本地保存失败',e);
    if(!localSaveErrorShown){
      localSaveErrorShown=true;
      alert('本地缓存空间不足，图片可能太大。Gravilog 会继续尝试写入云文档，请等右侧显示“已保存到云文档”后再刷新。');
    }
  }
  if(pending)setPendingSync(true);
  latestFileSnapshot=snapshot;
  return snapshot;
}
function showSt(s){const e=document.getElementById('st');e.textContent=s==='saving'?'...':'OK';if(s==='saved')setTimeout(()=>{e.textContent=''},1500)}
function markDate(){const d=getDates();const t=todayStr();if(!d.includes(t)){d.push(t);saveDates(d)}}
function markCalendarDate(s){const d=getDates();if(!d.includes(s)){d.push(s);saveDates(d)}}
function writingLength(){return (doc.innerText||'').replace(/\s+/g,'').replace(/\u200b/g,'').length}
function resetWritingBaseline(){lastWritingLen=writingLength()}
function trackDailyWriting(){
  const len=writingLength();
  const delta=len-lastWritingLen;
  lastWritingLen=len;
  if(delta>0){
    markActiveBlockDate();
    pendingCharDelta+=delta;
    pendingDateMark=true;
  }
}
function flushDailyWriting(){
  if(pendingDateMark){markDate();pendingDateMark=false}
  if(pendingCharDelta>0){
    addDailyChars(pendingCharDelta);
    pendingCharDelta=0;
  }
}
function saveTodos(todos){
  const snapshot={doc:doc.innerHTML,dates:getDates(),stats:getStats(),todos:normalizeTodos(todos),savedAt:new Date().toISOString()};
  trySaveLocalSnapshot(snapshot);
  setPendingSync(true);
  latestFileSnapshot=snapshot;
  renderCal();
  queueFileWrite(latestFileSnapshot);
}
function addDailyChars(n){
  const stats=getStats(),t=todayStr();
  stats[t]=(stats[t]||0)+n;
  saveStats(stats);
  markDate();
}
function fmtAmt(n){return n>=1000?Math.floor(n/1000)+'k':String(n)}
function statLevel(n){return n>=1200?4:n>=500?3:n>=120?2:n>0?1:0}

// ===== Toolbar show/hide =====
doc.addEventListener('focus',()=>document.getElementById('fbar').classList.add('show'));
doc.addEventListener('blur',()=>setTimeout(()=>{
  if(!document.activeElement||!document.activeElement.closest('.fbar,.ctx-bar,.tex-input,.td-dlg')){
    hideCtxBars();
  }
},200));

// ===== Auto-render: LaTeX + Inline Markdown + Block Shortcuts =====
function autoRenderCheck(){
  const s=window.getSelection();
  if(!s.rangeCount)return;
  let n=s.anchorNode;
  if(!n)return;

  // If inside a code block, skip
  if(n.nodeType===1&&n.closest&&n.closest('pre'))return;
  if(n.parentNode&&n.parentNode.closest&&n.parentNode.closest('pre'))return;

  // Get the text node
  if(n.nodeType!==3)return;

  const t=n.textContent;
  const off=s.anchorOffset;
  if(off<=0)return;
  const before=t.substring(0,off);

  // === Block-level shortcuts ===
  // Skip inline rendering if this looks like a code block fence in progress
  if(/```/.test(before))return;

  // Heading: # ~ ######
  const hm=before.match(/^(#{1,6})\s+$/);
  if(hm){const rest=n.textContent.substring(hm[0].length);n.textContent=rest||'​';document.execCommand('formatBlock',false,'h'+hm[1].length);return}

  // Todo: - [ ] or - [x] (must check before unordered list)
  const tm=before.match(/^- \[([ xX])\]\s+$/);
  if(tm){const checked=tm[1]!==' ';
    n.textContent='';
    const html='<div class="todo-item'+(checked?' checked':'')+'"><input type="checkbox"'+(checked?' checked':'')+'><span class="todo-text"><br></span></div>';
    document.execCommand('insertHTML',false,html);return;
  }

  // Todo inside list item: after "- " triggers UL, user types "[ ] " inside <li>
  const li=n.parentNode&&n.parentNode.closest?n.parentNode.closest('li'):null;
  if(li){
    const tm2=before.match(/^\[([ xX])\]\s+$/);
    if(tm2){const checked=tm2[1]!==' ';
      li.remove();
      const html='<div class="todo-item'+(checked?' checked':'')+'"><input type="checkbox"'+(checked?' checked':'')+'><span class="todo-text"><br></span></div>';
      document.execCommand('insertHTML',false,html);return;
    }
  }

  // Unordered list: - or * (alone on line)
  if(/^[-*]\s+$/.test(before)){insertList('ul',{markerNode:n,markerLength:before.length});return}

  // Ordered list: 1. (alone on line)
  if(/^\d+\.\s+$/.test(before)){insertList('ol',{markerNode:n,markerLength:before.length});return}

  // Blockquote: >
  if(/^>\s+$/.test(before)){const rest=n.textContent.substring(before.length);n.textContent=rest||'​';document.execCommand('formatBlock',false,'blockquote');return}

  // === Inline rendering ===
  // 1. Display math: $$...$$
  const dmIdx=before.lastIndexOf('$$');
  if(dmIdx>0){
    const openIdx=before.lastIndexOf('$$',dmIdx-1);
    if(openIdx>=0&&openIdx<dmIdx-1){
      const latex=before.substring(openIdx+2,dmIdx);
      const trailing=before.substring(dmIdx+2);
      if(latex.length>0&&!latex.includes('$$')&&trailing.trim()===''){
        doRenderLatex(n,openIdx,dmIdx+2,latex,true);
        return;
      }
    }
  }

  // 2. Inline math: $...$
  if(before.endsWith('$')&&before.length>1){
    let closeIdx=before.length-1;
    if(closeIdx>0&&before[closeIdx-1]==='$')return;
    let openIdx=-1;
    for(let i=closeIdx-1;i>=0;i--){
      if(before[i]==='$'){
        if(i>0&&before[i-1]==='$')continue;
        if(i+1<=closeIdx&&before[i+1]==='$')continue;
        openIdx=i;break;
      }
    }
    if(openIdx>=0&&closeIdx>openIdx+1){
      if(openIdx>0&&before[openIdx-1]==='$')return;
      const latex=before.substring(openIdx+1,closeIdx);
      if(latex.length>0&&!latex.includes('$')){
        doRenderLatex(n,openIdx,off,latex,false);
        return;
      }
    }
  }

  // 3. Inline code: `...`
  const cm=before.match(/`([^`]+)`$/);
  if(cm){const start=off-cm[0].length;doReplaceInline(n,start,off,cm[1],'code');return}

  // 4. Bold: **...**
  const bm=before.match(/\*\*([^*]+)\*\*$/);
  if(bm){const start=off-bm[0].length;doReplaceInline(n,start,off,bm[1],'b');return}

  // 5. Italic: *...* (not **)
  const im=before.match(/(?:^|[^*])\*([^*]+)\*$/);
  if(im){
    let openPos=-1;
    for(let i=before.length-2;i>=0;i--){
      if(before[i]==='*'&&(i===0||before[i-1]!=='*')&&(before[i+1]!=='*')){
        openPos=i;break;
      }
    }
    if(openPos>=0){
      const txt=before.substring(openPos+1,before.length-1);
      if(txt.length>0&&!txt.includes('*')){
        doReplaceInline(n,openPos,off,txt,'i');return;
      }
    }
  }
}

function doRenderLatex(node,start,end,latex,display){
  const before=node.textContent.substring(0,start);
  const after=node.textContent.substring(end);
  const parent=node.parentNode;
  if(!parent)return;

  const bf=document.createTextNode(before);
  const af=document.createTextNode(after||'​');
  const el=document.createElement('span');
  el.className=display?'tex-display':'tex';
  el.setAttribute('data-tex',latex);
  el.setAttribute('contenteditable','false');

  parent.insertBefore(bf,node);
  parent.insertBefore(el,node);
  parent.insertBefore(af,node);
  parent.removeChild(node);

  if(typeof katex!=='undefined'){
    try{katex.render(latex,el,{throwOnError:false,displayMode:display})}catch(e){el.textContent=latex}
  }

  // Cursor into the after-text node so user can keep typing / press Enter
  const sel=window.getSelection();const range=document.createRange();
  range.setStart(af,after?after.length:1);range.collapse(true);sel.removeAllRanges();sel.addRange(range);
  pushUndo();save();
}

function doReplaceInline(node,start,end,text,tag){
  const before=node.textContent.substring(0,start);
  const after=node.textContent.substring(end);
  const parent=node.parentNode;
  if(!parent)return;

  const bf=document.createTextNode(before);
  const af=document.createTextNode(after||'​');
  const el=document.createElement(tag);
  el.textContent=text;

  parent.insertBefore(bf,node);
  parent.insertBefore(el,node);
  parent.insertBefore(af,node);
  parent.removeChild(node);

  const sel=window.getSelection();const range=document.createRange();
  range.setStart(af,after?after.length:1);range.collapse(true);sel.removeAllRanges();sel.addRange(range);
  pushUndo();save();
}

function shouldSkipMarkdownLinkNode(node){
  const el=node.nodeType===3?node.parentElement:node;
  return !el||!doc.contains(el)||(el.closest&&el.closest('pre,a,.tex,.tex-display'));
}

function normalizeLinkHref(raw){
  const href=(raw||'').trim();
  if(!href||/[\u0000-\u001f\u007f\s]/.test(href))return '';
  const lower=href.toLowerCase();
  if(/^(javascript|data|vbscript):/.test(lower))return '';
  if(/^(https?:|mailto:|tel:)/i.test(href))return href;
  if(/^(#|\/|\.\/|\.\.\/)/.test(href))return href;
  return 'https://'+href;
}

function doRenderLink(node,start,end,text,href,rawHref){
  const before=node.textContent.substring(0,start);
  const after=node.textContent.substring(end);
  const parent=node.parentNode;
  if(!parent)return;

  const bf=document.createTextNode(before);
  const af=document.createTextNode(after||'\u200b');
  const el=document.createElement('a');
  el.textContent=text;
  el.setAttribute('href',href);
  el.target='_blank';
  el.rel='noopener noreferrer';
  el.title=rawHref||href;

  parent.insertBefore(bf,node);
  parent.insertBefore(el,node);
  parent.insertBefore(af,node);
  parent.removeChild(node);

  const sel=window.getSelection();const range=document.createRange();
  range.setStart(af,after?after.length:1);range.collapse(true);sel.removeAllRanges();sel.addRange(range);
  pushUndo();save();
}

function renderPendingMarkdownLink(e){
  const sel=window.getSelection();
  if(!sel||!sel.rangeCount||!sel.isCollapsed)return false;
  const node=sel.anchorNode;
  if(!node||node.nodeType!==3||shouldSkipMarkdownLinkNode(node))return false;
  const off=sel.anchorOffset;
  const before=node.textContent.substring(0,off);
  const match=before.match(/(?:^|[^!])\[([^\]\n]+)\]\(([^)\s]+)\)$/);
  if(!match)return false;
  const href=normalizeLinkHref(match[2]);
  if(!href)return false;
  const start=off-match[0].length+(match[0][0]==='['?0:1);
  e.preventDefault();
  doRenderLink(node,start,off,match[1],href,match[2]);
  if(e.key===' '){
    document.execCommand('insertText',false,' ');
  }else if(e.key==='Enter'){
    document.execCommand('insertParagraph',false,null);
  }
  return true;
}

// ===== Markdown shortcuts =====

function getCursorBlock(){
  const s=window.getSelection();if(!s.rangeCount)return null;
  let n=s.anchorNode;
  while(n&&n!==doc){
    if(n.nodeType===1&&['P','DIV','H1','H2','H3','H4','H5','H6','LI','BLOCKQUOTE'].includes(n.nodeName))return n;
    n=n.parentNode;
  }
  return null;
}

function isHeadingBlock(block){
  return !!(block&&/^H[1-6]$/.test(block.nodeName));
}

function setBlockFormat(format){
  restoreEditorSelection();
  const normalized=format==='p'?'p':'h2';
  document.execCommand('formatBlock',false,normalized);
  rememberEditorSelection();
  pushUndo();
  save();
}

function handleHeadingEnter(e){
  const heading=getCursorBlock();
  if(!isHeadingBlock(heading))return false;
  e.preventDefault();
  const sel=window.getSelection();
  const offset=sel&&sel.rangeCount&&heading.contains(sel.anchorNode)?textOffsetInElement(heading,sel.anchorNode,sel.anchorOffset):heading.textContent.length;
  const text=heading.textContent||'';
  const before=text.slice(0,offset),after=text.slice(offset);
  heading.textContent=before||'';
  if(!heading.childNodes.length)heading.appendChild(document.createElement('br'));
  const p=document.createElement('p');
  if(after)p.textContent=after;
  else p.appendChild(document.createElement('br'));
  heading.after(p);
  const range=document.createRange();
  if(after&&p.firstChild)range.setStart(p.firstChild,0);
  else range.setStart(p,0);
  range.collapse(true);
  sel.removeAllRanges();sel.addRange(range);
  pushUndo();save();
  return true;
}

function setCursorInText(el,offset){
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null);
  let pos=0,last=null;
  while(walker.nextNode()){
    const node=walker.currentNode;
    last=node;
    const next=pos+node.length;
    if(next>=offset){
      const range=document.createRange();
      range.setStart(node,Math.max(0,offset-pos));
      range.collapse(true);
      const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
      return;
    }
    pos=next;
  }
  const range=document.createRange();
  if(last)range.setStart(last,last.length);
  else range.setStart(el,0);
  range.collapse(true);
  const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
}

function textOffsetInElement(el,node,offset){
  const range=document.createRange();
  range.selectNodeContents(el);
  try{range.setEnd(node,offset)}catch(e){return el.textContent.length}
  return range.toString().length;
}

function ensureEditableLine(){
  const p=document.createElement('p');
  p.appendChild(document.createElement('br'));
  doc.appendChild(p);
  const range=document.createRange();
  range.setStart(p,0);range.collapse(true);
  const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
  return p;
}

function unwrapListItem(li){
  const list=li.parentNode;
  const p=document.createElement('p');
  while(li.firstChild)p.appendChild(li.firstChild);
  if(!p.childNodes.length)p.appendChild(document.createElement('br'));
  list.parentNode.insertBefore(p,list);
  li.remove();
  if(!list.children.length)list.remove();
  setCursorInText(p,p.textContent.length);
  save();
}

function placeCursorInBlock(block){
  const range=document.createRange();
  range.setStart(block,0);
  range.collapse(true);
  const sel=window.getSelection();
  sel.removeAllRanges();sel.addRange(range);
}

function exitEmptyListItem(li){
  if(!li||li.nodeName!=='LI'||li.textContent.trim()!=='')return false;
  const list=li.parentNode;
  const p=document.createElement('p');
  p.appendChild(document.createElement('br'));
  const afterItems=[];
  let next=li.nextSibling;
  while(next){
    const current=next;
    next=next.nextSibling;
    afterItems.push(current);
  }
  li.remove();
  if(afterItems.length){
    const rest=document.createElement(list.nodeName.toLowerCase());
    afterItems.forEach(item=>rest.appendChild(item));
    list.parentNode.insertBefore(rest,list.nextSibling);
    list.parentNode.insertBefore(p,rest);
  }else{
    list.parentNode.insertBefore(p,list.nextSibling);
  }
  if(!list.children.length)list.remove();
  placeCursorInBlock(p);
  pushUndo();save();
  return true;
}

function handleEmptyListExit(e){
  const blk=getCursorBlock();
  if(blk&&blk.nodeName==='LI'&&blk.textContent.trim()===''){
    e.preventDefault();
    return exitEmptyListItem(blk);
  }
  return false;
}

function insertList(kind,opts){
  doc.focus();
  const tag=kind==='ol'?'ol':'ul';
  const sel=window.getSelection();
  if(!sel.rangeCount)return;
  let block=getCursorBlock();
  if(!block)block=ensureEditableLine();

  if(block.nodeName==='LI'){
    if(block.parentNode&&block.parentNode.nodeName.toLowerCase()===tag)unwrapListItem(block);
    else document.execCommand(tag==='ol'?'insertOrderedList':'insertUnorderedList');
    return;
  }

  const anchor=sel.anchorNode;
  const anchorOffset=sel.anchorOffset;
  const markerNode=opts&&opts.markerNode;
  const markerLength=opts&&opts.markerLength||0;
  let cursorOffset=0;
  if(markerNode&&block.contains(markerNode)){
    const start=textOffsetInElement(block,markerNode,0);
    const before=markerNode.textContent.slice(0,markerLength);
    const after=markerNode.textContent.slice(markerLength);
    markerNode.textContent=after;
    cursorOffset=start;
  }else if(block.contains(anchor)){
    cursorOffset=textOffsetInElement(block,anchor,anchorOffset);
  }

  const list=document.createElement(tag);
  const li=document.createElement('li');
  while(block.firstChild)li.appendChild(block.firstChild);
  if(!li.textContent.trim()&&!li.querySelector('img,table,pre,.tex,.tex-display'))li.innerHTML='<br>';
  list.appendChild(li);
  block.replaceWith(list);
  setCursorInText(li,cursorOffset);
  pushUndo();save();
}

function getCursorCode(){
  const s=window.getSelection();if(!s.rangeCount)return null;
  let n=s.anchorNode;
  if(!n)return null;
  if(n.nodeType===3)n=n.parentElement;
  return n&&n.closest?n.closest('pre code'):null;
}

function getTextOffsetInCode(code,node,offset){
  const range=document.createRange();
  range.selectNodeContents(code);
  range.setEnd(node,offset);
  return range.toString().length;
}

function getSelectionOffsetsInCode(code){
  const s=window.getSelection();if(!s.rangeCount)return null;
  if(!code.contains(s.anchorNode)||!code.contains(s.focusNode))return null;
  const a=getTextOffsetInCode(code,s.anchorNode,s.anchorOffset);
  const f=getTextOffsetInCode(code,s.focusNode,s.focusOffset);
  return {start:Math.min(a,f),end:Math.max(a,f),backward:a>f};
}

function getCodePointAtOffset(code,offset){
  const walker=document.createTreeWalker(code,NodeFilter.SHOW_TEXT,null);
  let pos=0,last=null;
  while(walker.nextNode()){
    const node=walker.currentNode;
    last=node;
    if(pos+node.length>=offset)return {node,offset:Math.max(0,offset-pos)};
    pos+=node.length;
  }
  if(last)return {node:last,offset:last.length};
  return {node:code,offset:0};
}

function selectRangeInCode(code,start,end,backward){
  code.focus();
  const sel=window.getSelection();
  const range=document.createRange();
  const a=getCodePointAtOffset(code,start);
  const b=getCodePointAtOffset(code,end);
  range.setStart(a.node,a.offset);
  range.setEnd(b.node,b.offset);
  sel.removeAllRanges();
  if(backward&&sel.extend){
    const endRange=document.createRange();
    endRange.setStart(b.node,b.offset);
    endRange.collapse(true);
    sel.addRange(endRange);
    sel.extend(a.node,a.offset);
  }else{
    sel.addRange(range);
  }
}

function handleMdEnter(e){
  // Code block: ``` or ```python — triggered by Enter
  const s=window.getSelection();if(s.rangeCount){
    const n=s.anchorNode;
    if(n&&n.nodeType===3){
      const t=n.textContent;const off=s.anchorOffset;
      const before=t.substring(0,off);
      const clm=before.match(/^```(\w+)$/);
      if(clm||/^```$/.test(before)){
        e.preventDefault();
        const block=getCursorBlock();
        const lang=clm?clm[1]:'plaintext';
        const pre=createCodeBlock(lang);
        const code=pre.querySelector('code');
        if(block){block.replaceWith(pre);}else{n.textContent='';doc.insertBefore(pre,null);}
        const p=document.createElement('p');p.appendChild(document.createElement('br'));
        pre.after(p);
        placeCursorInCode(code,0);
        pushUndo();save();return;
      }
    }
  }

  const blk=getCursorBlock();if(!blk)return;
  // Empty list item → exit list
  if(blk.nodeName==='LI'&&blk.textContent.trim()===''){
    e.preventDefault();
    exitEmptyListItem(blk);
    return;
  }
  // Continue todo
  if(blk.classList&&blk.classList.contains('todo-item')){
    e.preventDefault();
    // Empty todo → exit todo mode
    if(blk.textContent.trim()===''){
      const p=document.createElement('p');p.innerHTML='<br>';
      blk.after(p);blk.remove();
      const range=document.createRange();range.setStart(p,0);range.collapse(true);
      const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
      pushUndo();save();return;
    }
    const newItem=document.createElement('div');
    newItem.className='todo-item';
    newItem.innerHTML='<input type="checkbox"><span class="todo-text"><br></span>';
    blk.after(newItem);
    // Move cursor into new todo text
    const textSpan=newItem.querySelector('.todo-text');
    const range=document.createRange();
    range.setStart(textSpan,0);range.collapse(true);
    const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
    pushUndo();save();
  }
}

function handleTab(e){
  const code=getCursorCode();
  if(code){
    e.preventDefault();
    e.shiftKey?outdentCodeSelection(code):indentCodeSelection(code);
    showSt('saving');clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{save();showSt('saved')},FILE_WRITE_DELAY);
    return;
  }
  const blk=getCursorBlock();if(!blk)return;
  if(blk.nodeName==='LI'){e.preventDefault();e.shiftKey?document.execCommand('outdent'):document.execCommand('indent')}
}

function handleCodeEnter(e){
  const code=getCursorCode();
  if(!code)return false;
  const sel=getSelectionOffsetsInCode(code);
  if(!sel)return false;
  e.preventDefault();
  const text=code.textContent||'';
  const lineStart=text.lastIndexOf('\n',Math.max(0,sel.start-1))+1;
  const linePrefix=text.slice(lineStart,sel.start);
  const indent=(linePrefix.match(/^[\t ]*/)||[''])[0];
  const insert='\n'+indent;
  code.textContent=text.slice(0,sel.start)+insert+text.slice(sel.end);
  selectRangeInCode(code,sel.start+insert.length,sel.start+insert.length,false);
  showSt('saving');clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{save();showSt('saved')},FILE_WRITE_DELAY);
  return true;
}

function indentCodeSelection(code){
  const sel=getSelectionOffsetsInCode(code);if(!sel)return;
  const tab='    ';
  const text=code.textContent||'';
  if(sel.start===sel.end){
    const next=text.slice(0,sel.start)+tab+text.slice(sel.end);
    code.textContent=next;
    selectRangeInCode(code,sel.start+tab.length,sel.start+tab.length,false);
    return;
  }
  const lineStart=text.lastIndexOf('\n',Math.max(0,sel.start-1))+1;
  const lineEnd=sel.end>sel.start&&text[sel.end-1]==='\n'?sel.end-1:sel.end;
  const before=text.slice(0,lineStart);
  const target=text.slice(lineStart,lineEnd);
  const after=text.slice(lineEnd);
  const lineCount=target.split('\n').length;
  const next=before+target.replace(/^/gm,tab)+after;
  code.textContent=next;
  selectRangeInCode(code,sel.start+tab.length,sel.end+lineCount*tab.length,sel.backward);
}

function outdentCodeSelection(code){
  const sel=getSelectionOffsetsInCode(code);if(!sel)return;
  const text=code.textContent||'';
  const lineStart=text.lastIndexOf('\n',Math.max(0,sel.start-1))+1;
  const lineEnd=sel.end>sel.start&&text[sel.end-1]==='\n'?sel.end-1:sel.end;
  const before=text.slice(0,lineStart);
  const target=text.slice(lineStart,lineEnd);
  const after=text.slice(lineEnd);
  let removedBeforeStart=0,removedTotal=0,pos=lineStart;
  const nextTarget=target.split('\n').map(line=>{
    let rm=0;
    if(line.startsWith('\t'))rm=1;
    else if(line.startsWith('    '))rm=4;
    else if(line.startsWith('  '))rm=2;
    else if(line.startsWith(' '))rm=1;
    if(pos<sel.start)removedBeforeStart+=Math.min(rm,sel.start-pos);
    removedTotal+=rm;
    pos+=line.length+1;
    return line.slice(rm);
  }).join('\n');
  code.textContent=before+nextTarget+after;
  const nextStart=Math.max(lineStart,sel.start-removedBeforeStart);
  const nextEnd=Math.max(nextStart,sel.end-removedTotal);
  selectRangeInCode(code,nextStart,nextEnd,sel.backward);
}

// ===== Click handlers =====
function deleteCodeBlock(pre){
  if(!pre)return;
  let target=pre.nextElementSibling;
  if(!target||target.nodeName!=='P'){
    target=document.createElement('p');
    target.appendChild(document.createElement('br'));
    pre.parentNode.insertBefore(target,pre.nextSibling);
  }
  pre.remove();
  placeCursorInBlock(target);
  pushUndo();
  save();
}

doc.addEventListener('click',function(e){
  hideCtxBars();

  const del=e.target.closest&&e.target.closest('.code-delete');
  if(del&&doc.contains(del)){
    e.preventDefault();
    e.stopPropagation();
    deleteCodeBlock(del.closest('pre'));
    return;
  }

  const link=e.target.closest&&e.target.closest('a[href]');
  if(link&&doc.contains(link)){
    e.preventDefault();
    const href=normalizeLinkHref(link.getAttribute('href'));
    if(href)window.open(href,link.target||'_blank','noopener');
    return;
  }

  // Image
  if(e.target.tagName==='IMG'){
    e.target.classList.add('sel-img');selImg=e.target;
    showImgBar(e.target);return;
  }
  doc.querySelectorAll('img.sel-img').forEach(i=>i.classList.remove('sel-img'));selImg=null;

  // LaTeX click to edit
  if(e.target.classList.contains('tex')||e.target.classList.contains('tex-display')){editTex(e.target);return}

  // Todo toggle
  const cb=e.target.closest('.todo-item input[type="checkbox"]');
  if(cb){const item=cb.closest('.todo-item');if(cb.checked)item.classList.add('checked');else item.classList.remove('checked');save();return}

  // Image double-click → modal
  if(e.target.tagName==='IMG'&&e.detail===2){document.getElementById('imgModalSrc').src=e.target.src;document.getElementById('imgModal').classList.add('show');return}

  // Table cell → show toolbar
  const td=e.target.closest('td,th');
  if(td){showTblBar(td);return}

});
doc.addEventListener('change',function(e){
  if(!e.target.classList.contains('code-lang'))return;
  const pre=e.target.closest('pre');
  const code=pre&&pre.querySelector('code');
  if(!code)return;
  const lang=normalizeCodeLang(e.target.value);
  code.className='language-'+lang;
  syncCodeSelect(e.target,lang);
  if(document.activeElement!==code)rehighlightCode(code,false);
  save();
});
doc.addEventListener('focusout',function(e){
  const code=e.target&&e.target.closest&&e.target.closest('pre code');
  if(code&&doc.contains(code))setTimeout(()=>{
    if(document.activeElement!==code)rehighlightCode(code,false);
  },0);
});

// ===== Image toolbar =====
function showImgBar(img){
  const bar=document.getElementById('imgBar');const r=img.getBoundingClientRect();
  bar.style.top=Math.max(4,r.top-36)+'px';bar.style.left=Math.max(4,r.left)+'px';
  bar.classList.add('show');
}
function imgAlign(a){if(!selImg)return;selImg.classList.remove('align-left','align-center','align-right');selImg.classList.add('align-'+a);save()}
function imgSize(pct){if(!selImg)return;selImg.style.width=pct;selImg.style.maxWidth=pct;save()}
function imgDelete(){if(!selImg)return;selImg.remove();selImg=null;hideCtxBars();save()}

// ===== Table toolbar =====
function showTblBar(td){
  const bar=document.getElementById('tblBar');const r=td.getBoundingClientRect();
  bar.style.top=Math.max(4,r.top-36)+'px';bar.style.left=Math.max(4,r.left)+'px';
  bar.classList.add('show');
}
function getCursorTd(){const s=window.getSelection();if(!s.rangeCount)return null;let n=s.anchorNode;while(n&&n!==doc){if(n.tagName==='TD'||n.tagName==='TH')return n;n=n.parentNode}return null}
function tblAddRow(pos){
  const td=getCursorTd();if(!td)return;const tr=td.parentNode;const tbl=tr.parentNode;
  const newRow=document.createElement('tr');
  for(let i=0;i<tr.children.length;i++){const c=document.createElement(tr.children[i].tagName);c.innerHTML='<br>';newRow.appendChild(c)}
  if(pos==='before')tbl.insertBefore(newRow,tr);else tr.parentNode.insertBefore(newRow,tr.nextSibling);
  save();
}
function tblAddCol(pos){
  const td=getCursorTd();if(!td)return;const tbl=td.closest('table');
  if(!tbl)return;
  const idx=td.cellIndex;
  Array.from(tbl.rows).forEach(row=>{
    const cells=Array.from(row.cells);
    const ref=cells[Math.min(idx,cells.length-1)];
    const c=document.createElement(row.parentElement&&row.parentElement.tagName==='THEAD'?'th':'td');
    c.innerHTML='<br>';
    if(!ref)row.appendChild(c);
    else if(pos==='before')row.insertBefore(c,ref);
    else row.insertBefore(c,ref.nextSibling);
  });
  save();
}
function tblDelRow(){const td=getCursorTd();if(!td)return;const tr=td.parentNode;if(tr.parentNode.rows.length>1)tr.remove();save()}
function tblDelCol(){
  const td=getCursorTd();if(!td)return;const tbl=td.closest('table');
  if(!tbl)return;
  const idx=td.cellIndex;
  const rows=Array.from(tbl.rows);
  const maxCols=Math.max(...rows.map(row=>row.cells.length));
  if(maxCols<=1)return;
  rows.forEach(row=>{if(row.cells[idx])row.cells[idx].remove()});
  save();
}
function tblDelTable(){const td=getCursorTd();if(!td)return;const tbl=td.closest('table');if(tbl)tbl.remove();hideCtxBars();save()}

function hideCtxBars(){document.getElementById('imgBar').classList.remove('show');document.getElementById('tblBar').classList.remove('show')}

// ===== Editor Commands =====
function execCmd(c,v){restoreEditorSelection();document.execCommand(c,false,v||null);rememberEditorSelection();save()}
