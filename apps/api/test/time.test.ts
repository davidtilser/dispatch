import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spokenDate } from '../dist/refill/time.js';

const zone = 'America/Los_Angeles';

test('spoken dates use the business calendar day and natural ordinals', () => {
  const now = new Date('2026-09-20T02:00:00Z'); // Still September 19 in Los Angeles.
  assert.equal(spokenDate('2026-09-19', zone, now), 'today, Saturday, September 19th');
  assert.equal(spokenDate('2026-09-20', zone, now), 'tomorrow, Sunday, September 20th');
  assert.equal(spokenDate('2026-09-21', zone, now), 'Monday, September 21st');
  for (const [day, suffix] of [[11, 'th'], [12, 'th'], [13, 'th'], [22, 'nd'], [23, 'rd'], [30, 'th']] as const) {
    assert.ok(spokenDate(`2026-09-${day}`, zone, now).endsWith(`${day}${suffix}`));
  }
});

test('tomorrow follows the local calendar across daylight-saving and year boundaries', () => {
  assert.equal(spokenDate('2026-03-08', zone, new Date('2026-03-07T23:30:00-08:00')),
    'tomorrow, Sunday, March 8th');
  assert.equal(spokenDate('2026-03-09', zone, new Date('2026-03-07T23:30:00-08:00')),
    'Monday, March 9th');
  assert.equal(spokenDate('2026-11-02', zone, new Date('2026-11-01T00:30:00-07:00')),
    'tomorrow, Monday, November 2nd');
  assert.equal(spokenDate('2027-01-01', zone, new Date('2026-12-31T23:30:00-08:00')),
    'tomorrow, Friday, January 1st');
});
