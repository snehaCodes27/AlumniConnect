import test from 'node:test';
import assert from 'node:assert/strict';
import { levelProgress, mentorshipImpact, badgeRequirement } from '../src/pages/dashboards/gamificationUtils.js';
test('level progress respects the backend square-root thresholds and resets at each level', () => {
  assert.deepEqual(levelProgress(0, 1), {start:0,next:50,percent:0});
  assert.deepEqual(levelProgress(50, 2), {start:50,next:200,percent:0});
  assert.deepEqual(levelProgress(125, 2), {start:50,next:200,percent:50});
  assert.deepEqual(levelProgress(200, 3), {start:200,next:450,percent:0});
});
test('mentorship impact counts completed records and unique accepted/completed students only', () => {
  assert.deepEqual(mentorshipImpact([
    {status:'ACCEPTED',studentId:'a'}, {status:'COMPLETED',studentId:'a'},
    {status:'COMPLETED',studentId:'b'}, {status:'PENDING',studentId:'c'},
    {status:'REJECTED',studentId:'d'}
  ]), {completed:2,students:2});
});
test('badge requirement uses the actual category threshold rather than total points', () => {
  assert.equal(badgeRequirement({code:'MENTOR_MAESTRO',pointsRequired:200}), '200 mentorship points');
  assert.equal(badgeRequirement({code:'GUIDING_LIGHT',pointsRequired:500}), '500 total impact points');
});
