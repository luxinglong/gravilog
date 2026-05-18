const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const schemaPath = path.join(__dirname, '..', 'src', 'storage', 'schema.js');
const localStorePath = path.join(__dirname, '..', 'src', 'storage', 'local-store.js');

function createContext({ failWrites = false } = {}) {
  const data = new Map();
  const context = {
    Date,
    Math,
    String,
    Object,
    Array,
    Number,
    RegExp,
    JSON,
    console,
    localStorage: {
      getItem: key => (data.has(key) ? data.get(key) : null),
      setItem: (key, value) => {
        if (failWrites) throw new Error('quota exceeded');
        data.set(key, String(value));
      },
      removeItem: key => data.delete(key),
    },
    updateStorStatus: () => {},
    fileWritable: false,
  };
  vm.createContext(context);
  vm.runInContext(
    [
      "const STORAGE_KEY='diary_doc',DATES_KEY='diary_edit_dates',STATS_KEY='diary_daily_stats',TODOS_KEY='diary_calendar_todos',META_KEY='diary_meta',PENDING_SYNC_KEY='diary_pending_sync',LAST_SYNC_KEY='diary_last_synced_snapshot';",
      fs.readFileSync(schemaPath, 'utf8'),
      fs.readFileSync(localStorePath, 'utf8'),
    ].join('\n'),
    context,
    { filename: localStorePath }
  );
  return { context, data };
}

test('trySaveLocalSnapshot does not throw when browser storage is full', () => {
  const { context, data } = createContext({ failWrites: true });

  const snapshot = context.trySaveLocalSnapshot({
    doc: '<p>Remote version</p>',
    dates: ['2026-05-18'],
    stats: {},
    todos: {},
    savedAt: '2026-05-18T00:00:00.000Z',
  });

  expect(snapshot.doc).toBe('<p>Remote version</p>');
  expect(data.size).toBe(0);
});

test('todos remain readable from memory when local cache cannot be written', () => {
  const { context } = createContext({ failWrites: true });

  context.trySaveLocalSnapshot({
    doc: '<p>Remote version</p>',
    dates: ['2026-05-18'],
    stats: {},
    todos: {
      '2026-05-18': [{ id: 't1', start: 600, duration: 30, category: 'work', text: 'Plan' }],
    },
    savedAt: '2026-05-18T00:00:00.000Z',
  });

  expect(context.getTodos()['2026-05-18'][0].text).toBe('Plan');
});

test('memory snapshot wins over stale empty todo cache during the active session', () => {
  const { context, data } = createContext();
  data.set('diary_calendar_todos', '{}');

  context.rememberLocalSnapshotCache({
    doc: '<p>Remote version</p>',
    dates: ['2026-05-18'],
    stats: {},
    todos: {
      '2026-05-18': [{ id: 't1', start: 600, duration: 30, category: 'work', text: 'Plan' }],
    },
    savedAt: '2026-05-18T00:00:00.000Z',
  });

  expect(context.getTodos()['2026-05-18'][0].text).toBe('Plan');
});

test('pending marker writes do not throw when browser storage is full', () => {
  const { context } = createContext({ failWrites: true });

  expect(() => context.setPendingSync(true)).not.toThrow();
  expect(() => context.setPendingSync(false)).not.toThrow();
});
