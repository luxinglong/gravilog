// ===== Selection Presenter =====
const PRESENTER_ZOOM_MIN=1;
const PRESENTER_ZOOM_MAX=4;
const PRESENTER_ZOOM_STEP=.0018;
const PRESENTER_LENS_SIZE=300;
let presenterTool='laser';
let presenterZoom=1;
let presenterLensZoom=1;
let presenterLensPoint=null;
let presenterStrokes=[];
let activePresenterStroke=null;
document.addEventListener('selectionchange',()=>{rememberEditorSelection();updatePresentBtn()});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)closePresenter(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('presenter').classList.contains('show'))closePresenter()});
document.getElementById('presenter').addEventListener('pointermove',moveLaserPointer);
document.getElementById('presenter').addEventListener('pointerleave',hideLaserPointer);
document.getElementById('presenter').addEventListener('scroll',()=>{
  if(presenterTool==='lens'&&presenterLensZoom>1&&presenterLensPoint){
    presenterLensPoint=presenterPointFromClient(presenterLensPoint.clientX,presenterLensPoint.clientY);
    updatePresenterLens();
  }
});
document.getElementById('presenter').addEventListener('contextmenu',showPresenterMenu);
document.getElementById('presenter').addEventListener('wheel',handlePresenterWheel,{passive:false});
document.getElementById('presenterDraw').addEventListener('pointerdown',startPresenterDraw);
document.getElementById('presenterDraw').addEventListener('pointermove',movePresenterDraw);
document.getElementById('presenterDraw').addEventListener('pointerup',endPresenterDraw);
document.getElementById('presenterDraw').addEventListener('pointercancel',endPresenterDraw);
document.addEventListener('click',e=>{if(!e.target.closest||!e.target.closest('#presenterMenu'))hidePresenterMenu()});
window.addEventListener('resize',()=>{if(document.getElementById('presenter').classList.contains('show')){resizePresenterCanvas();syncPresenterLens()}});
document.addEventListener('mousedown',e=>{
  if(e.target.closest&&e.target.closest('.fbar,.td-dlg,.tex-input,.color-picker'))rememberEditorSelection();
},true);
document.addEventListener('pointerdown',e=>{
  if(e.target.closest&&e.target.closest('.fbar button,.td-dlg button,.color-picker .color-dot,.color-picker .color-remove')){
    e.preventDefault();
  }
},true);
function rememberEditorSelection(){
  const sel=window.getSelection();
  if(!sel||!sel.rangeCount)return;
  const range=sel.getRangeAt(0);
  const node=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentNode;
  if(node&&doc.contains(node))editorSavedRange=range.cloneRange();
}
function restoreEditorSelection(){
  if(editorSavedRange){
    const sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(editorSavedRange.cloneRange());
  }
  doc.focus();
}
function getDocSelectionRange(){
  const sel=window.getSelection();
  if(!sel||!sel.rangeCount||sel.isCollapsed)return null;
  const range=sel.getRangeAt(0);
  const start=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentNode;
  const end=range.endContainer.nodeType===1?range.endContainer:range.endContainer.parentNode;
  if(!doc.contains(start)||!doc.contains(end))return null;
  return range;
}
function rangeElement(node){
  return node&&node.nodeType===1?node:node&&node.parentElement;
}
function selectedSingleCodeBlock(range){
  const start=rangeElement(range.startContainer);
  const end=rangeElement(range.endContainer);
  const startPre=start&&start.closest&&start.closest('pre');
  const endPre=end&&end.closest&&end.closest('pre');
  return startPre&&startPre===endPre&&doc.contains(startPre)?startPre:null;
}
function updatePresentBtn(){
  const btn=document.getElementById('presentBtn');
  if(btn)btn.disabled=!getDocSelectionRange();
}
function presentSelection(){
  const range=getDocSelectionRange();
  if(!range){alert('请先选中文档里要展示的内容');return}
  const presenter=document.getElementById('presenter');
  const content=document.getElementById('presenterContent');
  const selectedPre=selectedSingleCodeBlock(range);
  const frag=document.createDocumentFragment();
  frag.appendChild(selectedPre?selectedPre.cloneNode(true):range.cloneContents());
  content.innerHTML='';
  if(!frag.textContent.trim()&&!frag.querySelector('img,table,pre,.tex,.tex-display')){
    content.innerHTML='<div class="presenter-empty">选区没有可展示的内容</div>';
  }else{
    content.appendChild(frag);
    cleanPresenterContent(content);
    renderPresenterContent(content);
  }
  closeColorPickers();hideCtxBars();
  presenter.classList.add('show');
  resetPresenterZoom();
  clearPresenterInk();
  resizePresenterCanvas();
  syncPresenterLens();
  setPresenterTool('laser');
  if(presenter.requestFullscreen)presenter.requestFullscreen().catch(()=>{});
}
function setPresenterTool(tool){
  const presenter=document.getElementById('presenter');
  presenterTool=tool==='draw'||tool==='lens'?tool:'laser';
  if(presenter){
    presenter.classList.toggle('mode-draw',presenterTool==='draw');
    presenter.classList.toggle('mode-laser',presenterTool==='laser');
  }
  if(presenterTool!=='laser')hideLaserPointer();
  if(presenterTool!=='lens')hidePresenterLens();
  document.querySelectorAll('#presenterMenu button').forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===presenterTool));
  hidePresenterMenu();
}
function showPresenterMenu(e){
  const presenter=document.getElementById('presenter');
  if(!presenter.classList.contains('show'))return;
  e.preventDefault();
  e.stopPropagation();
  const menu=document.getElementById('presenterMenu');
  if(!menu)return;
  document.querySelectorAll('#presenterMenu button').forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===presenterTool));
  menu.classList.add('show');
  const w=menu.offsetWidth||142,h=menu.offsetHeight||70;
  menu.style.left=Math.min(e.clientX,window.innerWidth-w-8)+'px';
  menu.style.top=Math.min(e.clientY,window.innerHeight-h-8)+'px';
}
function hidePresenterMenu(){
  const menu=document.getElementById('presenterMenu');
  if(menu)menu.classList.remove('show');
}
function resetPresenterZoom(){
  presenterZoom=1;
  presenterLensZoom=1;
  presenterLensPoint=null;
  const presenter=document.getElementById('presenter');
  if(presenter){
    presenter.style.setProperty('--presenter-zoom','1');
    presenter.style.setProperty('--presenter-zoom-x','50%');
    presenter.style.setProperty('--presenter-zoom-y','50%');
  }
  hidePresenterLens();
}
function handlePresenterWheel(e){
  const presenter=document.getElementById('presenter');
  if(!presenter.classList.contains('show')||!e.ctrlKey)return;
  e.preventDefault();
  e.stopPropagation();
  hidePresenterMenu();
  const point=presenterLocalPoint(e);
  if(presenterTool==='lens'){
    presenterLensPoint=point;
    const next=Math.max(PRESENTER_ZOOM_MIN,Math.min(PRESENTER_ZOOM_MAX,+(presenterLensZoom-e.deltaY*PRESENTER_ZOOM_STEP).toFixed(3)));
    if(next===presenterLensZoom)return;
    presenterLensZoom=next;
    updatePresenterLens();
    return;
  }
  hidePresenterLens();
  const next=Math.max(PRESENTER_ZOOM_MIN,Math.min(PRESENTER_ZOOM_MAX,+(presenterZoom-e.deltaY*PRESENTER_ZOOM_STEP).toFixed(3)));
  if(next===presenterZoom)return;
  presenter.style.setProperty('--presenter-zoom-x',Math.max(0,point.x).toFixed(1)+'px');
  presenter.style.setProperty('--presenter-zoom-y',Math.max(0,point.y).toFixed(1)+'px');
  presenterZoom=next;
  presenter.style.setProperty('--presenter-zoom',String(presenterZoom));
}
function moveLaserPointer(e){
  if(presenterTool==='lens'&&presenterLensZoom>1){
    presenterLensPoint=presenterLocalPoint(e);
    updatePresenterLens();
  }
  if(presenterTool!=='laser')return;
  const laser=document.getElementById('laserPointer');
  if(!laser)return;
  laser.style.left=e.clientX+'px';
  laser.style.top=e.clientY+'px';
  laser.classList.add('on');
}
function hideLaserPointer(){
  const laser=document.getElementById('laserPointer');
  if(laser)laser.classList.remove('on');
}
function resizePresenterCanvas(){
  const canvas=document.getElementById('presenterDraw');
  if(!canvas)return;
  const stage=document.getElementById('presenterStage');
  const dpr=window.devicePixelRatio||1;
  const w=stage?stage.offsetWidth:window.innerWidth;
  const h=stage?stage.offsetHeight:window.innerHeight;
  canvas.width=Math.max(1,Math.round(w*dpr));
  canvas.height=Math.max(1,Math.round(h*dpr));
  redrawPresenterInk();
}
function syncPresenterLens(){
  const stage=document.getElementById('presenterStage');
  const content=document.getElementById('presenterContent');
  const inner=document.getElementById('presenterLensInner');
  if(!stage||!content||!inner)return;
  const dpr=window.devicePixelRatio||1;
  const w=stage.offsetWidth;
  const h=stage.offsetHeight;
  inner.innerHTML='';
  inner.style.width=w+'px';
  inner.style.height=h+'px';
  const lensStage=document.createElement('div');
  lensStage.className='presenter-lens-stage';
  lensStage.style.width=w+'px';
  lensStage.style.height=h+'px';
  const lensCanvas=document.createElement('canvas');
  lensCanvas.className='presenter-lens-draw';
  lensCanvas.id='presenterLensDraw';
  lensCanvas.width=Math.max(1,Math.round(w*dpr));
  lensCanvas.height=Math.max(1,Math.round(h*dpr));
  const clone=content.cloneNode(true);
  clone.removeAttribute('id');
  lensStage.append(lensCanvas,clone);
  inner.appendChild(lensStage);
  redrawPresenterInk();
  updatePresenterLens();
}
function updatePresenterLens(){
  const lens=document.getElementById('presenterLens');
  const inner=document.getElementById('presenterLensInner');
  if(!lens||!inner)return;
  if(presenterTool!=='lens'||presenterLensZoom<=1||!presenterLensPoint){
    hidePresenterLens();
    return;
  }
  const size=PRESENTER_LENS_SIZE;
  const half=size/2;
  const x=presenterLensPoint.x;
  const y=presenterLensPoint.y;
  const clientX=presenterLensPoint.clientX;
  const clientY=presenterLensPoint.clientY;
  const zoom=presenterZoom*presenterLensZoom;
  lens.style.setProperty('--lens-size',size+'px');
  lens.style.transform='translate3d('+(clientX-half)+'px,'+(clientY-half)+'px,0)';
  inner.style.transform='translate3d('+(half-x*zoom)+'px,'+(half-y*zoom)+'px,0) scale('+zoom+')';
  lens.classList.add('show');
}
function hidePresenterLens(){
  const lens=document.getElementById('presenterLens');
  if(lens)lens.classList.remove('show');
}
function clearPresenterInk(){
  presenterStrokes=[];
  activePresenterStroke=null;
  redrawPresenterInk();
}
function redrawPresenterInk(){
  const canvases=[document.getElementById('presenterDraw'),document.getElementById('presenterLensDraw')].filter(Boolean);
  if(!canvases.length)return;
  canvases.forEach(canvas=>{
    const ctx=canvas.getContext('2d');
    const dpr=window.devicePixelRatio||1;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,canvas.width/dpr,canvas.height/dpr);
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.strokeStyle='#ff2d55';
    ctx.lineWidth=4;
    presenterStrokes.forEach(stroke=>{
      if(stroke.length<2){
        ctx.beginPath();
        ctx.arc(stroke[0].x,stroke[0].y,2,0,Math.PI*2);
        ctx.fillStyle=ctx.strokeStyle;
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(stroke[0].x,stroke[0].y);
      for(let i=1;i<stroke.length;i++)ctx.lineTo(stroke[i].x,stroke[i].y);
      ctx.stroke();
    });
  });
}
function presenterLocalPoint(e){
  return presenterPointFromClient(e.clientX,e.clientY);
}
function presenterPointFromClient(clientX,clientY){
  const stage=document.getElementById('presenterStage');
  if(!stage)return {x:clientX,y:clientY,clientX,clientY};
  const rect=stage.getBoundingClientRect();
  const scale=presenterZoom||1;
  return {
    x:(clientX-rect.left)/scale,
    y:(clientY-rect.top)/scale,
    clientX,
    clientY
  };
}
function startPresenterDraw(e){
  if(presenterTool!=='draw'||e.button!==0)return;
  e.preventDefault();
  hidePresenterMenu();
  activePresenterStroke=[presenterLocalPoint(e)];
  presenterStrokes.push(activePresenterStroke);
  e.currentTarget.setPointerCapture(e.pointerId);
}
function movePresenterDraw(e){
  if(!activePresenterStroke)return;
  e.preventDefault();
  activePresenterStroke.push(presenterLocalPoint(e));
  redrawPresenterInk();
}
function endPresenterDraw(e){
  if(!activePresenterStroke)return;
  if(e.currentTarget.hasPointerCapture&&e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  activePresenterStroke=null;
}
function cleanPresenterContent(root){
  root.querySelectorAll('.code-lang,.code-dots,.code-highlight-layer').forEach(el=>el.remove());
  root.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));
  root.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  root.querySelectorAll('*').forEach(el=>{
    Array.from(el.attributes).forEach(attr=>{if(/^on/i.test(attr.name))el.removeAttribute(attr.name)});
  });
  root.querySelectorAll('input[type="checkbox"]').forEach(el=>el.disabled=true);
  root.querySelectorAll('textarea,select,button,input:not([type="checkbox"])').forEach(el=>el.remove());
}
function renderPresenterContent(root){
  root.querySelectorAll('.tex,.tex-display').forEach(el=>{
    const s=el.getAttribute('data-tex');
    if(s&&typeof katex!=='undefined'){try{katex.render(s,el,{throwOnError:false,displayMode:el.classList.contains('tex-display')})}catch(e){}}
  });
  root.querySelectorAll('pre code:not(.code-highlight-layer)').forEach(code=>{
    const text=code.textContent||'';
    if(typeof highlightedCodeHTML==='function'){
      code.innerHTML=highlightedCodeHTML(code,text);
      code.classList.add('hljs');
      code.setAttribute('data-highlighted','yes');
      return;
    }
    if(typeof hljs!=='undefined'){code.removeAttribute('data-highlighted');try{hljs.highlightElement(code)}catch(e){}}
  });
}
function closePresenter(exitFs=true){
  const presenter=document.getElementById('presenter');
  const content=document.getElementById('presenterContent');
  if(!presenter)return;
  hideLaserPointer();
  hidePresenterMenu();
  clearPresenterInk();
  resetPresenterZoom();
  presenter.classList.remove('show');
  presenter.classList.remove('mode-draw','mode-laser');
  if(content)content.innerHTML='';
  if(exitFs&&document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});
}
