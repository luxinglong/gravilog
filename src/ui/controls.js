// ===== Watercolor Highlight =====
const hlColors=[
  {name:'Yellow',bg:'rgba(255,235,59,0.35)',mark:'#ffeb3b'},
  {name:'Green',bg:'rgba(76,175,80,0.3)',mark:'#4caf50'},
  {name:'Blue',bg:'rgba(33,150,243,0.3)',mark:'#2196f3'},
  {name:'Pink',bg:'rgba(233,30,99,0.25)',mark:'#e91e63'},
  {name:'Orange',bg:'rgba(255,152,0,0.3)',mark:'#ff9800'},
  {name:'Purple',bg:'rgba(156,39,176,0.25)',mark:'#9c27b0'},
  {name:'Cyan',bg:'rgba(0,188,212,0.3)',mark:'#00bcd4'}
];
const textColors=[
  {name:'Black',color:'#111111'},
  {name:'Gray',color:'#6b7280'},
  {name:'Red',color:'#dc2626'},
  {name:'Orange',color:'#ea580c'},
  {name:'Green',color:'#16a34a'},
  {name:'Blue',color:'#2563eb'},
  {name:'Purple',color:'#7c3aed'}
];
let hlPickerVisible=false,textColorPickerVisible=false,hlSavedRange=null,textColorSavedRange=null,selectedHlIndex=0,selectedTextColorIndex=0;
(function initHlPicker(){
  const box=document.getElementById('hlColors');
  hlColors.forEach((c,i)=>{
    const d=document.createElement('div');d.className='color-dot';d.style.background=c.bg;d.title=c.name;
    if(i===selectedHlIndex)d.classList.add('active');
    d.addEventListener('click',()=>applyHlColor(i));box.appendChild(d);
  });
  const rm=document.createElement('div');rm.className='color-remove';rm.title='清除';rm.innerHTML='&#10005;';
  rm.addEventListener('click',()=>removeHighlight());box.appendChild(rm);
  const textBox=document.getElementById('textColors');
  textColors.forEach((c,i)=>{
    const d=document.createElement('div');d.className='color-dot';d.style.background=c.color;d.title=c.name;
    if(i===selectedTextColorIndex)d.classList.add('active');
    d.addEventListener('click',()=>applyTextColorValue(i));textBox.appendChild(d);
  });
})();
function saveSelectionFor(kind){
  const sel=window.getSelection();
  const range=sel&&sel.rangeCount>0?sel.getRangeAt(0).cloneRange():null;
  if(kind==='hl')hlSavedRange=range;
  else textColorSavedRange=range;
}
function restoreSelection(range){
  if(!range)return;
  const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
}
function closeColorPickers(){
  document.getElementById('hlPicker').classList.remove('show');
  document.getElementById('textColorPicker').classList.remove('show');
  hlPickerVisible=false;textColorPickerVisible=false;
}
function positionPicker(picker,anchor){
  const p=document.getElementById(picker),btn=document.getElementById(anchor),r=btn.getBoundingClientRect();
  p.style.top=(r.bottom+6)+'px';p.style.left=(r.left+r.width/2-70)+'px';
}
function updateColorDots(boxId,index){
  document.querySelectorAll('#'+boxId+' .color-dot').forEach((d,i)=>d.classList.toggle('active',i===index));
}
function applyHighlight(){
  saveSelectionFor('hl');
  applyHlColor(selectedHlIndex);
}
function toggleHlPicker(){
  const p=document.getElementById('hlPicker');
  if(hlPickerVisible){closeColorPickers();return}
  saveSelectionFor('hl');
  closeColorPickers();
  positionPicker('hlPicker','hlMenuBtn');
  p.classList.add('show');hlPickerVisible=true;
}
function applyHlColor(i){
  const c=hlColors[i];
  selectedHlIndex=i;
  document.getElementById('hlBtn').style.setProperty('--mark-color',c.mark);
  updateColorDots('hlColors',i);
  restoreSelection(hlSavedRange);
  doc.focus();
  document.execCommand('hiliteColor',false,c.bg);
  doc.querySelectorAll('span[style*="background-color"]').forEach(s=>{
    if(!s.classList.contains('hl'))s.classList.add('hl');
  });
  closeColorPickers();hlSavedRange=null;
  pushUndo();save();
}
function removeHighlight(){
  restoreSelection(hlSavedRange);
  const sel=window.getSelection();
  if(!sel||sel.isCollapsed){
    const node=sel.anchorNode;
    const span=node&&node.parentElement&&node.parentElement.closest('span.hl');
    if(span){
      const parent=span.parentNode;
      while(span.firstChild)parent.insertBefore(span.firstChild,span);
      parent.removeChild(span);
    }
  }else{
    document.execCommand('hiliteColor',false,'transparent');
  }
  closeColorPickers();hlSavedRange=null;
  pushUndo();save();
}
function applyTextColor(){
  saveSelectionFor('text');
  applyTextColorValue(selectedTextColorIndex);
}
function toggleTextColorPicker(){
  const p=document.getElementById('textColorPicker');
  if(textColorPickerVisible){closeColorPickers();return}
  saveSelectionFor('text');
  closeColorPickers();
  positionPicker('textColorPicker','textColorMenuBtn');
  p.classList.add('show');textColorPickerVisible=true;
}
function applyTextColorValue(i){
  const c=textColors[i];
  selectedTextColorIndex=i;
  document.getElementById('textColorBtn').style.setProperty('--mark-color',c.color);
  updateColorDots('textColors',i);
  restoreSelection(textColorSavedRange);
  doc.focus();
  document.execCommand('foreColor',false,c.color);
  closeColorPickers();textColorSavedRange=null;
  pushUndo();save();
}
document.addEventListener('mousedown',e=>{
  if((hlPickerVisible||textColorPickerVisible)&&!e.target.closest('.color-picker')&&!e.target.closest('#hlMenuBtn')&&!e.target.closest('#textColorMenuBtn')){
    closeColorPickers();
  }
});
function showTableDlg(){rememberEditorSelection();document.getElementById('tdDlg').classList.add('show')}
function hideTableDlg(){document.getElementById('tdDlg').classList.remove('show')}
function insertTable(){
  const r=parseInt(document.getElementById('tRows').value)||3,c=parseInt(document.getElementById('tCols').value)||3;
  let h='<table><thead><tr>';for(let i=0;i<c;i++)h+='<th>标题'+(i+1)+'</th>';h+='</tr></thead><tbody>';
  for(let i=0;i<r-1;i++){h+='<tr>';for(let j=0;j<c;j++)h+='<td><br></td>';h+='</tr>'}
  h+='</tbody></table><p><br></p>';restoreEditorSelection();document.execCommand('insertHTML',false,h);hideTableDlg();pushUndo();rememberEditorSelection();save();
}
function pickImg(){rememberEditorSelection();document.getElementById('imgPicker').click()}
function insertTodo(){restoreEditorSelection();document.execCommand('insertHTML',false,'<div class="todo-item"><input type="checkbox"><span class="todo-text">待办事项</span></div>');pushUndo();rememberEditorSelection();save()}
function insertCodeBlock(){
  restoreEditorSelection();
  const pre=createCodeBlock('plaintext');
  const code=pre.querySelector('code');
  const sel=window.getSelection();
  if(sel.rangeCount&&doc.contains(sel.anchorNode)){
    const range=sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(pre);
  }else{
    doc.appendChild(pre);
  }
  const p=document.createElement('p');
  p.appendChild(document.createElement('br'));
  pre.parentNode.insertBefore(p,pre.nextSibling);
  placeCursorInCode(code,0);
  rememberEditorSelection();
  pushUndo();save();
}

function fileToEditorImage(f){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onerror=()=>reject(r.error);
    r.onload=ev=>{
      const data=ev.target.result;
      if(!/^data:image\//.test(data)||/^data:image\/gif/i.test(data)||data.length<900000){resolve(data);return}
      const img=new Image();
      img.onload=()=>{
        const max=1600,scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.width*scale));
        canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg',0.86));
      };
      img.onerror=()=>resolve(data);
      img.src=data;
    };
    r.readAsDataURL(f);
  });
}
async function insertImageFile(f){
  if(!f)return;
  try{
    const src=await fileToEditorImage(f);
    restoreEditorSelection();
    document.execCommand('insertHTML',false,'<img src="'+src+'">');
    pushUndo();rememberEditorSelection();save();
  }catch(e){
    console.error('插入图片失败',e);
    alert('图片插入失败，请重试或换一张较小的图片。');
  }
}
function handleImg(e){const f=e.target.files[0];if(!f)return;insertImageFile(f);e.target.value=''}
doc.addEventListener('beforeinput',function(e){
  if(e.inputType!=='insertFromPaste'||!e.dataTransfer)return;
  const target=e.target;
  const inCode=target.closest&&target.closest('pre code');
  const text=e.dataTransfer.getData('text/plain')||plainTextFromHTML(e.dataTransfer.getData('text/html')||'');
  if(!text)return;
  e.preventDefault();
  if(inCode){
    document.execCommand('insertText',false,text);
  }else{
    insertPlainEditorText(text);
  }
  pushUndo();save();
});
doc.addEventListener('paste',function(e){
  const items=e.clipboardData.items;
  for(let i=0;i<items.length;i++){
    if(items[i].type.indexOf('image')!==-1){
      e.preventDefault();insertImageFile(items[i].getAsFile());return;
    }
  }
  const inCode=e.target.closest&&e.target.closest('pre code');
  if(inCode){
    e.preventDefault();
    document.execCommand('insertText',false,e.clipboardData.getData('text/plain')||'');
    return;
  }
  const html=e.clipboardData.getData('text/html')||'';
  const text=e.clipboardData.getData('text/plain')||plainTextFromHTML(html);
  if(text){
    e.preventDefault();
    insertPlainEditorText(text);
    pushUndo();save();
    return;
  }
  // Paste text into code block → highlight handled by input event listener
  const td=e.target.closest&&e.target.closest('td,th');
  if(!td&&!e.target.closest('pre code'))setTimeout(()=>{doc.querySelectorAll('pre').forEach(pre=>{ensureCodeBlock(pre);const code=pre.querySelector('code');if(document.activeElement!==code)rehighlightCode(code,false)})},100);
});

// ===== LaTeX Popup =====
function showTexInput(display){
  texDisplay=display;const inp=document.getElementById('texInput'),area=document.getElementById('texArea');
  area.value='';document.getElementById('texPreview').innerHTML='';
  const rect=doc.getBoundingClientRect();inp.style.top=Math.min(rect.top+60,window.innerHeight-220)+'px';inp.style.left=Math.max(20,rect.left+rect.width/2-180)+'px';
  inp.classList.add('show');area.focus();
}
function hideTexInput(){document.getElementById('texInput').classList.remove('show');document.getElementById('texArea').value='';document.getElementById('texPreview').innerHTML=''}
document.getElementById('texArea').addEventListener('input',function(){
  if(typeof katex==='undefined')return;const pv=document.getElementById('texPreview');
  try{katex.render(this.value,pv,{throwOnError:false,displayMode:texDisplay})}catch(e){pv.textContent=this.value}
});
function confirmTex(){
  const src=document.getElementById('texArea').value.trim();if(!src)return;
  const cls=texDisplay?'tex-display':'tex';
  const html='<span class="'+cls+'" data-tex="'+escAttr(src)+'" contenteditable="false"></span>​';
  doc.focus();document.execCommand('insertHTML',false,html);
  // Render
  const els=doc.querySelectorAll('.'+cls+'[data-tex="'+escAttr(src)+'"]');
  const el=els[els.length-1];
  if(el&&typeof katex!=='undefined'){try{katex.render(src,el,{throwOnError:false,displayMode:texDisplay})}catch(e){}}
  pushUndo();hideTexInput();
}
function editTex(el){
  const src=el.getAttribute('data-tex');if(!src)return;
  texDisplay=el.classList.contains('tex-display');const inp=document.getElementById('texInput'),area=document.getElementById('texArea');
  area.value=src;
  if(typeof katex!=='undefined'){try{katex.render(src,document.getElementById('texPreview'),{throwOnError:false,displayMode:texDisplay})}catch(e){}}
  const r=el.getBoundingClientRect();inp.style.top=Math.min(r.bottom+8,window.innerHeight-220)+'px';inp.style.left=Math.max(20,r.left)+'px';
  inp.classList.add('show');area.focus();
  const orig=confirmTex;
  confirmTex=function(){
    const ns=area.value.trim();if(!ns){hideTexInput();confirmTex=orig;return}
    el.setAttribute('data-tex',ns);
    if(typeof katex!=='undefined'){try{katex.render(ns,el,{throwOnError:false,displayMode:texDisplay})}catch(e){}}
    hideTexInput();confirmTex=orig;save();
  };
}
function escAttr(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function escHTML(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
