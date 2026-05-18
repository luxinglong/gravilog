const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const schemaPath = path.join(__dirname, '..', 'src', 'storage', 'schema.js');
const conflictPath = path.join(__dirname, '..', 'src', 'storage', 'conflict.js');

function createContext({ pending = false, lastSynced = null } = {}) {
  const context = {
    Date,
    Math,
    String,
    Object,
    Array,
    Number,
    RegExp,
    JSON,
    hasPendingSync: () => pending,
    getLastSyncedSnapshot: () => lastSynced,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(schemaPath, 'utf8'), context, { filename: schemaPath });
  vm.runInContext(fs.readFileSync(conflictPath, 'utf8'), context, { filename: conflictPath });
  return context;
}

function snapshot(doc, savedAt) {
  return { doc, dates: [], stats: {}, todos: {}, savedAt };
}

test('detects a mount conflict when both local and remote changed from the last synced snapshot', () => {
  const base = snapshot('<p>Base</p>', '2026-05-17T00:00:00.000Z');
  const context = createContext({ pending: true, lastSynced: base });

  const decision = context.decideMountSnapshot(
    snapshot('<p>Local draft</p>', '2026-05-18T00:00:00.000Z'),
    snapshot('<p>Remote edit</p>', '2026-05-17T23:00:00.000Z')
  );

  expect(decision.action).toBe('conflict');
});

test('writes the local pending draft only when remote still matches the last synced snapshot', () => {
  const base = snapshot('<p>Base</p>', '2026-05-17T00:00:00.000Z');
  const context = createContext({ pending: true, lastSynced: base });

  const decision = context.decideMountSnapshot(
    snapshot('<p>Local draft</p>', '2026-05-18T00:00:00.000Z'),
    snapshot('<p>Base</p>', '2026-05-17T00:00:00.000Z')
  );

  expect(decision.action).toBe('local');
});

test('supports lightweight sync fingerprints instead of storing a full baseline copy', () => {
  const context = createContext({ pending: true });
  const base = snapshot('<p>Base</p>', '2026-05-17T00:00:00.000Z');
  context.getLastSyncedSnapshot = () => ({
    schemaVersion: 1,
    fingerprint: context.snapshotSyncFingerprint(base),
    savedAt: base.savedAt,
  });

  const decision = context.decideMountSnapshot(
    snapshot('<p>Local draft</p>', '2026-05-18T00:00:00.000Z'),
    snapshot('<p>Remote edit</p>', '2026-05-17T23:00:00.000Z')
  );

  expect(decision.action).toBe('conflict');
});

test('protects existing users without a baseline by conflicting pending divergent snapshots', () => {
  const context = createContext({ pending: true });

  const decision = context.decideMountSnapshot(
    snapshot('<p>Local draft</p>', '2026-05-18T00:00:00.000Z'),
    snapshot('<p>Remote edit</p>', '2026-05-17T23:00:00.000Z')
  );

  expect(decision.action).toBe('conflict');
});
