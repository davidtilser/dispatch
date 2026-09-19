import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spokenDate } from '@dispatch/voice';
import { DEMO_DATE, demoDate, demoTime } from '@dispatch/data';

const zone = 'America/Los_Angeles';

test('spoken dates use the business calendar day and natural ordinals', () => {
  const now = new Date('2026-09-20T02:00:00Z'); // Still September 19 in Los Angeles.
  assert.equal(spokenDate('2026-09-19', zone, now), 'today');
  assert.equal(spokenDate('2026-09-20', zone, now), 'tomorrow');
  assert.equal(spokenDate('2026-09-21', zone, now), 'Monday, September 21st');
  for (const [day, suffix] of [[11, 'th'], [12, 'th'], [13, 'th'], [22, 'nd'], [23, 'rd'], [30, 'th']] as const) {
    assert.ok(spokenDate(`2026-09-${day}`, zone, now).endsWith(`${day}${suffix}`));
  }
});

test('tomorrow follows the local calendar across daylight-saving and year boundaries', () => {
  assert.equal(spokenDate('2026-03-08', zone, new Date('2026-03-07T23:30:00-08:00')),
    'tomorrow');
  assert.equal(spokenDate('2026-03-09', zone, new Date('2026-03-07T23:30:00-08:00')),
    'Monday, March 9th');
  assert.equal(spokenDate('2026-11-02', zone, new Date('2026-11-01T00:30:00-07:00')),
    'tomorrow');
  assert.equal(spokenDate('2027-01-01', zone, new Date('2026-12-31T23:30:00-08:00')),
    'tomorrow');
});

test('the demo day is tomorrow in the shop timezone, so offered times are never past', () => {
  // Late evening in Los Angeles: a "today" demo would already be offering past times.
  assert.equal(demoDate(new Date('2026-09-20T04:30:00Z')), '2026-09-20');
  assert.equal(demoDate(new Date('2026-09-19T17:00:00Z')), '2026-09-20');
  // Across a DST boundary the local calendar still advances exactly one day.
  assert.equal(demoDate(new Date('2026-03-07T23:30:00-08:00')), '2026-03-08');
  assert.equal(demoDate(new Date('2026-12-31T23:30:00-08:00')), '2027-01-01');
  // Every seeded opening is in the future, with the offset that date really has.
  assert.ok(Date.parse(demoTime('09:00')) > Date.now(), 'first slot is still ahead');
  assert.ok(demoTime('15:00').startsWith(`${DEMO_DATE}T15:00:00`), 'slots sit on the demo date');
  assert.match(demoTime('15:00'), /[+-]\d{2}:\d{2}$/);
});
