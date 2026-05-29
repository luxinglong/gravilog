const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const schemaPath = path.join(__dirname, '..', 'src', 'storage', 'schema.js');
const fileStorePath = path.join(__dirname, '..', 'src', 'storage', 'file-store.js');

class MemoryFileHandle {
  constructor(name) {
    this.name = name;
    this.kind = 'file';
    this.value = '';
  }

  async getFile() {
    const value = this.value;
    if (value && typeof value.arrayBuffer === 'function') return value;
    return {
      type: value && value.type || 'text/plain',
      async text() {
        return value && typeof value.text === 'function' ? value.text() : String(value || '');
      },
    };
  }

  async createWritable() {
    return {
      write: async (value) => {
        this.value = value;
      },
      close: async () => {},
    };
  }
}

class MemoryDirectoryHandle {
  constructor(name = 'root') {
    this.name = name;
    this.kind = 'directory';
    this.files = new Map();
    this.dirs = new Map();
  }

  async getFileHandle(name, options = {}) {
    if (!this.files.has(name)) {
      if (!options.create) {
        const error = new Error('Not found');
        error.name = 'NotFoundError';
        throw error;
      }
      this.files.set(name, new MemoryFileHandle(name));
    }
    return this.files.get(name);
  }

  async getDirectoryHandle(name, options = {}) {
    if (!this.dirs.has(name)) {
      if (!options.create) {
        const error = new Error('Not found');
        error.name = 'NotFoundError';
        throw error;
      }
      this.dirs.set(name, new MemoryDirectoryHandle(name));
    }
    return this.dirs.get(name);
  }

  async *entries() {
    for (const entry of this.dirs) yield entry;
    for (const entry of this.files) yield entry;
  }

  async removeEntry(name) {
    this.files.delete(name);
    this.dirs.delete(name);
  }
}

class TestFileReader {
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`;
      this.onload && this.onload({ target: this });
    }).catch((error) => {
      this.error = error;
      this.onerror && this.onerror(error);
    });
  }
}

function loadContext() {
  const context = {
    Blob,
    Date,
    FileReader: TestFileReader,
    JSON,
    Math,
    String,
    Object,
    Array,
    Number,
    RegExp,
    console,
    fetch: async (url) => {
      const match = String(url).match(/^data:([^;,]+)?;base64,(.*)$/);
      if (!match) throw new Error('Only data URLs are supported in this test fetch');
      return {
        async blob() {
          return new Blob([Buffer.from(match[2], 'base64')], { type: match[1] || 'application/octet-stream' });
        },
      };
    },
    normalizeEditorHTML: (html) => String(html || ''),
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(schemaPath, 'utf8'), context, { filename: schemaPath });
  vm.runInContext(fs.readFileSync(fileStorePath, 'utf8'), context, { filename: fileStorePath });
  return context;
}

test('directory snapshot write externalizes excalidraw canvas resources and hydrates them on read', async () => {
  const context = loadContext();
  const root = new MemoryDirectoryHandle();
  const scene = { type: 'excalidraw', version: 2, elements: [{ id: 'el1', type: 'rectangle' }], appState: {}, files: {} };
  const snapshot = {
    version: 2,
    blocks: [{ id: 'b1', type: 'image', assetId: 'canvas_1', canvasId: 'canvas_1', className: 'canvas-image' }],
    assets: {
      canvas_1: {
        type: 'excalidraw',
        mime: 'image/png',
        data: 'data:image/png;base64,cHJldmlldw==',
        scene,
      },
    },
    calendar: { todos: {} },
    stats: { dailyChars: {}, editDates: [] },
    meta: { savedAt: '2026-05-28T00:00:00.000Z' },
  };

  await context.writeSnapshotToDirectoryHandle(root, snapshot);

  const diary = JSON.parse(await (await root.getFileHandle('diary.json')).getFile().then((file) => file.text()));
  expect(diary.assets.canvas_1.data).toBeUndefined();
  expect(diary.assets.canvas_1.preview).toBe('resources/canvas_1/preview.png');
  expect(diary.assets.canvas_1.scene).toBe('resources/canvas_1/scene.excalidraw.json');

  const resources = await root.getDirectoryHandle('resources');
  const canvasDir = await resources.getDirectoryHandle('canvas_1');
  expect(await (await (await canvasDir.getFileHandle('scene.excalidraw.json')).getFile()).text()).toContain('"el1"');

  const restored = await context.readSnapshotFromDirectoryHandle(root);
  expect(restored.doc).toContain('data:image/png;base64,cHJldmlldw==');
  expect(restored.doc).toContain('data-canvas-id="canvas_1"');
  expect(restored.doc).toContain('data-canvas-scene=');
});

test('directory snapshot write removes orphaned canvas resource folders', async () => {
  const context = loadContext();
  const root = new MemoryDirectoryHandle();
  const resources = await root.getDirectoryHandle('resources', { create: true });
  await resources.getDirectoryHandle('canvas_old', { create: true });

  const snapshot = {
    version: 2,
    blocks: [{ id: 'b1', type: 'image', assetId: 'canvas_1', canvasId: 'canvas_1' }],
    assets: {
      canvas_1: {
        type: 'excalidraw',
        mime: 'image/png',
        data: 'data:image/png;base64,cHJldmlldw==',
        scene: { type: 'excalidraw', version: 2, elements: [], appState: {}, files: {} },
      },
    },
    calendar: { todos: {} },
    stats: { dailyChars: {}, editDates: [] },
    meta: { savedAt: '2026-05-28T00:00:00.000Z' },
  };

  await context.writeSnapshotToDirectoryHandle(root, snapshot);

  expect(resources.dirs.has('canvas_old')).toBe(false);
  expect(resources.dirs.has('canvas_1')).toBe(true);

  await context.writeSnapshotToDirectoryHandle(root, {
    version: 2,
    blocks: [],
    assets: {},
    calendar: { todos: {} },
    stats: { dailyChars: {}, editDates: [] },
    meta: { savedAt: '2026-05-28T00:01:00.000Z' },
  });

  expect(resources.dirs.has('canvas_1')).toBe(false);
});
