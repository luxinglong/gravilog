let activeCanvasImage = null;

function canvasId() {
  return 'canvas_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function encodeCanvasScene(scene) {
  return encodeURIComponent(JSON.stringify(scene || {}));
}

function decodeCanvasScene(value) {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch (e) {
    try {
      return JSON.parse(value);
    } catch (_err) {
      return null;
    }
  }
}

function ensureCanvasRuntime() {
  if (!window.GravilogExcalidraw || !window.GravilogExcalidraw.open) {
    alert('Canvas is still loading. Please try again in a moment.');
    return false;
  }
  return true;
}

function openCanvasEditor(img) {
  if (!ensureCanvasRuntime()) return;
  const overlay = document.getElementById('canvasOverlay');
  const mount = document.getElementById('canvasMount');
  if (!overlay || !mount) return;
  activeCanvasImage = img || null;
  const initialScene = img ? decodeCanvasScene(img.getAttribute('data-canvas-scene')) : null;
  closeColorPickers();
  hideCtxBars();
  rememberEditorSelection();
  overlay.classList.add('show');
  document.body.classList.add('canvas-open');
  window.GravilogExcalidraw.open({
    mount,
    initialScene,
    dark: document.body.classList.contains('dark'),
    onSave: saveCanvasResult,
    onCancel: closeCanvasEditor,
  });
  if (overlay.requestFullscreen) overlay.requestFullscreen().catch(() => {});
}

function closeCanvasEditor() {
  const overlay = document.getElementById('canvasOverlay');
  if (window.GravilogExcalidraw && window.GravilogExcalidraw.close) window.GravilogExcalidraw.close();
  if (overlay) overlay.classList.remove('show');
  document.body.classList.remove('canvas-open');
  activeCanvasImage = null;
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  doc.focus();
}

function canvasImageHTML(id, preview, scene) {
  return '<img src="' + escAttr(preview) + '" class="canvas-image align-center" data-canvas-id="' + escAttr(id) + '" data-canvas-scene="' + escAttr(encodeCanvasScene(scene)) + '" alt="Excalidraw canvas">';
}

function createCanvasImage(id, preview, scene) {
  const img = document.createElement('img');
  img.src = preview;
  img.className = 'canvas-image align-center';
  img.setAttribute('data-canvas-id', id);
  img.setAttribute('data-canvas-scene', encodeCanvasScene(scene));
  img.setAttribute('draggable', 'true');
  img.alt = 'Excalidraw canvas';
  return img;
}

function hydrateCanvasImage(img) {
  if (!img || !img.getAttribute || !img.getAttribute('data-canvas-id')) return img;
  img.classList.add('canvas-image');
  img.setAttribute('draggable', 'true');
  if (!img.getAttribute('alt')) img.setAttribute('alt', 'Excalidraw canvas');
  return img;
}

function insertCanvasNode(img, restoreSelection) {
  if (!img) return null;
  hydrateCanvasImage(img);
  if (restoreSelection) restoreEditorSelection();
  const sel = window.getSelection();
  const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
  if (range && doc.contains(range.commonAncestorContainer)) {
    range.deleteContents();
    range.insertNode(img);
    range.setStartAfter(img);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    doc.appendChild(img);
  }
  if (!img.nextSibling) {
    const p = document.createElement('p');
    p.appendChild(document.createElement('br'));
    img.after(p);
  }
  return img;
}

function insertCanvasImage(id, preview, scene) {
  return insertCanvasNode(createCanvasImage(id, preview, scene), true);
}

function canvasPayloadFromImage(img) {
  if (!img || !img.getAttribute || !img.getAttribute('data-canvas-id')) return null;
  const scene = decodeCanvasScene(img.getAttribute('data-canvas-scene'));
  if (!scene) return null;
  return {
    type: 'gravilog/excalidraw',
    version: 1,
    preview: img.getAttribute('src') || '',
    scene,
    className: img.className || 'canvas-image align-center',
    style: img.getAttribute('style') || '',
    alt: img.getAttribute('alt') || 'Excalidraw canvas'
  };
}

function canvasImageFromPayload(payload) {
  if (!payload || payload.type !== 'gravilog/excalidraw' || !payload.preview || !payload.scene) return null;
  const img = createCanvasImage(canvasId(), payload.preview, payload.scene);
  img.className = payload.className || 'canvas-image align-center';
  img.classList.add('canvas-image');
  if (payload.style) img.setAttribute('style', payload.style);
  img.alt = payload.alt || 'Excalidraw canvas';
  return hydrateCanvasImage(img);
}

function canvasImageFromHTML(html) {
  if (!html) return null;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const img = tpl.content.querySelector('img[data-canvas-scene],img[data-canvas-id]');
  if (!img) return null;
  return canvasImageFromPayload(canvasPayloadFromImage(img));
}

function selectedCanvasImage() {
  if (selImg && doc.contains(selImg) && selImg.getAttribute('data-canvas-id')) return selImg;
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!doc.contains(range.commonAncestorContainer)) return null;
  const node = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
  const direct = node && node.closest && node.closest('img[data-canvas-id]');
  if (direct && doc.contains(direct)) return direct;
  const fragment = range.cloneContents();
  return fragment.querySelector && fragment.querySelector('img[data-canvas-id]');
}

function handleCanvasCopy(e) {
  const img = selectedCanvasImage();
  const payload = canvasPayloadFromImage(img);
  if (!payload || !e.clipboardData) return;
  e.preventDefault();
  const json = JSON.stringify(payload);
  e.clipboardData.setData('application/x-gravilog-canvas', json);
  e.clipboardData.setData('text/html', img.outerHTML);
  e.clipboardData.setData('text/plain', '[Gravilog Excalidraw Canvas]');
}

function handleCanvasPaste(e) {
  if (!e.clipboardData) return;
  let payload = null;
  const raw = e.clipboardData.getData('application/x-gravilog-canvas');
  if (raw) {
    try { payload = JSON.parse(raw); } catch (_err) {}
  }
  const img = payload ? canvasImageFromPayload(payload) : canvasImageFromHTML(e.clipboardData.getData('text/html'));
  if (!img) return;
  e.preventDefault();
  insertCanvasNode(img, false);
  selImg = img;
  pushUndo();
  rememberEditorSelection();
  save();
}

let draggedCanvasImage = null;

function rangeFromPoint(x, y) {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (!pos) return null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.collapse(true);
    return range;
  }
  return null;
}

function handleCanvasDragStart(e) {
  const img = e.target && e.target.closest && e.target.closest('img[data-canvas-id]');
  if (!img || !doc.contains(img)) return;
  draggedCanvasImage = img;
  hydrateCanvasImage(img);
  img.classList.add('canvas-dragging');
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-gravilog-canvas-move', img.getAttribute('data-canvas-id') || '');
    const payload = canvasPayloadFromImage(img);
    if (payload) e.dataTransfer.setData('application/x-gravilog-canvas', JSON.stringify(payload));
  }
}

function handleCanvasDragEnd() {
  if (draggedCanvasImage) draggedCanvasImage.classList.remove('canvas-dragging');
  draggedCanvasImage = null;
}

function handleCanvasDragOver(e) {
  if (!draggedCanvasImage || !doc.contains(draggedCanvasImage)) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}

function handleCanvasDrop(e) {
  if (!draggedCanvasImage || !doc.contains(draggedCanvasImage)) return;
  const range = rangeFromPoint(e.clientX, e.clientY);
  if (!range || !doc.contains(range.commonAncestorContainer)) return;
  e.preventDefault();
  draggedCanvasImage.classList.remove('canvas-dragging');
  range.collapse(true);
  range.insertNode(draggedCanvasImage);
  range.setStartAfter(draggedCanvasImage);
  range.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  selImg = draggedCanvasImage;
  showImgBar(draggedCanvasImage);
  pushUndo();
  rememberEditorSelection();
  save();
  draggedCanvasImage = null;
}

function hydrateCanvasImages(root) {
  (root || doc).querySelectorAll('img[data-canvas-id]').forEach(hydrateCanvasImage);
}

function saveCanvasResult(result) {
  if (!result || !result.preview || !result.scene) {
    closeCanvasEditor();
    return;
  }
  const id = activeCanvasImage && activeCanvasImage.getAttribute('data-canvas-id') || canvasId();
  if (activeCanvasImage && doc.contains(activeCanvasImage)) {
    activeCanvasImage.src = result.preview;
    activeCanvasImage.setAttribute('data-canvas-id', id);
    activeCanvasImage.setAttribute('data-canvas-scene', encodeCanvasScene(result.scene));
    activeCanvasImage.setAttribute('draggable', 'true');
    activeCanvasImage.setAttribute('alt', 'Excalidraw canvas');
    activeCanvasImage.classList.add('canvas-image');
    selImg = activeCanvasImage;
    pushUndo();
    save();
  } else {
    insertCanvasImage(id, result.preview, result.scene);
    pushUndo();
    rememberEditorSelection();
    save();
  }
  closeCanvasEditor();
}

doc.addEventListener('copy', handleCanvasCopy, true);
doc.addEventListener('paste', handleCanvasPaste, true);
doc.addEventListener('dragstart', handleCanvasDragStart);
doc.addEventListener('dragend', handleCanvasDragEnd);
doc.addEventListener('dragover', handleCanvasDragOver);
doc.addEventListener('drop', handleCanvasDrop);
hydrateCanvasImages();
