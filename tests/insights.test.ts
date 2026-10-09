import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, parseCSV, parseData } from '../src/lib/insights';

test('parseCSV handles quoted fields and embedded quotes', () => {
  const rows = parseCSV('name,note\n"Smith, John","said ""hi"""\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Smith, John');
  assert.equal(rows[0].note, 'said "hi"');
});

test('parseCSV returns empty array when only headers exist', () => {
  assert.deepEqual(parseCSV('a,b\n'), []);
});

test('parseData parses JSON arrays and wrapped objects', () => {
  const arr = parseData('[{"a": 1}, {"a": 2}]');
  assert.equal(arr.format, 'json');
  assert.equal(arr.rows.length, 2);

  const wrapped = parseData('{"data": [{"a": 1}]}');
  assert.equal(wrapped.rows.length, 1);
});

test('parseData rejects invalid JSON shapes', () => {
  assert.throws(() => parseData('{"a": 1}'));
  assert.throws(() => parseData('[1, 2, 3]'));
});

test('computeStats computes numeric column statistics', () => {
  const stats = computeStats([{ a: '1' }, { a: '2' }, { a: '3' }], 'csv');
  assert.equal(stats.rowCount, 3);
  const col = stats.columns.find((c) => c.name === 'a');
  assert.equal(col?.type, 'number');
  assert.equal(col?.min, 1);
  assert.equal(col?.max, 3);
  assert.equal(col?.mean, 2);
  assert.equal(col?.median, 2);
  assert.equal(col?.missing, 0);
});

test('computeStats computes string column statistics', () => {
  const stats = computeStats(
    [{ region: 'North' }, { region: 'South' }, { region: 'North' }],
    'csv',
  );
  const col = stats.columns.find((c) => c.name === 'region');
  assert.equal(col?.type, 'string');
  assert.equal(col?.unique, 2);
  assert.deepEqual(col?.topValues?.[0], { value: 'North', count: 2 });
});

test('computeStats counts missing values', () => {
  const stats = computeStats([{ a: '1' }, { a: '' }, { a: '3' }], 'csv');
  const col = stats.columns.find((c) => c.name === 'a');
  assert.equal(col?.missing, 1);
});
