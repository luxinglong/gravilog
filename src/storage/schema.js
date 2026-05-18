const SNAPSHOT_VERSION_V1=1;
const SNAPSHOT_VERSION_V2=2;

const TODO_CATEGORIES={
  Familiy:{label:'Familiy',color:'#ef4444'},
  work:{label:'work',color:'#22c55e'},
  Sleep:{label:'Sleep',color:'#8b5cf6'},
  Personal:{label:'Personal',color:'#facc15'}
};

function normalizeStats(raw){
  const out={};
  Object.keys(raw||{}).forEach(k=>{
    const v=raw[k];
    const n=typeof v==='number'?v:+(v&&v.chars||0);
    if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&n>0)out[k]=Math.round(n);
  });
  return out;
}

function normalizeTodos(raw){
  const out={};
  Object.keys(raw||{}).forEach(date=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Array.isArray(raw[date]))return;
    const items=raw[date].map(item=>{
      const hour=Math.max(0,Math.min(23,parseInt(item&&item.hour,10)||0));
      const rawStart=item&&item.start!=null?item.start:hour*60;
      const start=Math.max(0,Math.min(1425,Math.round((+rawStart||0)/15)*15));
      const duration=Math.max(15,Math.min(1440-start,Math.round((+(item&&item.duration)||30)/15)*15));
      const rawCategory=item&&item.category==='Family'?'Familiy':item&&item.category;
      const category=TODO_CATEGORIES[rawCategory]?rawCategory:'Familiy';
      const text=String(item&&item.text||'').trim();
      if(!text)return null;
      return {
        id:String(item.id||Date.now()+Math.random()),
        hour:Math.floor(start/60),
        start,
        duration,
        category,
        text
      };
    }).filter(Boolean);
    if(items.length)out[date]=items;
  });
  return out;
}

function createEmptySnapshot(){
  return {doc:'',dates:[],stats:{},todos:{},savedAt:''};
}

function schemaEscapeAttr(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function schemaEscapeHTML(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function snapshotSavedAt(snapshot){
  return snapshot&&snapshot.savedAt||snapshot&&snapshot.meta&&snapshot.meta.savedAt||new Date().toISOString();
}

function normalizeDateList(raw){
  return Array.isArray(raw)?raw.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)):[];
}

function normalizeSnapshot(raw,options={}){
  const source=raw&&typeof raw==='object'?raw:{};
  const sanitizeHTML=options.sanitizeHTML||((html)=>String(html||''));
  return {
    doc:sanitizeHTML(source.doc||''),
    dates:normalizeDateList(source.dates),
    stats:normalizeStats(source.stats),
    todos:normalizeTodos(source.todos),
    savedAt:source.savedAt||source.meta&&source.meta.savedAt||''
  };
}

function snapshotSyncPayload(snapshot){
  const normalized=normalizeSnapshot(snapshot);
  return JSON.stringify({
    doc:normalized.doc,
    dates:normalized.dates,
    stats:normalized.stats,
    todos:normalized.todos
  });
}

function snapshotSyncFingerprint(snapshot){
  const text=snapshotSyncPayload(snapshot);
  let hash=5381;
  for(let i=0;i<text.length;i++)hash=((hash<<5)+hash)^text.charCodeAt(i);
  return text.length+':'+(hash>>>0).toString(36);
}

function assetHash(data){
  let hash=5381;
  const text=String(data||'');
  for(let i=0;i<text.length;i++)hash=((hash<<5)+hash)^text.charCodeAt(i);
  return 'asset_'+(hash>>>0).toString(36);
}

function addAsset(assets,src,savedAt){
  if(!src||!/^data:image\//i.test(src))return '';
  const id=assetHash(src);
  if(!assets[id]){
    const mime=(src.match(/^data:([^;,]+)/i)||[])[1]||'application/octet-stream';
    assets[id]={mime,data:src,createdAt:savedAt};
  }
  return id;
}

function extractImageAsset(img,assets,savedAt){
  const src=img.getAttribute('src')||'';
  const assetId=addAsset(assets,src,savedAt);
  if(assetId){
    img.setAttribute('data-asset-id',assetId);
    img.removeAttribute('src');
  }
  return assetId;
}

function extractAssetsFromElement(el,assets,savedAt){
  if(!el||!el.querySelectorAll)return;
  if(el.tagName==='IMG')extractImageAsset(el,assets,savedAt);
  el.querySelectorAll('img').forEach(img=>extractImageAsset(img,assets,savedAt));
}

function imageBlockFromElement(img,assets,savedAt){
  const assetId=extractImageAsset(img,assets,savedAt);
  return {
    id:'blk_'+Math.random().toString(36).slice(2,10),
    type:'image',
    assetId,
    src:assetId?'':img.getAttribute('src')||'',
    className:img.className||'',
    style:img.getAttribute('style')||'',
    alt:img.getAttribute('alt')||'',
    createdAt:savedAt,
    updatedAt:savedAt
  };
}

function codeBlockFromElement(pre,savedAt){
  const code=pre.querySelector&&pre.querySelector('code');
  const lang=code?String(code.className||'').replace(/^.*language-/,'').split(/\s+/)[0]:'plaintext';
  return {
    id:'blk_'+Math.random().toString(36).slice(2,10),
    type:'code',
    lang:lang||'plaintext',
    text:code?code.textContent||'':pre.textContent||'',
    createdAt:savedAt,
    updatedAt:savedAt
  };
}

function htmlBlockFromElement(el,assets,savedAt){
  const clone=el.cloneNode(true);
  extractAssetsFromElement(clone,assets,savedAt);
  return {
    id:'blk_'+Math.random().toString(36).slice(2,10),
    type:clone.tagName==='TABLE'?'table':'html',
    html:clone.outerHTML,
    createdAt:savedAt,
    updatedAt:savedAt
  };
}

function snapshotToBlocksAndAssets(html,savedAt){
  const assets={};
  if(typeof document==='undefined'){
    return {
      blocks:html?[{id:'legacy_001',type:'legacy-html',html,createdAt:savedAt,updatedAt:savedAt}]:[],
      assets
    };
  }
  const tpl=document.createElement('template');
  tpl.innerHTML=html||'';
  const blocks=[];
  Array.from(tpl.content.childNodes).forEach(node=>{
    if(node.nodeType===3&&!node.textContent.trim())return;
    if(node.nodeType!==1){
      blocks.push({id:'blk_'+Math.random().toString(36).slice(2,10),type:'html',html:schemaEscapeHTML(node.textContent||''),createdAt:savedAt,updatedAt:savedAt});
      return;
    }
    if(node.tagName==='IMG')blocks.push(imageBlockFromElement(node,assets,savedAt));
    else if(node.tagName==='PRE')blocks.push(codeBlockFromElement(node,savedAt));
    else blocks.push(htmlBlockFromElement(node,assets,savedAt));
  });
  return {
    blocks:blocks.length?blocks:(html?[{id:'legacy_001',type:'legacy-html',html,createdAt:savedAt,updatedAt:savedAt}]:[]),
    assets
  };
}

function hydrateAssetRefs(html,assets){
  return String(html||'').replace(/<img\b([^>]*?)\sdata-asset-id="([^"]+)"([^>]*)>/gi,(match,before,id,after)=>{
    const asset=assets&&assets[id];
    const src=asset&&asset.data?' src="'+schemaEscapeAttr(asset.data)+'"':'';
    return '<img'+before+src+' data-asset-id="'+schemaEscapeAttr(id)+'"'+after+'>';
  });
}

function blockToHTML(block,assets){
  if(!block)return '';
  if(block.type==='legacy-html'||block.type==='html'||block.type==='table')return hydrateAssetRefs(block.html||'',assets);
  if(block.type==='image'){
    const asset=assets&&block.assetId&&assets[block.assetId];
    const src=asset&&asset.data||block.src||'';
    if(!src)return '';
    return '<img src="'+schemaEscapeAttr(src)+'"'+(block.assetId?' data-asset-id="'+schemaEscapeAttr(block.assetId)+'"':'')+(block.className?' class="'+schemaEscapeAttr(block.className)+'"':'')+(block.style?' style="'+schemaEscapeAttr(block.style)+'"':'')+(block.alt?' alt="'+schemaEscapeAttr(block.alt)+'"':'')+'>';
  }
  if(block.type==='code'){
    const lang=String(block.lang||'plaintext').replace(/[^\w#+-]/g,'')||'plaintext';
    return '<pre><code class="language-'+schemaEscapeAttr(lang)+'">'+schemaEscapeHTML(block.text||'')+'</code></pre>';
  }
  return '';
}

function snapshotToV2(snapshot){
  if(snapshot&&snapshot.version===SNAPSHOT_VERSION_V2){
    return {
      version:SNAPSHOT_VERSION_V2,
      blocks:Array.isArray(snapshot.blocks)?snapshot.blocks:[],
      assets:snapshot.assets&&typeof snapshot.assets==='object'?snapshot.assets:{},
      calendar:{todos:normalizeTodos(snapshot.calendar&&snapshot.calendar.todos)},
      stats:{
        dailyChars:normalizeStats(snapshot.stats&&snapshot.stats.dailyChars),
        editDates:normalizeDateList(snapshot.stats&&snapshot.stats.editDates)
      },
      meta:Object.assign({},snapshot.meta||{},{
        savedAt:snapshotSavedAt(snapshot),
        schemaVersion:SNAPSHOT_VERSION_V2
      })
    };
  }
  const v1=normalizeSnapshot(snapshot);
  const savedAt=snapshotSavedAt(v1);
  const structured=snapshotToBlocksAndAssets(v1.doc,savedAt);
  return {
    version:SNAPSHOT_VERSION_V2,
    blocks:structured.blocks,
    assets:structured.assets,
    calendar:{todos:v1.todos},
    stats:{dailyChars:v1.stats,editDates:v1.dates},
    meta:{savedAt,schemaVersion:SNAPSHOT_VERSION_V2}
  };
}

function migrateSnapshot(raw,options={}){
  if(raw&&raw.version===SNAPSHOT_VERSION_V2){
    const blocks=Array.isArray(raw.blocks)?raw.blocks:[];
    const html=blocks.map(block=>blockToHTML(block,raw.assets||{})).join('');
    return normalizeSnapshot({
      doc:html,
      dates:raw.stats&&raw.stats.editDates||[],
      stats:raw.stats&&raw.stats.dailyChars||{},
      todos:raw.calendar&&raw.calendar.todos||{},
      savedAt:raw.meta&&raw.meta.savedAt||''
    },options);
  }
  return normalizeSnapshot(raw,options);
}
