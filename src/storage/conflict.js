function snapshotTime(snapshot){
  const t=Date.parse(snapshot&&snapshot.savedAt||'');
  return Number.isFinite(t)?t:0;
}

function snapshotHasContent(snapshot){
  return !!(snapshot&&(snapshot.doc||'').trim()||(snapshot&&snapshot.dates&&snapshot.dates.length)||Object.keys(normalizeTodos(snapshot&&snapshot.todos)).length);
}

function snapshotsDiffer(a,b){
  if(!a&&!b)return false;
  if(!a||!b)return true;
  const left=normalizeSnapshot(a),right=normalizeSnapshot(b);
  return left.doc!==right.doc||JSON.stringify(left.dates)!==JSON.stringify(right.dates)||JSON.stringify(left.stats)!==JSON.stringify(right.stats)||JSON.stringify(left.todos)!==JSON.stringify(right.todos);
}

function snapshotChangedSinceBaseline(snapshot,baseline){
  if(!baseline)return true;
  if(baseline.fingerprint)return snapshotSyncFingerprint(snapshot)!==baseline.fingerprint;
  return snapshotsDiffer(snapshot,baseline);
}

function decideMountSnapshot(local,remote){
  const lt=snapshotTime(local),rt=snapshotTime(remote);
  const localHas=snapshotHasContent(local),remoteHas=snapshotHasContent(remote);
  const pending=hasPendingSync()&&localHas;
  const lastSynced=typeof getLastSyncedSnapshot==='function'?getLastSyncedSnapshot():null;
  if(!localHas)return {action:'remote'};
  if(!remoteHas)return {action:'local'};
  if(!snapshotsDiffer(local,remote))return {action:'remote'};
  if(lastSynced){
    const localChanged=snapshotChangedSinceBaseline(local,lastSynced);
    const remoteChanged=snapshotChangedSinceBaseline(remote,lastSynced);
    if(localChanged&&remoteChanged)return {action:'conflict'};
    if(localChanged&&!remoteChanged)return {action:'local'};
    if(!localChanged&&remoteChanged)return {action:'remote'};
  }
  if(pending)return {action:'conflict'};
  if(!lt||!rt||lt===rt)return {action:'conflict'};
  if(lt&&rt&&lt>rt)return {action:'local'};
  if(lt&&!rt)return {action:'local'};
  return {action:'remote'};
}
