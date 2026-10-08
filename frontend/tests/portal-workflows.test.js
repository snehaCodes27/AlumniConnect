import test from 'node:test';
import assert from 'node:assert/strict';
import { collectPortalPages, eventHasEnded, eventRegistrationClosed, safeExternalUrl } from '../src/pages/dashboards/portalUtils.js';

test('portal counts include every backend page and preserve search filters', async () => {
  const calls = [];
  const records = await collectPortalPages(async params => {
    calls.push(params);
    return { success: true, data: { jobs: [{ id: params.page }], pagination: { totalPages: 3 } } };
  }, 'jobs', { q: 'engineer', employmentType: 'INTERNSHIP' });
  assert.deepEqual(records.map(r => r.id), [1, 2, 3]);
  assert.deepEqual(calls.map(p => [p.page, p.q, p.employmentType]), [[1,'engineer','INTERNSHIP'],[2,'engineer','INTERNSHIP'],[3,'engineer','INTERNSHIP']]);
});

test('failed pagination is reported instead of showing a partial total', async () => {
  await assert.rejects(collectPortalPages(async ({page}) => {
    if (page === 2) throw new Error('API unavailable');
    return { data: { events: [{id:1}], pagination: {totalPages:2} } };
  }, 'events'), /API unavailable/);
});

test('past event access does not require a recording, but registration respects lifecycle and capacity', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  const future = {status:'PUBLISHED',startDate:'2026-10-09T12:00:00Z',endDate:'2026-10-09T13:00:00Z'};
  assert.equal(eventRegistrationClosed(future, now), false);
  for (const change of [{status:'CANCELLED'},{status:'DRAFT'},{isSpotsFull:true},{registrationDeadline:'2026-10-07T12:00:00Z'},{endDate:'2026-10-07T13:00:00Z'}]) {
    assert.equal(eventRegistrationClosed({...future,...change}, now), true);
  }
  assert.equal(eventHasEnded({...future,status:'COMPLETED'}, now), true);
  assert.equal(eventHasEnded({...future,endDate:'2026-10-07T13:00:00Z'}, now), true);
});

test('external meeting and resume links accept only actual HTTP(S) URLs', () => {
  assert.equal(safeExternalUrl('https://meet.google.com/abc-defg-hij'), 'https://meet.google.com/abc-defg-hij');
  for (const value of ['javascript:alert(1)','data:text/html,test','file:///secret','/webinar/internal',undefined]) assert.equal(safeExternalUrl(value), null);
});
