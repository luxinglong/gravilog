const STORAGE_KEY='diary_doc',DATES_KEY='diary_edit_dates',STATS_KEY='diary_daily_stats',TODOS_KEY='diary_calendar_todos',META_KEY='diary_meta',HANDLE_NAME_KEY='diary_file_name',PENDING_SYNC_KEY='diary_pending_sync',LAST_SYNC_KEY='diary_last_synced_snapshot',CONFLICT_BACKUP_KEY='diary_conflict_backup';
const LOCAL_SAVE_DELAY=450;
const FILE_WRITE_DELAY=5000;
let calView='month',calYear=new Date().getFullYear(),calMonth=new Date().getMonth(),calWeekStart=getMon(new Date()),selectedDate=null,saveTimer=null,localSaveTimer=null;
let texDisplay=false,fileHandle=null,selImg=null,fileWritable=false,fileWritePromise=Promise.resolve(),fileWritePending=false,syncReady=false;
let latestFileSnapshot=null,fileRetryTimer=null,mountConflict=null,localSaveErrorShown=false;
let pendingCharDelta=0,pendingDateMark=false;
let editorSavedRange=null;
let activeTodoEdit=null,pendingTodoEditor=null;

const DARK_KEY='diary_dark';
const CAL_PIN_KEY='diary_calendar_pinned';
function initDark(){
  if(localStorage.getItem(DARK_KEY)==='1')document.body.classList.add('dark');
  updateDarkBtn();
}
function toggleDark(){
  document.body.classList.toggle('dark');
  localStorage.setItem(DARK_KEY,document.body.classList.contains('dark')?'1':'0');
  updateDarkBtn();
}
function updateDarkBtn(){
  const btn=document.getElementById('darkBtn');
  const dark=document.body.classList.contains('dark');
  btn.title=dark?'切换到日间模式':'切换到夜间模式';
  btn.setAttribute('aria-label',btn.title);
}
initDark();

function updateMiniDate(){
  const el=document.getElementById('miniDate');
  if(!el)return;
  const now=new Date();
  el.textContent=String(now.getMonth()+1).padStart(2,'0')+'.'+String(now.getDate()).padStart(2,'0');
}
function updateCalendarShell(){
  const trigger=document.getElementById('calTrigger'),pin=document.getElementById('calPin');
  const pinned=document.body.classList.contains('calendar-pinned');
  const open=document.body.classList.contains('calendar-open')||pinned;
  if(trigger){
    trigger.classList.toggle('active',open);
    trigger.title=open&&!pinned?'收起日历':'打开日历';
    trigger.setAttribute('aria-label',trigger.title);
  }
  if(pin){
    pin.title=pinned?'取消固定':'固定在右侧';
    pin.setAttribute('aria-label',pin.title);
  }
}
function toggleCalendar(e){
  if(e)e.stopPropagation();
  if(document.body.classList.contains('calendar-pinned'))return;
  document.body.classList.toggle('calendar-open');
  updateCalendarShell();
}
function toggleCalendarPin(e){
  if(e)e.stopPropagation();
  const pinned=!document.body.classList.contains('calendar-pinned');
  document.body.classList.toggle('calendar-pinned',pinned);
  document.body.classList.toggle('calendar-open',pinned);
  localStorage.setItem(CAL_PIN_KEY,pinned?'1':'0');
  updateCalendarShell();
  queueGravityUI();
}
function initCalendarShell(){
  updateMiniDate();
  if(localStorage.getItem(CAL_PIN_KEY)==='1'){
    document.body.classList.add('calendar-pinned','calendar-open');
  }
  const panel=document.getElementById('calendarPanel');
  if(panel)panel.addEventListener('click',e=>e.stopPropagation());
  document.addEventListener('click',()=>{
    if(document.body.classList.contains('calendar-pinned'))return;
    if(document.body.classList.contains('calendar-open')){
      document.body.classList.remove('calendar-open');
      updateCalendarShell();
    }
  });
  setInterval(updateMiniDate,60000);
  updateCalendarShell();
}
initCalendarShell();

const doc=document.getElementById('doc');
doc.innerHTML=localStorage.getItem(STORAGE_KEY)||'';
doc.setAttribute('contenteditable','false');
document.body.classList.add('mounting');
const docWrap=document.getElementById('docWrap');
const dateRail=document.createElement('div');
dateRail.className='date-rail';
dateRail.setAttribute('aria-hidden','true');
docWrap.appendChild(dateRail);
let lastWritingLen=0;
let gravityRaf=0,gravityMotion=0,gravityDir=1,gravityLast=0,gravityVelocity=0,gravityScrollRaf=0,gravityScrollLast=0;
const TYPOGRAPHY_STYLE_PROPS=['font','font-family','font-size','line-height'];
const INDENT_STYLE_PROPS=['margin-left','padding-left','text-indent'];
function normalizeEditorTypography(root=doc){
  if(!root)return false;
  const elements=[];
  if(root.nodeType===1)elements.push(root);
  elements.push(...root.querySelectorAll('*'));
  let changed=false;
  elements.forEach(el=>{
    if(el.closest&&el.closest('.katex'))return;
    if(el.hasAttribute('style')){
      const before=el.getAttribute('style')||'';
      TYPOGRAPHY_STYLE_PROPS.forEach(prop=>el.style.removeProperty(prop));
      if(!el.closest('ul,ol,pre,code'))INDENT_STYLE_PROPS.forEach(prop=>el.style.removeProperty(prop));
      const after=(el.getAttribute('style')||'').trim();
      if(after)el.setAttribute('style',after);
      else el.removeAttribute('style');
      if((el.getAttribute('style')||'')!==before)changed=true;
    }
    ['face','size'].forEach(attr=>{
      if(el.hasAttribute(attr)){el.removeAttribute(attr);changed=true}
    });
  });
  return changed;
}
function normalizeEditorHTML(html){
  const tpl=document.createElement('template');
  tpl.innerHTML=html||'';
  tpl.content.querySelectorAll('style,link,meta').forEach(el=>el.remove());
  normalizeEditorTypography(tpl.content);
  return tpl.innerHTML;
}
function plainTextFromHTML(html){
  const tpl=document.createElement('template');
  tpl.innerHTML=html||'';
  tpl.content.querySelectorAll('style,script,link,meta').forEach(el=>el.remove());
  return tpl.content.textContent||'';
}
function insertPlainEditorText(text){
  doc.focus();
  document.execCommand('insertText',false,text||'');
  normalizeEditorTypography(doc);
}
normalizeEditorTypography(doc);
function clamp01(n){return Math.max(0,Math.min(1,n))}
function setGravityVars(){
  const pulse=gravityMotion;
  docWrap.style.setProperty('--gravity-motion',gravityMotion.toFixed(3));
  docWrap.style.setProperty('--gravity-flow',(gravityDir*pulse).toFixed(3));
  docWrap.style.setProperty('--gravity-pulse',pulse.toFixed(3));
}
function validBlockDate(value){
  const s=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';
}
function editorDateBlocks(){
  return Array.from(doc.children).filter(el=>{
    if(!el||el.nodeType!==1)return false;
    if(el.matches('script,style'))return false;
    return (el.textContent||'').trim()||el.matches('img,pre,table,.todo-item,.folded-block');
  });
}
function dateBlockWeight(el){
  return Math.max(1,(el.innerText||el.textContent||'').replace(/\s+/g,'').length);
}
function fallbackBlockDate(index,blocks){
  if(typeof getDates!=='function')return typeof todayStr==='function'?todayStr():'';
  const dates=getDates().slice().sort();
  if(!dates.length)return typeof todayStr==='function'?todayStr():'';
  if(dates.length===1)return dates[0];
  const stats=typeof getStats==='function'?getStats():{};
  const statsTotal=dates.reduce((sum,date)=>sum+(stats[date]||0),0);
  if(statsTotal>0){
    const weights=blocks.map(dateBlockWeight);
    const total=weights.reduce((sum,n)=>sum+n,0)||1;
    const midpoint=(weights.slice(0,index).reduce((sum,n)=>sum+n,0)+weights[index]/2)/total*statsTotal;
    let cursor=0;
    for(let i=0;i<dates.length;i++){
      cursor+=stats[dates[i]]||0;
      if(midpoint<=cursor)return dates[i];
    }
  }
  return dates[Math.min(dates.length-1,Math.floor(index*dates.length/Math.max(1,blocks.length)))];
}
function blockDate(el,index,blocks){
  return validBlockDate(el.dataset.date)||validBlockDate(el.dataset.createdAt)||validBlockDate(el.dataset.updatedAt)||fallbackBlockDate(index,blocks);
}
function formatRailDate(date){
  const parts=date.split('-');
  return parts.length===3?parts[1]+'.'+parts[2]:date;
}
function renderDateRail(){
  if(!dateRail)return;
  dateRail.innerHTML='';
  const blocks=editorDateBlocks();
  if(!blocks.length)return;
  const wrapRect=docWrap.getBoundingClientRect();
  const docRect=doc.getBoundingClientRect();
  const left=Math.max(10,docRect.left-wrapRect.left-92);
  const seen=new Set();
  blocks.forEach((block,index)=>{
    const date=blockDate(block,index,blocks);
    if(!date||seen.has(date))return;
    seen.add(date);
    const rect=block.getBoundingClientRect();
    const top=rect.top-wrapRect.top;
    if(top<-54||top>wrapRect.height+32)return;
    const label=document.createElement('div');
    label.className='date-rail-label';
    label.style.left=left+'px';
    label.style.top=top+'px';
    label.title=date;
    label.textContent=formatRailDate(date);
    dateRail.appendChild(label);
  });
}
function markActiveBlockDate(){
  const sel=window.getSelection&&window.getSelection();
  if(!sel||!sel.rangeCount||!doc.contains(sel.anchorNode))return;
  let el=sel.anchorNode.nodeType===1?sel.anchorNode:sel.anchorNode.parentElement;
  while(el&&el.parentElement&&el.parentElement!==doc)el=el.parentElement;
  if(!el||el.parentElement!==doc||validBlockDate(el.dataset.date))return;
  if(typeof todayStr==='function')el.dataset.date=todayStr();
}
function updateGravityUI(){
  gravityRaf=0;
  const max=Math.max(1,doc.scrollHeight-doc.clientHeight);
  const depth=clamp01(doc.scrollTop/max);
  docWrap.style.setProperty('--gravity-depth',depth.toFixed(4));
  docWrap.style.setProperty('--gravity-depth-y',(depth*100).toFixed(2)+'%');
  setGravityVars();
  renderDateRail();
}
function queueGravityUI(){
  if(!gravityRaf)gravityRaf=requestAnimationFrame(updateGravityUI);
}
function decayGravityMotion(now){
  if(!gravityLast)gravityLast=now;
  const dt=Math.min(48,now-gravityLast);
  gravityLast=now;
  gravityMotion*=Math.pow(.82,dt/16);
  if(gravityMotion<.015)gravityMotion=0;
  setGravityVars();
  if(gravityMotion>0)requestAnimationFrame(decayGravityMotion);
  else gravityLast=0;
}
function runGravityScroll(now){
  if(!gravityScrollLast)gravityScrollLast=now;
  const dt=Math.min(48,now-gravityScrollLast);
  gravityScrollLast=now;
  doc.scrollTop+=gravityVelocity*dt/16;
  gravityVelocity*=Math.pow(.91,dt/16);
  if(Math.abs(gravityVelocity)>0.18){
    gravityScrollRaf=requestAnimationFrame(runGravityScroll);
  }else{
    gravityVelocity=0;
    gravityScrollRaf=0;
    gravityScrollLast=0;
  }
}
function handleEditorWheel(e){
  if(e.ctrlKey)return;
  e.preventDefault();
  const abs=Math.min(1200,Math.abs(e.deltaY));
  const sign=e.deltaY>=0?1:-1;
  const normalized=abs/120;
  const nonlinear=abs*.22+Math.pow(normalized,2.35)*115;
  const impulse=clamp01(nonlinear/620);
  if(impulse<=0)return;
  gravityDir=sign;
  gravityVelocity+=sign*nonlinear*.18;
  gravityVelocity=Math.max(-170,Math.min(170,gravityVelocity));
  gravityMotion=clamp01(gravityMotion+impulse*1.25);
  setGravityVars();
  if(!gravityLast)requestAnimationFrame(decayGravityMotion);
  if(!gravityScrollRaf)gravityScrollRaf=requestAnimationFrame(runGravityScroll);
}
docWrap.addEventListener('wheel',handleEditorWheel,{passive:false});
doc.addEventListener('scroll',queueGravityUI,{passive:true});
window.addEventListener('resize',queueGravityUI);
queueGravityUI();

// ===== Undo / Redo =====
const MAX_UNDO=80;
let undoStack=[],redoStack=[],undoPaused=false;
function undoEscapeHTML(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function ensureEditorBlockId(el){
  if(!el.dataset.blockId)el.dataset.blockId='blk_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  return el.dataset.blockId;
}
function captureSnapshot(){
  const blocks=Array.from(doc.childNodes).filter(node=>node.nodeType!==3||node.textContent.trim()).map((node,index)=>{
    if(node.nodeType===1)return {id:ensureEditorBlockId(node),html:node.outerHTML};
    return {id:'text_'+index,html:undoEscapeHTML(node.textContent||'')};
  });
  return {blocks,html:blocks.map(block=>block.html).join('')};
}
function snapshotHTML(snapshot){return typeof snapshot==='string'?snapshot:snapshot&&snapshot.html||''}
function pushUndo(){
  if(undoPaused)return;
  const snap=captureSnapshot();
  if(undoStack.length>0&&snapshotHTML(undoStack[undoStack.length-1])===snap.html)return;
  undoStack.push(snap);
  if(undoStack.length>MAX_UNDO)undoStack.shift();
  redoStack=[];
  updateUndoRedoBtns();
}
function doUndo(){
  if(undoStack.length<=1)return;
  undoPaused=true;
  redoStack.push(undoStack.pop());
  doc.innerHTML=snapshotHTML(undoStack[undoStack.length-1]);
  resetWritingBaseline();
  renderAllContent();
  undoPaused=false;
  save();updateUndoRedoBtns();
}
function doRedo(){
  if(!redoStack.length)return;
  undoPaused=true;
  const snap=redoStack.pop();
  undoStack.push(snap);
  doc.innerHTML=snapshotHTML(snap);
  resetWritingBaseline();
  renderAllContent();
  undoPaused=false;
  save();updateUndoRedoBtns();
}
function updateUndoRedoBtns(){
  document.getElementById('undoBtn').disabled=undoStack.length<=1;
  document.getElementById('redoBtn').disabled=redoStack.length===0;
}
// Capture initial state
pushUndo();
// Push snapshot on input and after save-triggering actions
doc.addEventListener('input',()=>{clearTimeout(undoTimer);undoTimer=setTimeout(pushUndo,400)});
let undoTimer=null;
// Keyboard shortcuts
doc.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){e.preventDefault();doUndo();return}
  if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){e.preventDefault();doRedo();return}
});
