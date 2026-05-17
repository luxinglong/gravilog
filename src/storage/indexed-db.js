function openHandleDB(){
  return new Promise((res,rej)=>{
    const req=indexedDB.open('diaryDB',1);
    const timer=setTimeout(()=>rej(new Error('IndexedDB open timeout')),1800);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('handles'))req.result.createObjectStore('handles')};
    req.onsuccess=()=>{clearTimeout(timer);res(req.result)};
    req.onerror=()=>{clearTimeout(timer);rej(req.error)};
    req.onblocked=()=>{clearTimeout(timer);rej(new Error('IndexedDB blocked'))};
  })
}

function getHandleRecord(db,key){
  return new Promise((res,rej)=>{
    const tx=db.transaction('handles','readonly');
    const req=tx.objectStore('handles').get(key);
    req.onsuccess=()=>res(req.result);
    req.onerror=()=>rej(req.error);
    tx.onerror=()=>rej(tx.error);
  });
}

function putHandleRecord(db,key,value){
  return new Promise((res,rej)=>{
    const tx=db.transaction('handles','readwrite');
    tx.objectStore('handles').put(value,key);
    tx.oncomplete=()=>res();
    tx.onerror=()=>rej(tx.error);
    tx.onabort=()=>rej(tx.error);
  });
}
