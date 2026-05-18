function readJSONStore(key,fallback){
  try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}
  catch(e){return fallback}
}

let localSnapshotCache=null;

function rememberLocalSnapshotCache(snapshot){
  localSnapshotCache=normalizeSnapshot(snapshot);
  return localSnapshotCache;
}

function saveLocalSnapshot(snapshot){
  const normalized=normalizeSnapshot(snapshot);
  localStorage.setItem(STORAGE_KEY,normalized.doc||'');
  localStorage.setItem(DATES_KEY,JSON.stringify(normalized.dates||[]));
  localStorage.setItem(STATS_KEY,JSON.stringify(normalized.stats||{}));
  localStorage.setItem(TODOS_KEY,JSON.stringify(normalized.todos||{}));
  localStorage.setItem(META_KEY,JSON.stringify({savedAt:normalized.savedAt||new Date().toISOString(),schemaVersion:SNAPSHOT_VERSION_V1}));
  return rememberLocalSnapshotCache(normalized);
}

function clearLocalSnapshot(){
  [STORAGE_KEY,DATES_KEY,STATS_KEY,TODOS_KEY,META_KEY].forEach(key=>{
    try{localStorage.removeItem(key)}catch(e){}
  });
}

function trySaveLocalSnapshot(snapshot){
  try{
    return saveLocalSnapshot(snapshot);
  }catch(firstError){
    try{
      clearLocalSnapshot();
      return saveLocalSnapshot(snapshot);
    }catch(secondError){
      clearLocalSnapshot();
      console.warn('Local snapshot cache write failed; using linked file as source of truth',secondError);
      return rememberLocalSnapshotCache(snapshot);
    }
  }
}

function getLocalSnapshot(){
  const meta=readJSONStore(META_KEY,{});
  const hasStoredSnapshot=localStorage.getItem(STORAGE_KEY)!==null||localStorage.getItem(DATES_KEY)!==null||localStorage.getItem(STATS_KEY)!==null||localStorage.getItem(TODOS_KEY)!==null||localStorage.getItem(META_KEY)!==null;
  if(!hasStoredSnapshot&&localSnapshotCache)return normalizeSnapshot(localSnapshotCache);
  return rememberLocalSnapshotCache({
    doc:localStorage.getItem(STORAGE_KEY)||'',
    dates:getDates(),
    stats:getStats(),
    todos:getTodos(),
    savedAt:meta.savedAt||''
  });
}

function getLastSyncedSnapshot(){
  const snapshot=readJSONStore(LAST_SYNC_KEY,null);
  if(!snapshot)return null;
  return snapshot.fingerprint?snapshot:normalizeSnapshot(snapshot);
}

function rememberSyncedSnapshot(snapshot){
  const normalized=normalizeSnapshot(snapshot);
  try{
    localStorage.setItem(LAST_SYNC_KEY,JSON.stringify({
      schemaVersion:SNAPSHOT_VERSION_V1,
      fingerprint:snapshotSyncFingerprint(normalized),
      savedAt:normalized.savedAt||new Date().toISOString()
    }));
  }catch(e){
    console.warn('Failed to remember sync baseline',e);
  }
  return normalized;
}

function setPendingSync(pending){
  const wasPending=hasPendingSync();
  try{
    if(pending){
      if(!wasPending)localStorage.setItem(PENDING_SYNC_KEY,'1');
    }else if(wasPending)localStorage.removeItem(PENDING_SYNC_KEY);
  }catch(e){
    console.warn('Failed to update pending sync marker',e);
  }
  if(pending===wasPending)return;
  updateStorStatus(fileWritable);
}

function hasPendingSync(){return localStorage.getItem(PENDING_SYNC_KEY)==='1'}

function getDates(){
  if(localSnapshotCache)return localSnapshotCache.dates||[];
  const raw=readJSONStore(DATES_KEY,[]);
  return Array.isArray(raw)?raw.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)):[];
}

function saveDates(dates){
  const normalizedDates=Array.from(new Set(dates||[])).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  localSnapshotCache=normalizeSnapshot(Object.assign({},localSnapshotCache||{}, {dates:normalizedDates}));
  try{
    localStorage.setItem(DATES_KEY,JSON.stringify(normalizedDates));
  }catch(e){
    console.warn('Failed to save local date cache',e);
  }
}

function getStats(){
  if(localSnapshotCache)return localSnapshotCache.stats||{};
  return normalizeStats(readJSONStore(STATS_KEY,{}));
}
function saveStats(stats){
  localSnapshotCache=normalizeSnapshot(Object.assign({},localSnapshotCache||{}, {stats:normalizeStats(stats)}));
  try{localStorage.setItem(STATS_KEY,JSON.stringify(normalizeStats(stats)))}
  catch(e){console.warn('Failed to save local stats cache',e)}
}
function getTodos(){
  if(localSnapshotCache)return localSnapshotCache.todos||{};
  return normalizeTodos(readJSONStore(TODOS_KEY,{}));
}
