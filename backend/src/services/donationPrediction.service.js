const { spawn } = require('node:child_process');
const path = require('node:path');
const prisma = require('../config/prisma');
const SCRIPT = path.resolve(__dirname, '../../../ai-service/app/services/donation_prediction.py');
const DAY = 86400000;

function runPrediction(records) {
  return new Promise((resolve, reject) => {
    const args = [SCRIPT];
    if (process.env.DONATION_MODEL_PATH) args.push('--model', path.resolve(process.env.DONATION_MODEL_PATH));
    const child = spawn(process.env.DONATION_PYTHON || 'python', args, { windowsHide:true, shell:false, stdio:['pipe','pipe','pipe'] });
    let output = '', settled = false;
    const finish = (err, result) => { if (settled) return; settled = true; clearTimeout(timer); err ? reject(err) : resolve(result); };
    const timer = setTimeout(() => { child.kill(); finish(new Error('Donation prediction timed out.')); }, 15000);
    child.stdout.on('data', chunk => { output += chunk; if (output.length > 4000000) { child.kill(); finish(new Error('Prediction output limit exceeded.')); } });
    child.stderr.on('data', () => {});
    child.on('error', () => finish(new Error('Prediction runtime unavailable. Configure DONATION_PYTHON with a Python executable.')));
    child.stdin.on('error', () => {});
    child.on('close', code => {
      if (code !== 0) return finish(new Error('Donation prediction failed. Check the Python runtime or configured model artifact.'));
      try { const result = JSON.parse(output); if (!Array.isArray(result.predictions) || !result.model) throw new Error(); finish(null, result); }
      catch { finish(new Error('Prediction service returned an invalid response.')); }
    });
    child.stdin.end(JSON.stringify({ records }));
  });
}
function countMap(rows, key) { return new Map(rows.map(row => [row[key], row._count._all])); }
function createDonationService(db = prisma, predictor = runPrediction) {
  return async function getPredictions({ q='', band='', page=1, limit=20 } = {}) {
    const now = new Date(), since = new Date(now.getTime()-90*DAY);
    // Bound the workload; fail explicitly rather than silently ranking a subset.
    const users = await db.user.findMany({where:{role:'ALUMNI'},take:5001,orderBy:{id:'asc'},select:{id:true,firstName:true,lastName:true,lastLoginAt:true,alumniProfile:{select:{currentCompany:true,jobRole:true}}}});
    if (users.length > 5000) throw new Error('Prediction population exceeds 5,000 alumni. Batch prediction is required.');
    const ids = users.map(u => u.id);
    const records = [];
    if (ids.length) {
      const [mentorships, posts, comments, jobs, events, attendance] = await Promise.all([
        db.mentorshipRequest.groupBy({by:['alumniId'],where:{alumniId:{in:ids},status:'COMPLETED',updatedAt:{gte:since,lte:now}},_count:{_all:true}}),
        db.communityPost.groupBy({by:['authorId'],where:{authorId:{in:ids},status:'ACTIVE',createdAt:{gte:since,lte:now}},_count:{_all:true}}),
        db.communityComment.groupBy({by:['authorId'],where:{authorId:{in:ids},createdAt:{gte:since,lte:now},post:{status:'ACTIVE'}},_count:{_all:true}}),
        db.job.groupBy({by:['alumniId'],where:{alumniId:{in:ids},status:{in:['ACTIVE','CLOSED']},createdAt:{gte:since,lte:now}},_count:{_all:true}}),
        db.event.groupBy({by:['creatorId'],where:{creatorId:{in:ids},status:{in:['PUBLISHED','COMPLETED']},createdAt:{gte:since,lte:now}},_count:{_all:true}}),
        db.eventRegistration.groupBy({by:['userId'],where:{userId:{in:ids},status:'ATTENDED',event:{startDate:{gte:since,lte:now},status:{in:['PUBLISHED','COMPLETED']}}},_count:{_all:true}}),
      ]);
      const maps = [countMap(mentorships,'alumniId'),countMap(posts,'authorId'),countMap(comments,'authorId'),countMap(jobs,'alumniId'),countMap(events,'creatorId'),countMap(attendance,'userId')];
      for (const u of users) records.push({id:u.id,completedMentorships:maps[0].get(u.id)||0,communityContributions:(maps[1].get(u.id)||0)+(maps[2].get(u.id)||0),postedJobs:maps[3].get(u.id)||0,hostedEvents:maps[4].get(u.id)||0,attendedEvents:maps[5].get(u.id)||0,daysSinceLogin:u.lastLoginAt ? Math.max(0,(now-new Date(u.lastLoginAt))/DAY) : null});
    }
    const result = await predictor(records);
    const byId = new Map(users.map(u => [u.id,u]));
    const featureById = new Map(records.map(r => [r.id,r]));
    const all = result.predictions.map(p => {
      const u = byId.get(p.id);
      return {...p,firstName:u.firstName,lastName:u.lastName,company:u.alumniProfile?.currentCompany||null,jobRole:u.alumniProfile?.jobRole||null,features:featureById.get(p.id)};
    }).sort((a,b) => b.score-a.score || a.id.localeCompare(b.id));
    const summary = {total:all.length,High:0,Medium:0,Low:0};
    all.forEach(p => summary[p.band]++);
    const query = q.trim().toLowerCase();
    const filtered = all.filter(p => (!band || p.band===band) && (!query || `${p.firstName} ${p.lastName} ${p.company||''}`.toLowerCase().includes(query)));
    return { predictions:filtered.slice((page-1)*limit,page*limit), model:result.model, summary,
      pagination:{page,limit,total:filtered.length,totalPages:Math.max(1,Math.ceil(filtered.length/limit))},
      generatedAt:now.toISOString(), featuresSince:since.toISOString(),
      scoreMeaning:result.model.mode==='trained_model' ? 'Estimated likelihood of donating within 90 days, from the configured historical-outcome model.' : 'Engagement readiness index (0–100); this is not a likelihood of donating.' };
  };
}
module.exports = { getPredictions:createDonationService(), createDonationService, runPrediction };
