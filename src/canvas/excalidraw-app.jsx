import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Excalidraw,
  exportToBlob,
  getNonDeletedElements,
  THEME,
} from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

const DEFAULT_SCENE = {
  type: 'excalidraw',
  version: 2,
  source: 'gravilog',
  elements: [],
  appState: {
    viewBackgroundColor: '#ffffff',
    gridSize: null,
  },
  files: {},
};

function cleanAppState(appState = {}) {
  const {
    collaborators,
    currentChartType,
    cursorButton,
    editingElement,
    editingGroupId,
    editingLinearElement,
    editingTextElement,
    openDialog,
    openMenu,
    resizingElement,
    selectionElement,
    selectedElementIds,
    selectedGroupIds,
    suggestedBindings,
    startBoundElement,
    ...rest
  } = appState;
  return rest;
}

function normalizeScene(scene) {
  if (!scene || typeof scene !== 'object') return DEFAULT_SCENE;
  return {
    type: 'excalidraw',
    version: scene.version || 2,
    source: scene.source || 'gravilog',
    elements: Array.isArray(scene.elements) ? scene.elements : [],
    appState: {
      ...DEFAULT_SCENE.appState,
      ...(scene.appState || {}),
    },
    files: scene.files || {},
  };
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function CanvasApp({ initialScene, dark, onSave, onCancel }) {
  const apiRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialData = useMemo(() => normalizeScene(initialScene), [initialScene]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveScene();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  });

  async function saveScene() {
    const api = apiRef.current;
    if (!api || saving) return;
    setSaving(true);
    try {
      const elements = api.getSceneElementsIncludingDeleted();
      const files = api.getFiles();
      const appState = cleanAppState(api.getAppState());
      const visibleElements = getNonDeletedElements(elements);
      const blob = await exportToBlob({
        elements: visibleElements,
        appState: {
          ...appState,
          exportWithDarkMode: false,
          viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
        },
        files,
        mimeType: 'image/png',
        exportPadding: 24,
      });
      const preview = await blobToDataURL(blob);
      onSave({
        scene: {
          type: 'excalidraw',
          version: 2,
          source: 'gravilog',
          elements,
          appState,
          files,
        },
        preview,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="canvas-shell">
      <div className="canvas-topbar">
        <div className="canvas-title">Excalidraw</div>
        <div className="canvas-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" className="primary" onClick={saveScene} disabled={!ready || saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div className="canvas-stage">
        <Excalidraw
          initialData={initialData}
          excalidrawAPI={(api) => {
            apiRef.current = api;
            setReady(true);
          }}
          theme={dark ? THEME.DARK : THEME.LIGHT}
          autoFocus
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              export: { saveFileToDisk: false },
            },
          }}
        />
      </div>
    </div>
  );
}

let root = null;

window.GravilogExcalidraw = {
  open({ mount, initialScene, dark, onSave, onCancel }) {
    if (!root) root = createRoot(mount);
    root.render(
      <CanvasApp
        initialScene={initialScene}
        dark={dark}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );
  },
  close() {
    if (root) root.render(null);
  },
};
