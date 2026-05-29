const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const schemaPath = path.join(__dirname, '..', 'src', 'storage', 'schema.js');
const context = { Date, Math, String, Object, Array, Number, RegExp };
vm.createContext(context);
vm.runInContext(fs.readFileSync(schemaPath, 'utf8'), context, { filename: schemaPath });

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('normalizeSnapshot keeps the v1 document shape compatible', () => {
  const snapshot = context.normalizeSnapshot({
    doc: '<p>Hello</p>',
    dates: ['2026-05-17', 'bad-date'],
    stats: { '2026-05-17': 12.4, other: 8 },
    todos: {
      '2026-05-17': [{ id: 'a', hour: 9, start: 540, duration: 45, category: 'Family', text: 'Call' }],
    },
    savedAt: '2026-05-17T00:00:00.000Z',
  });

  expect(snapshot.doc).toBe('<p>Hello</p>');
  expect(plain(snapshot.dates)).toEqual(['2026-05-17']);
  expect(plain(snapshot.stats)).toEqual({ '2026-05-17': 12 });
  expect(snapshot.todos['2026-05-17'][0].category).toBe('Familiy');
  expect(snapshot.savedAt).toBe('2026-05-17T00:00:00.000Z');
});

test('migrateSnapshot reads a v2 legacy-html file as the current v1 runtime snapshot', () => {
  const snapshot = context.migrateSnapshot({
    version: 2,
    blocks: [{ id: 'legacy_001', type: 'legacy-html', html: '<p>Legacy</p>' }],
    calendar: { todos: { '2026-05-17': [{ id: 't1', start: 600, duration: 30, category: 'work', text: 'Plan' }] } },
    stats: { dailyChars: { '2026-05-17': 100 }, editDates: ['2026-05-17'] },
    meta: { savedAt: '2026-05-17T01:00:00.000Z' },
  });

  expect(snapshot.doc).toBe('<p>Legacy</p>');
  expect(plain(snapshot.dates)).toEqual(['2026-05-17']);
  expect(plain(snapshot.stats)).toEqual({ '2026-05-17': 100 });
  expect(snapshot.todos['2026-05-17'][0].text).toBe('Plan');
  expect(snapshot.savedAt).toBe('2026-05-17T01:00:00.000Z');
});

test('snapshotToV2 writes the single-file v2 container with one legacy html block', () => {
  const file = context.snapshotToV2({
    doc: '<p>Hello</p>',
    dates: ['2026-05-17'],
    stats: { '2026-05-17': 42 },
    todos: { '2026-05-17': [{ id: 't1', start: 600, duration: 30, category: 'work', text: 'Plan' }] },
    savedAt: '2026-05-17T02:00:00.000Z',
  });

  expect(file.version).toBe(2);
  expect(file.blocks[0].type).toBe('legacy-html');
  expect(file.blocks[0].html).toBe('<p>Hello</p>');
  expect(plain(file.assets)).toEqual({});
  expect(file.calendar.todos['2026-05-17'][0].text).toBe('Plan');
  expect(plain(file.stats.dailyChars)).toEqual({ '2026-05-17': 42 });
  expect(plain(file.stats.editDates)).toEqual(['2026-05-17']);
  expect(file.meta.savedAt).toBe('2026-05-17T02:00:00.000Z');
  expect(file.meta.schemaVersion).toBe(2);
});

test('calendar todos round-trip through the cloud file format', () => {
  const file = context.snapshotToV2({
    doc: '<p>Today</p>',
    dates: ['2026-05-18'],
    stats: { '2026-05-18': 18 },
    todos: {
      '2026-05-18': [
        { id: 'todo_1', start: 615, duration: 45, category: 'work', text: 'Review sync' },
        { id: 'todo_2', start: 1260, duration: 30, category: 'Personal', text: 'Plan tomorrow' },
      ],
    },
    savedAt: '2026-05-18T02:00:00.000Z',
  });

  expect(file.calendar.todos['2026-05-18']).toHaveLength(2);
  expect(file.calendar.todos['2026-05-18'][0].text).toBe('Review sync');

  const snapshot = context.migrateSnapshot(file);
  expect(snapshot.todos['2026-05-18']).toHaveLength(2);
  expect(snapshot.todos['2026-05-18'][1].category).toBe('Personal');
});

test('snapshotToV2 is idempotent for an existing v2 container', () => {
  const file = context.snapshotToV2({
    version: 2,
    blocks: [{ id: 'legacy_001', type: 'legacy-html', html: '<p>Keep</p>' }],
    assets: { asset_1: { mime: 'image/png', data: 'data:image/png;base64,xx' } },
    calendar: { todos: {} },
    stats: { dailyChars: {}, editDates: ['2026-05-17'] },
    meta: { savedAt: '2026-05-17T03:00:00.000Z' },
  });

  expect(file.version).toBe(2);
  expect(file.blocks[0].html).toBe('<p>Keep</p>');
  expect(file.assets.asset_1.mime).toBe('image/png');
  expect(plain(file.stats.editDates)).toEqual(['2026-05-17']);
  expect(file.meta.schemaVersion).toBe(2);
});

test('migrateSnapshot rebuilds structured v2 blocks and image assets for the current editor', () => {
  const snapshot = context.migrateSnapshot({
    version: 2,
    blocks: [
      { id: 'b1', type: 'html', html: '<p>Hello <img data-asset-id="asset_1"></p>' },
      { id: 'b2', type: 'code', lang: 'javascript', text: 'console.log("x")' },
      { id: 'b3', type: 'image', assetId: 'asset_1', className: 'align-center', style: 'width:50%' },
    ],
    assets: { asset_1: { mime: 'image/png', data: 'data:image/png;base64,xx' } },
    calendar: { todos: {} },
    stats: { dailyChars: {}, editDates: [] },
    meta: { savedAt: '2026-05-17T04:00:00.000Z' },
  });

  expect(snapshot.doc).toMatch(/data:image\/png;base64,xx/);
  expect(snapshot.doc).toMatch(/language-javascript/);
  expect(snapshot.doc).toMatch(/console\.log\("x"\)/);
  expect(snapshot.doc).toMatch(/align-center/);
});

test('excalidraw canvas images keep preview and editable scene data in v2 assets', () => {
  const scene = { type: 'excalidraw', version: 2, elements: [{ id: 'el1', type: 'rectangle' }], appState: {}, files: {} };
  const file = context.snapshotToV2({
    version: 2,
    blocks: [{ id: 'b1', type: 'image', assetId: 'canvas_1', canvasId: 'canvas_1', className: 'canvas-image', alt: 'Excalidraw canvas' }],
    assets: {
      canvas_1: {
        type: 'excalidraw',
        mime: 'image/png',
        data: 'data:image/png;base64,preview',
        scene,
      },
    },
    calendar: { todos: {} },
    stats: { dailyChars: {}, editDates: [] },
    meta: { savedAt: '2026-05-28T00:00:00.000Z' },
  });

  expect(file.assets.canvas_1.type).toBe('excalidraw');
  expect(file.assets.canvas_1.scene.elements[0].id).toBe('el1');

  const snapshot = context.migrateSnapshot(file);
  expect(snapshot.doc).toMatch(/data-canvas-id="canvas_1"/);
  expect(snapshot.doc).toMatch(/data-canvas-scene="/);
  expect(snapshot.doc).toMatch(/data:image\/png;base64,preview/);
});
