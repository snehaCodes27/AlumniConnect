const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

// All admin routes require valid JWT token and ADMIN role
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

// ── User management ────────────────────────────────────────────────────
router.get('/users/pending', adminController.getPendingUsers);
router.patch('/users/:id/approve', adminController.approveUser);
router.patch('/users/:id/reject', adminController.rejectUser);

// ── Dashboard analytics ────────────────────────────────────────────────
router.get('/dashboard/summary', adminController.getDashboardSummary);
router.get('/dashboard/kpi', adminController.getKpiStats);
router.get('/dashboard/activity', adminController.getRecentActivity);
router.get('/dashboard/events/upcoming', adminController.getUpcomingEvents);
router.get('/dashboard/companies/top', adminController.getTopCompanies);

const management = require('../services/adminManagement.service');
function queryParams(req) {
  const {q='',status='',page='1',limit='8'}=req.query;
  if(typeof q!=='string'||q.length>200||typeof status!=='string'||!/^\d+$/.test(String(page))||!/^\d+$/.test(String(limit))||!Number.isSafeInteger(Number(page))||Number(page)>1000000||Number(page)<1||Number(limit)<1||Number(limit)>50) {const e=new Error('Invalid list parameters.');e.statusCode=400;throw e;}
  return {q,status,page:Number(page),limit:Number(limit)};
}
router.get('/resources/:resource',async(req,res,next)=>{try{res.json({success:true,data:await management.listResource(req.params.resource,queryParams(req))});}catch(e){next(e);}});
router.patch('/resources/:resource/:id/status',async(req,res,next)=>{try{res.json({success:true,data:await management.updateResourceStatus(req.params.resource,req.params.id,req.body.status,req.user.userId)});}catch(e){next(e);}});
router.get('/companies',async(req,res,next)=>{try{res.json({success:true,data:await management.companies(queryParams(req))});}catch(e){next(e);}});
router.get('/settings',async(req,res,next)=>{try{res.json({success:true,data:await management.settings()});}catch(e){next(e);}});
module.exports = router;
