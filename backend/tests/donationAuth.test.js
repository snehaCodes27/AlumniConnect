const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const jwt=require('jsonwebtoken');
const config=require('../src/config/env');
const service=require('../src/services/donationPrediction.service');
let calls=0;
service.getPredictions=async()=>{calls++;return {predictions:[],model:{mode:'engagement_baseline'}};};
const router=require('../src/routes/donationPrediction.routes');
test('prediction API requires Admin and validates parameters before querying',async t=>{
  const app=express();app.use('/donations',router);
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}/donations/predictions`;
  assert.equal((await fetch(url)).status,401);
  for(const role of ['ALUMNI','STUDENT']) {
    const token=jwt.sign({userId:'test-only',role},config.jwtSecret,{expiresIn:'1m'});
    assert.equal((await fetch(url,{headers:{Authorization:`Bearer ${token}`}})).status,403);
  }
  assert.equal(calls,0);
  const token=jwt.sign({userId:'test-only',role:'ADMIN'},config.jwtSecret,{expiresIn:'1m'});
  const options={headers:{Authorization:`Bearer ${token}`}};
  for(const query of ['?limit=51','?page=-1','?band=Unknown','?q[x]=1']) assert.equal((await fetch(url+query,options)).status,400);
  assert.equal(calls,0);
  assert.equal((await fetch(url,options)).status,200);assert.equal(calls,1);
  const exportUrl=url.replace('predictions','snapshots.csv');
  assert.equal((await fetch(exportUrl)).status,401);
  const alumniToken=jwt.sign({userId:'test-only',role:'ALUMNI'},config.jwtSecret,{expiresIn:'1m'});
  assert.equal((await fetch(exportUrl,{headers:{Authorization:`Bearer ${alumniToken}`}})).status,403);
  const csv=await fetch(exportUrl,options);assert.equal(csv.status,200);
  assert.match(csv.headers.get('content-type'),/text\/csv/);assert.match(await csv.text(),/alumniId,snapshotDate.*donatedWithin90Days/);
});
