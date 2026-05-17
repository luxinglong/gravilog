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
