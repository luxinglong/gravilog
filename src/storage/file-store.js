async function readSnapshotFromHandle(handle){
  if(!handle)return null;
  const file=await handle.getFile();
  const text=await file.text();
  if(!text.trim())return createEmptySnapshot();
  return migrateSnapshot(JSON.parse(text),{sanitizeHTML:normalizeEditorHTML});
}

async function writeSnapshotToHandle(handle,snapshot){
  const writable=await handle.createWritable();
  await writable.write(JSON.stringify(snapshotToV2(snapshot),null,2));
  await writable.close();
}

function canvasAssetFolderName(id){
  return String(id||'canvas_'+Date.now().toString(36)).replace(/[^\w-]/g,'')||'canvas_asset';
}

async function fileStoreGetChildDirectory(root,parts,create){
  let dir=root;
  for(const part of parts){
    if(!part)continue;
    dir=await dir.getDirectoryHandle(part,{create:!!create});
  }
  return dir;
}

async function fileStoreGetFileByPath(root,path,create){
  const parts=String(path||'').split('/').filter(Boolean);
  const name=parts.pop();
  if(!name)return null;
  const dir=await fileStoreGetChildDirectory(root,parts,create);
  return dir.getFileHandle(name,{create:!!create});
}

async function fileStoreWriteText(file,text){
  const writable=await file.createWritable();
  await writable.write(text);
  await writable.close();
}

async function fileStoreWriteBlob(file,blob){
  const writable=await file.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function fileStoreReadText(root,path){
  const file=await fileStoreGetFileByPath(root,path,false);
  return (await file.getFile()).text();
}

async function fileStoreReadDataURL(root,path){
  const file=await fileStoreGetFileByPath(root,path,false);
  const blob=await file.getFile();
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(reader.error);
    reader.onload=()=>resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function fileStoreDataURLToBlob(data){
  return fetch(data).then(res=>res.blob());
}

async function readSnapshotFromDirectoryHandle(handle){
  if(!handle)return null;
  let diary;
  try{
    diary=await handle.getFileHandle('diary.json',{create:false});
  }catch(e){
    if(e&&e.name==='NotFoundError')return createEmptySnapshot();
    throw e;
  }
  const text=await (await diary.getFile()).text();
  if(!text.trim())return createEmptySnapshot();
  const raw=await hydrateDirectorySnapshotAssets(JSON.parse(text),handle);
  return migrateSnapshot(raw,{sanitizeHTML:normalizeEditorHTML});
}

async function writeSnapshotToDirectoryHandle(handle,snapshot){
  const file=await handle.getFileHandle('diary.json',{create:true});
  const externalized=await externalizeDirectorySnapshotAssets(snapshotToV2(snapshot),handle);
  await fileStoreWriteText(file,JSON.stringify(externalized,null,2));
  await cleanupOrphanCanvasResources(handle,externalized);
}

async function hydrateDirectorySnapshotAssets(raw,handle){
  if(!raw||raw.version!==SNAPSHOT_VERSION_V2||!raw.assets)return raw;
  const out=JSON.parse(JSON.stringify(raw));
  for(const [id,asset] of Object.entries(out.assets||{})){
    if(!asset||asset.type!=='excalidraw')continue;
    try{
      if(!asset.data&&asset.preview)asset.data=await fileStoreReadDataURL(handle,asset.preview);
      if(typeof asset.scene==='string')asset.scene=JSON.parse(await fileStoreReadText(handle,asset.scene));
      asset.mime=asset.mime||'image/png';
      asset.type='excalidraw';
    }catch(e){
      console.warn('Failed to load canvas resource',id,e);
    }
  }
  return out;
}

async function externalizeDirectorySnapshotAssets(snapshot,handle){
  const out=JSON.parse(JSON.stringify(snapshot||createEmptySnapshot()));
  if(!out.assets||typeof out.assets!=='object')return out;
  for(const [id,asset] of Object.entries(out.assets)){
    if(!asset||asset.type!=='excalidraw')continue;
    const folder=canvasAssetFolderName(id);
    const base='resources/'+folder;
    const previewPath=base+'/preview.png';
    const scenePath=base+'/scene.excalidraw.json';
    try{
      if(asset.data&&/^data:image\//i.test(asset.data)){
        const previewFile=await fileStoreGetFileByPath(handle,previewPath,true);
        await fileStoreWriteBlob(previewFile,await fileStoreDataURLToBlob(asset.data));
      }
      if(asset.scene&&typeof asset.scene==='object'){
        const sceneFile=await fileStoreGetFileByPath(handle,scenePath,true);
        await fileStoreWriteText(sceneFile,JSON.stringify(asset.scene,null,2));
      }
      asset.preview=previewPath;
      asset.scene=scenePath;
      delete asset.data;
    }catch(e){
      console.warn('Failed to externalize canvas resource',id,e);
    }
  }
  return out;
}

function activeCanvasResourceFolders(snapshot){
  const folders=new Set();
  Object.entries(snapshot&&snapshot.assets||{}).forEach(([id,asset])=>{
    if(!asset||asset.type!=='excalidraw')return;
    folders.add(canvasAssetFolderName(id));
    [asset.preview,asset.scene].forEach(path=>{
      const match=String(path||'').match(/^resources\/([^/]+)\//);
      if(match)folders.add(match[1]);
    });
  });
  return folders;
}

async function cleanupOrphanCanvasResources(handle,snapshot){
  if(!handle||!handle.getDirectoryHandle)return;
  let resources;
  try{
    resources=await handle.getDirectoryHandle('resources',{create:false});
  }catch(e){
    return;
  }
  if(!resources||typeof resources.entries!=='function'||typeof resources.removeEntry!=='function')return;
  const active=activeCanvasResourceFolders(snapshot);
  for await(const [name,entry] of resources.entries()){
    if(!entry||entry.kind!=='directory'||!/^canvas_/.test(name)||active.has(name))continue;
    try{
      await resources.removeEntry(name,{recursive:true});
    }catch(e){
      console.warn('Failed to remove orphan canvas resource',name,e);
    }
  }
}
