import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getActivitySummary, recordActivity } from '../src/lib/activity';

test('recordActivity tracks events and summarizes by tool', () => {
  recordActivity('chat', 'Chat message', 'success');
  recordActivity('chat', 'Chat message', 'error');
  recordActivity('insights', 'Data insights', 'success');

  const summary = getActivitySummary();
  assert.ok(summary.total >= 3);
  assert.ok((summary.byTool.chat ?? 0) >= 2);
  assert.ok((summary.byTool.insights ?? 0) >= 1);
  assert.ok(summary.recent.length > 0);
  assert.equal(summary.recent[0].action, 'Data insights');
  assert.ok(summary.provider.id.length > 0);
});
