// ===== File Storage =====
const hasFSAP='showOpenFilePicker' in window;
function setMountBusy(busy){
  const primary=document.getElementById('mountPrimary'),choose=document.getElementById('mountChoose');
  if(primary)primary.disabled=busy;
  if(choose)choose.disabled=busy;
  document.querySelectorAll('#mountConflict button,#mergeView button').forEach(btn=>btn.disabled=busy);
}
function setConflictActions(show){
  const el=document.getElementById('mountConflict');
  if(el)el.classList.toggle('show',!!show);
  const panel=document.getElementById('mountPanel');
  if(panel)panel.classList.toggle('merge-mode',!!show);
  const merge=document.getElementById('mergeView');
  if(merge)merge.classList.toggle('show',!!show);
}
function setMountMsg(msg,isErr){
  const el=document.getElementById('mountMsg');
  if(!el)return;
  el.textContent=msg||'';
  el.classList.toggle('err',!!isErr);
}
function setMountFileText(text){
  const el=document.getElementById('mountFile');
  if(el)el.textContent=text;
}
function ensureCalendarRestoreButton(){
  const buttons=document.querySelector('.stor-btns');
  if(!buttons||buttons.querySelector('[data-action="restore-calendar-from-cloud"]'))return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.dataset.action='restore-calendar-from-cloud';
  btn.textContent='Restore Cal';
  btn.title='Restore calendar todos from the linked cloud file';
  buttons.insertBefore(btn,buttons.children[1]||null);
}
function prepareMountGate(hasLast){
  const primary=document.getElementById('mountPrimary'),choose=document.getElementById('mountChoose');
  if(primary)primary.textContent=hasLast?'加载上次同步文件':'选择同步文件';
  if(choose)choose.style.display='none';
  setConflictActions(false);
}
ensureCalendarRestoreButton();
function unlockEditor(){
  syncReady=true;
  mountConflict=null;
  setConflictActions(false);
  document.getElementById('mountGate').classList.add('hide');
  document.body.classList.remove('mounting');
  doc.setAttribute('contenteditable','true');
  updateStorStatus(fileWritable);
  if(latestFileSnapshot)queueFileWrite();
  doc.focus();
}
function rememberConflictBackup(local,remote){
  try{
    const payload=JSON.stringify({local,remote,createdAt:new Date().toISOString()});
    if(payload.length<500000)localStorage.setItem(CONFLICT_BACKUP_KEY,payload);
    else localStorage.removeItem(CONFLICT_BACKUP_KEY);
  }catch(e){}
}
function showMountConflict(local,remote){
  mountConflict={local,remote};
  rememberConflictBackup(local,remote);
  syncReady=false;
  doc.setAttribute('contenteditable','false');
  document.getElementById('mountGate').classList.remove('hide');
  document.body.classList.add('mounting');
  setConflictActions(true);
  renderMergeConflict(local,remote);
  setMountFileText('检测到本地未同步内容和云盘文件都发生过变化');
  setMountMsg('为避免多设备内容互相覆盖，已暂停自动同步。你可以在中间编辑合并版本，确认后写回云盘。',true);
}
function htmlBlocks(html){
  const tpl=document.createElement('template');
  tpl.innerHTML=html||'';
  tpl.content.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));
  tpl.content.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);
  const nodes=Array.from(tpl.content.childNodes).filter(n=>n.nodeType!==3||n.textContent.trim());
  if(!nodes.length)return [];
  return nodes.map(node=>{
    const wrap=document.createElement('div');
    wrap.appendChild(node.cloneNode(true));
    return {html:wrap.innerHTML,text:(wrap.textContent||'').replace(/\s+/g,' ').trim()};
  });
}
function matchedBlockIndexes(base,other){
  const m=base.length,n=other.length,dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=m-1;i>=0;i--)for(let j=n-1;j>=0;j--)dp[i][j]=base[i].text&&base[i].text===other[j].text?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  const matched=new Set();
  let i=0,j=0;
  while(i<m&&j<n){
    if(base[i].text&&base[i].text===other[j].text){matched.add(i);i++;j++}
    else if(dp[i+1][j]>=dp[i][j+1])i++;
    else j++;
  }
  return matched;
}
function diffPaneHTML(baseHtml,otherHtml,side){
  const base=htmlBlocks(baseHtml),other=htmlBlocks(otherHtml),matched=matchedBlockIndexes(base,other);
  if(!base.length)return '<div class="merge-line diff-'+(side==='local'?'del':'add')+'">空</div>';
  return base.map((block,i)=>{
    const cls=matched.has(i)?'same':(side==='local'?'diff-del':'diff-add');
    return '<div class="merge-line '+cls+'">'+block.html+'</div>';
  }).join('');
}
function mergeDates(a,b){return Array.from(new Set([...(a&&a.dates||[]),...(b&&b.dates||[])])).sort()}
function mergeStats(a,b){
  const out={},as=normalizeStats(a&&a.stats),bs=normalizeStats(b&&b.stats);
  Array.from(new Set([...Object.keys(as),...Object.keys(bs)])).forEach(k=>out[k]=Math.max(as[k]||0,bs[k]||0));
  return out;
}
function mergeTodos(a,b){
  const out={},as=normalizeTodos(a&&a.todos),bs=normalizeTodos(b&&b.todos);
  Array.from(new Set([...Object.keys(as),...Object.keys(bs)])).forEach(date=>{
    const byId=new Map();
    [...(as[date]||[]),...(bs[date]||[])].forEach(item=>byId.set(item.id,item));
    out[date]=Array.from(byId.values());
  });
  return out;
}
function renderMergeConflict(local,remote){
  const localPane=document.getElementById('mergeLocal'),remotePane=document.getElementById('mergeRemote'),editor=document.getElementById('mergeEditor');
  if(localPane)localPane.innerHTML=diffPaneHTML(local.doc||'',remote.doc||'','local');
  if(remotePane)remotePane.innerHTML=diffPaneHTML(remote.doc||'',local.doc||'','remote');
  if(editor){
    editor.innerHTML=local.doc||'';
    normalizeEditorTypography(editor);
  }
}
function loadMergeFrom(source){
  if(!mountConflict)return;
  const editor=document.getElementById('mergeEditor');
  if(!editor)return;
  editor.innerHTML=(source==='remote'?mountConflict.remote:mountConflict.local).doc||'';
  normalizeEditorTypography(editor);
  editor.focus();
}
async function confirmMergedConflict(){
  if(!mountConflict)return false;
  const editor=document.getElementById('mergeEditor');
  if(!editor)return false;
  try{
    setMountBusy(true);
    normalizeEditorTypography(editor);
    const snapshot={
      doc:editor.innerHTML,
      dates:mergeDates(mountConflict.local,mountConflict.remote),
      stats:mergeStats(mountConflict.local,mountConflict.remote),
      todos:mergeTodos(mountConflict.local,mountConflict.remote),
      savedAt:new Date().toISOString()
    };
    await applyMountedSnapshot(snapshot,true);
    unlockEditor();
    return true;
  }catch(e){
    console.error('保存合并版本失败',e);
    setMountMsg('保存合并版本失败，请重试。',true);
    return false;
  }finally{
    setMountBusy(false);
  }
}
async function applyMountedSnapshot(snapshot,writeBack){
  try{localStorage.removeItem(CONFLICT_BACKUP_KEY)}catch(e){}
  snapshot=trySaveLocalSnapshot(snapshot);
  doc.innerHTML=snapshot.doc||'';
  resetWritingBaseline();
  renderAllContent();
  renderCal();
  updateStorStatus(fileWritable);
  if(writeBack){
    setPendingSync(true);
    const wrote=await writeToHandle(snapshot);
    if(!wrote)latestFileSnapshot=snapshot;
  }else{
    rememberSyncedSnapshot(snapshot);
    setPendingSync(false);
  }
}
async function resolveMountConflict(source){
  if(!mountConflict)return false;
  try{
    setMountBusy(true);
    const useLocal=source==='local';
    const snapshot=useLocal?mountConflict.local:mountConflict.remote;
    await applyMountedSnapshot(snapshot,useLocal);
    unlockEditor();
    return true;
  }catch(e){
    console.error('解决同步冲突失败',e);
    setMountMsg('处理冲突失败，请重试。',true);
    return false;
  }finally{
    setMountBusy(false);
  }
}
async function initStartupMount(){
  const lastName=localStorage.getItem(HANDLE_NAME_KEY);
  prepareMountGate(!!lastName);
  setMountFileText(lastName?'正在检查上次同步文件: '+lastName:'正在检查同步文件记录...');
  setMountMsg('');
  try{renderCal()}catch(e){console.error('日历渲染失败',e)}
  const timer=setTimeout(()=>{
    if(!fileHandle){
      prepareMountGate(!!lastName);
      setMountFileText(lastName?'上次文件名: '+lastName:'没有上次同步文件记录，请选择 diary.json。');
      setMountMsg(lastName?'读取上次文件记录超时，可点击上方按钮重试；如需更换文件，请进入后使用右侧“链接文件”。':'请选择 diary.json 作为同步文件。',!!lastName);
    }
  },1800);
  try{await restoreHandle()}finally{clearTimeout(timer)}
}
async function restoreHandle(){
  if(!hasFSAP){
    updateStorStatus(false);
    prepareMountGate(false);
    setMountFileText('当前浏览器不支持文件挂载，请使用 Chrome 或 Edge。');
    setMountMsg('无法进入文件同步模式。',true);
    return false;
  }
  try{
    const db=await openHandleDB();
    const item=await getHandleRecord(db,'diary');
    if(!item||!item.handle){
      updateStorStatus(false);
      prepareMountGate(false);
      const lastName=localStorage.getItem(HANDLE_NAME_KEY);
      if(lastName){
        setMountFileText('上次文件名: '+lastName);
        setMountMsg('浏览器没有可恢复的文件句柄。通常是启动地址变了或站点数据被清理，请点击上方按钮重新选择一次。',true);
      }else{
        setMountFileText('没有上次同步文件记录，请选择 diary.json。');
        setMountMsg('');
      }
      return false;
    }
    fileHandle=item.handle;
    setMountFileText('上次同步文件: '+fileHandle.name);
    prepareMountGate(true);
    let p='prompt';
    try{p=await fileHandle.queryPermission({mode:'readwrite'})}catch(e){}
    fileWritable=p==='granted';
    updateStorStatus(fileWritable);
    const ok=fileWritable;
    if(ok){
      setMountMsg('正在自动挂载并同步...');
      if(!await syncFromLinkedFile())return false;
      unlockEditor();
      return true;
    }
    setMountMsg('浏览器需要你点击一次来恢复文件权限。');
    return false;
  }catch(e){
    console.error('恢复文件链接失败',e);
    fileWritable=false;updateStorStatus(false);
    prepareMountGate(false);
    setMountFileText('无法读取上次同步文件记录，请重新选择 diary.json。');
    setMountMsg('恢复失败，请重新选择文件。',true);
    return false;
  }
}
async function saveHandle(){
  if(!fileHandle)return false;
  try{
    localStorage.setItem(HANDLE_NAME_KEY,fileHandle.name);
    if(navigator.storage&&navigator.storage.persist){
      try{await navigator.storage.persist()}catch(e){}
    }
    const db=await openHandleDB();
    await putHandleRecord(db,'diary',{handle:fileHandle,name:fileHandle.name,savedAt:new Date().toISOString()});
    return true;
  }catch(e){console.error('保存文件链接失败',e);return false}
}
async function verifyHandle(askPermission){
  if(!fileHandle)return false;
  try{
    let p=await fileHandle.queryPermission({mode:'readwrite'});
    if(p==='prompt'&&askPermission)p=await fileHandle.requestPermission({mode:'readwrite'});
    fileWritable=p==='granted';
    updateStorStatus(fileWritable);
    return fileWritable;
  }catch(e){fileWritable=false;updateStorStatus(false);return false}
}
function updateStorStatus(ok){
  const linkEl=document.getElementById('linkStatus'),cloudEl=document.getElementById('cloudStatus');
  const pending=hasPendingSync();
  const row=(dot,label,text)=>'<span class="'+dot+'"></span><span class="s-label">'+label+'</span><span class="s-text" title="'+escAttr(text)+'">'+escAttr(text)+'</span>';
  if(linkEl){
    if(ok&&fileHandle)linkEl.innerHTML=row('dot-ok','链接','已链接');
    else if(fileHandle)linkEl.innerHTML=row('dot-wait','链接','待授权');
    else if(localStorage.getItem(HANDLE_NAME_KEY))linkEl.innerHTML=row('dot-wait','链接','待挂载');
    else linkEl.innerHTML=row('dot-no','链接','未挂载');
  }
  if(cloudEl){
    if(fileWritePending)cloudEl.innerHTML=row('dot-wait','云端','保存中');
    else if(ok&&fileHandle&&pending)cloudEl.innerHTML=row('dot-wait','云端','待同步');
    else if(ok&&fileHandle)cloudEl.innerHTML=row('dot-ok','云端','已同步');
    else if(pending)cloudEl.innerHTML=row('dot-wait','云端','仅本地');
    else cloudEl.innerHTML=row('dot-no','云端','未保存');
  }
}
async function linkFile(){
  await mountStartupFile();
}
async function mountStartupFile(){
  if(!hasFSAP){setMountMsg('当前浏览器不支持文件系统 API，请使用 Chrome 或 Edge。',true);return false}
  try{
    setMountBusy(true);
    setMountMsg(fileHandle?'正在恢复上次同步文件...':'请选择同步文件 diary.json。');
    if(fileHandle&&!fileWritable){
      const ok=await verifyHandle(true);
      if(!ok){setMountMsg('需要授予读写权限才能进入编辑模式。',true);return false}
      const saved=await saveHandle();
      if(!saved){setMountMsg('浏览器未能保存文件链接，请确认通过 http://localhost 或 https 打开。',true);return false}
      if(!await syncFromLinkedFile())return false;
      unlockEditor();
      return true;
    }
    if(fileHandle&&fileWritable){
      if(!await syncFromLinkedFile())return false;
      unlockEditor();
      return true;
    }
    return await chooseAndMountFile();
  }catch(e){
    if(e.name!=='AbortError'){
      console.error(e);
      setMountMsg('挂载失败，请重试或重新选择文件。',true);
    }
    return false;
  }finally{
    setMountBusy(false);
  }
}
async function chooseAndMountFile(){
  if(!hasFSAP){setMountMsg('当前浏览器不支持文件系统 API，请使用 Chrome 或 Edge。',true);return false}
  try{
    setMountBusy(true);
    setMountMsg('请选择云盘同步目录中的 diary.json。');
    const h=await window.showOpenFilePicker({types:[{description:'日记数据',accept:{'application/json':['.json']}}],multiple:false});
    fileHandle=h[0];
    setMountFileText('同步文件: '+fileHandle.name);
    prepareMountGate(true);
    const ok=await verifyHandle(true);
    if(!ok){setMountMsg('需要授予读写权限才能进入编辑模式。',true);return false}
    const saved=await saveHandle();
    if(!saved){setMountMsg('浏览器未能保存文件链接，请确认通过 http://localhost 或 https 打开。',true);return false}
    if(!await syncFromLinkedFile())return false;
    unlockEditor();
    return true;
  }catch(e){
    if(e.name!=='AbortError'){
      console.error(e);
      setMountMsg('选择或挂载失败，请重试。',true);
    }
    return false;
  }finally{
    setMountBusy(false);
  }
}
async function readFileSnapshot(){
  return readSnapshotFromHandle(fileHandle);
}
async function restoreCalendarFromCloud(){
  if(!fileHandle){
    setMountMsg('No linked cloud file. Please link diary.json first.',true);
    return false;
  }
  try{
    setMountBusy(true);
    const ok=fileWritable||await verifyHandle(true);
    if(!ok){
      setMountMsg('Need file permission before restoring calendar todos.',true);
      return false;
    }
    const remote=await readFileSnapshot();
    const remoteTodos=normalizeTodos(remote&&remote.todos);
    const count=Object.values(remoteTodos).reduce((sum,items)=>sum+items.length,0);
    if(!count){
      setMountMsg('No calendar todos found in the linked cloud file.',true);
      return false;
    }
    const snapshot={
      doc:doc.innerHTML,
      dates:mergeDates(getLocalSnapshot(),remote),
      stats:getStats(),
      todos:remoteTodos,
      savedAt:new Date().toISOString()
    };
    trySaveLocalSnapshot(snapshot);
    latestFileSnapshot=snapshot;
    renderCal({animate:false});
    queueFileWrite(snapshot);
    setMountMsg('Calendar todos restored from the linked cloud file.');
    return true;
  }catch(e){
    console.error('Restore calendar from cloud failed',e);
    setMountMsg('Failed to restore calendar todos from the linked cloud file.',true);
    return false;
  }finally{
    setMountBusy(false);
  }
}
async function syncFromLinkedFile(){
  syncReady=false;
  if(!fileHandle||!fileWritable)return false;
  try{
    const remote=await readFileSnapshot();
    const local=getLocalSnapshot();
    const decision=decideMountSnapshot(local,remote);
    if(decision.action==='conflict'){
      showMountConflict(local,remote);
      return false;
    }
    const useLocal=decision.action==='local';
    await applyMountedSnapshot(useLocal?local:remote,useLocal);
    return true;
  }catch(e){
    console.error('同步链接文件失败',e);
    fileWritable=false;
    setPendingSync(true);
    updateStorStatus(false);
    setMountMsg('读取同步文件失败。为避免覆盖云盘文件，已暂停进入编辑模式，请确认云盘同步完成后重新挂载。',true);
    return false;
  }
}
function queueFileWrite(snapshot){
  if(snapshot)latestFileSnapshot=snapshot;
  if(!syncReady)return;
  if(!fileHandle||!fileWritable){setPendingSync(true);return}
  setPendingSync(true);
  if(fileWritePending){updateStorStatus(fileWritable);return}
  fileWritePending=true;
  updateStorStatus(fileWritable);
  fileWritePromise=fileWritePromise.then(drainFileWrites).finally(()=>{
    fileWritePending=false;
    updateStorStatus(fileWritable);
    if(latestFileSnapshot&&syncReady&&fileHandle&&fileWritable)queueFileWrite();
  });
}
async function drainFileWrites(){
  while(latestFileSnapshot&&fileHandle&&fileWritable){
    const snapshot=latestFileSnapshot;
    latestFileSnapshot=null;
    const ok=await writeToHandle(snapshot);
    if(!ok){
      latestFileSnapshot=snapshot;
      scheduleFileRetry();
      break;
    }
  }
}
function scheduleFileRetry(){
  clearTimeout(fileRetryTimer);
  if(!syncReady||!fileHandle||!fileWritable)return;
  fileRetryTimer=setTimeout(()=>queueFileWrite(),2000);
}
async function writeToHandle(snapshot){
  if(!fileHandle){setPendingSync(true);return false}
  try{
    const ok=fileWritable||await verifyHandle(false);
    if(!ok){updateStorStatus(false);return false}
    const target=snapshot||getLocalSnapshot();
    await writeSnapshotToHandle(fileHandle,target);
    rememberSyncedSnapshot(target);
    setPendingSync(false);
    updateStorStatus(true);
    clearTimeout(fileRetryTimer);
    return true;
  }catch(e){
    console.error('写入失败',e);
    if(e&&['NotAllowedError','SecurityError'].includes(e.name))fileWritable=false;
    setPendingSync(true);
    updateStorStatus(fileWritable);
    scheduleFileRetry();
    return false;
  }
}
function exportFile(){const d=snapshotToV2({doc:doc.innerHTML,dates:getDates(),stats:getStats(),todos:getTodos(),savedAt:new Date().toISOString()});const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='diary_'+todayStr()+'.json';a.click();URL.revokeObjectURL(a.href)}
function importFile(){document.getElementById('importPicker').click()}
function handleImport(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const snapshot=migrateSnapshot(JSON.parse(ev.target.result),{sanitizeHTML:normalizeEditorHTML});if(!snapshot.savedAt)snapshot.savedAt=new Date().toISOString();doc.innerHTML=snapshot.doc;resetWritingBaseline();trySaveLocalSnapshot(snapshot);renderAllContent();renderCal();queueFileWrite(snapshot)}catch(err){alert('文件格式错误')}};r.readAsText(f);e.target.value=''}
