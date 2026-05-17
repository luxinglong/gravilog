function readJSONStore(key,fallback){
  try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}
  catch(e){return fallback}
}

function saveLocalSnapshot(snapshot){
  const normalized=normalizeSnapshot(snapshot);
  localStorage.setItem(STORAGE_KEY,normalized.doc||'');
  localStorage.setItem(DATES_KEY,JSON.stringify(normalized.dates||[]));
  localStorage.setItem(STATS_KEY,JSON.stringify(normalized.stats||{}));
  localStorage.setItem(TODOS_KEY,JSON.stringify(normalized.todos||{}));
  localStorage.setItem(META_KEY,JSON.stringify({savedAt:normalized.savedAt||new Date().toISOString(),schemaVersion:SNAPSHOT_VERSION_V1}));
  return normalized;
}

function getLocalSnapshot(){
  const meta=readJSONStore(META_KEY,{});
  return normalizeSnapshot({
    doc:localStorage.getItem(STORAGE_KEY)||'',
    dates:getDates(),
    stats:getStats(),
    todos:getTodos(),
    savedAt:meta.savedAt||''
  });
}

function setPendingSync(pending){
  const wasPending=hasPendingSync();
  if(pending){
    if(!wasPending)localStorage.setItem(PENDING_SYNC_KEY,'1');
  }else if(wasPending)localStorage.removeItem(PENDING_SYNC_KEY);
  if(pending===wasPending)return;
  updateStorStatus(fileWritable);
}

function hasPendingSync(){return localStorage.getItem(PENDING_SYNC_KEY)==='1'}

function getDates(){
  const raw=readJSONStore(DATES_KEY,[]);
  return Array.isArray(raw)?raw.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)):[];
}

function saveDates(dates){
  localStorage.setItem(DATES_KEY,JSON.stringify(Array.from(new Set(dates||[])).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort()));
}

function getStats(){return normalizeStats(readJSONStore(STATS_KEY,{}))}
function saveStats(stats){localStorage.setItem(STATS_KEY,JSON.stringify(normalizeStats(stats)))}
function getTodos(){return normalizeTodos(readJSONStore(TODOS_KEY,{}))}
