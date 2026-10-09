const test = require('node:test');
const assert = require('node:assert/strict');
const { createDonationService } = require('../src/services/donationPrediction.service');
function mockDb() {
  const queries = [];
  const grouped = (key, rows=[]) => ({groupBy:async query=>{queries.push([key,query]);return rows;}});
  const db={user:{findMany:async()=>[{id:'b',firstName:'B',lastName:'Member',lastLoginAt:null},{id:'a',firstName:'A',lastName:'Member',lastLoginAt:null,alumniProfile:{currentCompany:'Example'}}]},
    mentorshipRequest:grouped('mentorship',[{alumniId:'a',_count:{_all:2}}]),communityPost:grouped('posts',[{authorId:'a',_count:{_all:3}}]),communityComment:grouped('comments',[{authorId:'a',_count:{_all:4}}]),job:grouped('jobs'),event:grouped('events'),eventRegistration:grouped('attendance')};
  return {db,queries};
}
test('aggregates real counts, sorts before pagination and applies filters without modifying data',async()=>{
  const {db,queries}=mockDb();let received;
  const service=createDonationService(db,async records=>{received=records;return {model:{mode:'engagement_baseline'},predictions:records.map(r=>({id:r.id,score:r.completedMentorships*10,band:r.completedMentorships?'Medium':'Low',probability:null}))};});
  const result=await service({limit:1});
  assert.equal(result.predictions[0].id,'a');assert.equal(result.summary.total,2);assert.equal(result.pagination.totalPages,2);
  const a=received.find(r=>r.id==='a');assert.equal(a.communityContributions,7);assert.equal(a.daysSinceLogin,null);
  assert.equal(queries.find(([k])=>k==='mentorship')[1].where.status,'COMPLETED');
  assert.equal(queries.find(([k])=>k==='attendance')[1].where.status,'ATTENDED');
  assert.deepEqual(queries.find(([k])=>k==='jobs')[1].where.status.in,['ACTIVE','CLOSED']);
  assert.ok(queries.find(([k])=>k==='posts')[1].where.createdAt.gte instanceof Date);
  const filtered=await service({q:'Example',band:'Medium'});assert.equal(filtered.predictions.length,1);assert.equal(filtered.summary.total,2);
});
test('oversized population fails instead of producing partial rankings',async()=>{
  const service=createDonationService({user:{findMany:async()=>Array(5001).fill({id:'a'})}},()=>assert.fail('Must not predict partial population'));
  await assert.rejects(service(),/5,000/);
});
test('empty population needs no activity queries and prediction failures propagate',async()=>{
  const service=createDonationService({user:{findMany:async()=>[]}},async rows=>({predictions:[],model:{mode:'engagement_baseline'}}));
  assert.equal((await service()).summary.total,0);
  const {db}=mockDb();await assert.rejects(createDonationService(db,async()=>{throw new Error('runtime unavailable');})(),/runtime unavailable/);
});
