const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const { getPredictions } = require('../services/donationPrediction.service');
const router = express.Router();
router.use(authenticateToken, authorizeRoles('ADMIN'));
router.get('/predictions', async (req, res, next) => {
  const { q='', band='', page='1', limit='20' } = req.query;
  if (typeof q !== 'string' || q.length > 200 || typeof band !== 'string' || !['','High','Medium','Low'].includes(band) || !/^\d+$/.test(String(page)) || !/^\d+$/.test(String(limit)) || Number(page)<1 || Number(page)>10000 || Number(limit)<1 || Number(limit)>50) {
    return res.status(400).json({success:false,message:'Invalid prediction search, band or pagination.'});
  }
  try { res.json({success:true,data:await getPredictions({q,band,page:Number(page),limit:Number(limit)})}); }
  catch (error) { next(error); }
});
// Download real feature snapshots; outcomes intentionally remain blank until observed.
router.get('/snapshots.csv', async (req, res, next) => {
  try {
    const data = await getPredictions({limit:5000});
    const keys = ['completedMentorships','communityContributions','hostedEvents','postedJobs','attendedEvents','daysSinceLogin'];
    const csv = value => '"' + String(value ?? '').replaceAll('"','""') + '"';
    const rows = [['alumniId','snapshotDate',...keys,'donatedWithin90Days'].join(',')];
    for (const person of data.predictions) rows.push([person.id,data.generatedAt,...keys.map(key=>person.features[key]),''].map(csv).join(','));
    res.set('Content-Disposition','attachment; filename="donation-engagement-snapshots.csv"');
    res.type('text/csv').send(rows.join('\r\n'));
  } catch(error) { next(error); }
});
module.exports = router;
