import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { jobService } from '../../services/jobService';
import CreateJobModal from '../../components/CreateJobModal';
import ApplyJobModal from '../../components/ApplyJobModal';
import ApplicantReviewModal from '../../components/ApplicantReviewModal';
import { PortalHero, PortalEmpty, PortalDialog } from '../../components/PortalUI';
import { collectPortalPages, safeExternalUrl } from './portalUtils';
import { Briefcase, MapPin, CalendarDays, Search, Plus, Users, RefreshCw, FileText, SlidersHorizontal, Edit3 } from 'lucide-react';

const TYPES = [['','All Jobs'],['INTERNSHIP','Internships'],['FULL_TIME','Full-time'],['PART_TIME','Part-time']];
const ALL_TYPES = ['FULL_TIME','PART_TIME','INTERNSHIP','CONTRACT','REMOTE'];
const STATUS = {PENDING:'Applied',REVIEWING:'Under Review',SHORTLISTED:'Shortlisted',INTERVIEW:'Interview Scheduled',SELECTED:'Selected',REJECTED:'Not Selected',WITHDRAWN:'Withdrawn'};
const fmt = date => date ? new Date(date).toLocaleDateString() : '';
const expired = job => job.status !== 'ACTIVE' || (job.deadline && new Date(job.deadline) < new Date());

export default function JobsPortalPage() {
  const { user } = useAuth(), { socket } = useSocket();
  const [params] = useSearchParams(), routeQuery = params.get('q') || '';
  const isStudent = user?.role === 'STUDENT', canPost = ['ALUMNI','ADMIN'].includes(user?.role);
  const [activeTab,setActiveTab] = useState('browse');
  const [jobs,setJobs] = useState([]), [allJobs,setAllJobs] = useState([]), [myJobs,setMyJobs] = useState([]), [applications,setApplications] = useState([]);
  const [loading,setLoading] = useState(true), [refreshing,setRefreshing] = useState(false), [error,setError] = useState('');
  const [search,setSearch] = useState(routeQuery), [query,setQuery] = useState(routeQuery), [type,setType] = useState(''), [location,setLocation] = useState('');
  const [company,setCompany] = useState(''), [skills,setSkills] = useState(''), [branch,setBranch] = useState(''), [workplace,setWorkplace] = useState(''), [ownStatus,setOwnStatus] = useState('');
  const [sort,setSort] = useState(isStudent ? 'match' : 'newest'), [more,setMore] = useState(false);
  const [create,setCreate] = useState(false), [editing,setEditing] = useState(null), [applying,setApplying] = useState(null), [reviewing,setReviewing] = useState(null), [detail,setDetail] = useState(null);
  const version = useRef(0), pending = useRef(new Set());
  const [busy,setBusy] = useState('');
  useEffect(() => {setSearch(routeQuery);setQuery(routeQuery);setActiveTab('browse');},[routeQuery]);
  useEffect(() => {const timer=setTimeout(() => setQuery(search),300);return () => clearTimeout(timer);},[search]);
  const fetchData = useCallback(async () => {
    const id=++version.current; setRefreshing(true);setError('');
    try {
      const filters={q:query || undefined,location:location || undefined,company:company || undefined,skills:skills || undefined,branch:branch || undefined,workplaceType:workplace || undefined};
      const [network, mine, apps] = await Promise.all([
        collectPortalPages(jobService.getActiveJobs,'jobs',filters),
        canPost ? collectPortalPages(jobService.getAlumniJobs,'jobs',{status:ownStatus || undefined}) : Promise.resolve([]),
        isStudent ? collectPortalPages(jobService.getStudentApplications,'applications') : Promise.resolve([]),
      ]);
      const typed = type ? await collectPortalPages(jobService.getActiveJobs,'jobs',{...filters,employmentType:type}) : network;
      if (id !== version.current) return;
      setAllJobs(network);setJobs(typed);setMyJobs(mine);setApplications(apps);
    } catch(err) {if(id===version.current)setError(err.response?.data?.message || err.message || 'Could not load opportunities.');}
    finally {if(id===version.current){setLoading(false);setRefreshing(false);}}
  },[query,type,location,company,skills,branch,workplace,ownStatus,canPost,isStudent]);
  useEffect(() => {fetchData();return () => {version.current++;};},[fetchData]);
  useEffect(() => {
    if(!socket)return;
    const names=['job:application:status:updated','job:application:received','job:application:submitted','job:application:withdrawn'];
    names.forEach(name => socket.on(name,fetchData));socket.on('connect',fetchData);
    return () => {names.forEach(name => socket.off(name,fetchData));socket.off('connect',fetchData);};
  },[socket,fetchData]);
  const reset = () => {setSearch('');setQuery('');setType('');setLocation('');setCompany('');setSkills('');setBranch('');setWorkplace('');setOwnStatus('');};
  const mutate = async (key, action, question) => {
    if(pending.current.has(key) || (question && !window.confirm(question)))return;
    pending.current.add(key);setBusy(key);setError('');
    try {await action();await fetchData();}catch(err){setError(err.response?.data?.message || 'Could not update the opportunity.');}
    finally {pending.current.delete(key);setBusy('');}
  };
  const applicationFor = job => applications.find(a => a.jobId===job.id) || (job.hasApplied ? job.application : null);
  const sorted = [...(activeTab==='my-jobs' ? myJobs : jobs)].sort((a,b) => sort==='match' ? (b.matchScore ?? -1)-(a.matchScore ?? -1) : new Date(b.createdAt)-new Date(a.createdAt));
  const openCreate = () => {setEditing(null);setCreate(true);};
  const renderJob = job => {
    const own=job.alumniId===user?.id, app=applicationFor(job), count=job.applicantCounts?.total ?? job.applicantCount ?? job._count?.applications;
    return <article className="portal-job-card" key={job.id}>
      <div className="portal-company-avatar" aria-hidden="true">{job.company?.trim().slice(0,2).toUpperCase() || '?'}</div>
      <div className="portal-job-copy"><h2>{job.title}</h2><p className="portal-company">{job.company}</p>
        <div className="portal-metadata"><span><MapPin size={14}/>{job.location}</span><span><Briefcase size={14}/>{job.employmentType?.replaceAll('_',' ')}</span><span><CalendarDays size={14}/>Posted {fmt(job.createdAt)}</span>{job.salary && <span>{job.salary}</span>}{job.workplaceType && <span>{job.workplaceType}</span>}</div>
        <div className="portal-skills">{job.skills?.slice(0,5).map(skill => <span key={skill}>{skill}</span>)}{job.skills?.length>5 && <span>+{job.skills.length-5}</span>}</div>
        {(job.minCgpa || job.minExperience || job.eligibleBranches?.length || job.deadline) && <div className="portal-metadata mt-3">{job.minCgpa && <span>Minimum CGPA: {String(job.minCgpa)}</span>}{job.minExperience>0 && <span>{job.minExperience}+ years experience</span>}{job.eligibleBranches?.length>0 && <span>Eligible: {job.eligibleBranches.join(', ')}</span>}{job.deadline && <span>Apply by {fmt(job.deadline)}</span>}</div>}
      </div>
      <div className="portal-job-aside"><span className={`portal-status ${expired(job) ? 'closed' : ''}`}>{job.status==='CLOSED' ? 'Closed' : job.status==='DRAFT' ? 'Draft' : expired(job) ? 'Deadline passed' : 'Active Opening'}</span>
        {isStudent && job.matchScore!=null && <span className="portal-status neutral">{Math.round(job.matchScore)}% Skill Match</span>}
        <div className="portal-actions"><button className="portal-primary" onClick={() => setDetail(job)}>View Details →</button>
          {isStudent && (app ? <span className="portal-status neutral">{STATUS[app.status] || app.status}</span> : <button className="portal-secondary" disabled={expired(job) || job.isEligible===false} onClick={() => setApplying(job)}>{job.isEligible===false ? 'Not eligible' : 'Apply'}</button>)}
          {canPost && own && <><button className="portal-secondary" onClick={() => {setEditing(job);setCreate(true);}} aria-label={`Edit ${job.title}`}><Edit3 size={14}/>Edit Job</button><button className="portal-secondary" onClick={() => setReviewing(job)}>View Applicants</button>{job.status==='ACTIVE' && <button className="portal-secondary" disabled={busy===job.id} onClick={() => mutate(job.id,()=>jobService.closeJob(job.id),'Close this opening? New applications will be disabled.')}>Close Job</button>}<button className="portal-danger" disabled={busy===job.id} onClick={() => mutate(job.id,()=>jobService.deleteJob(job.id),'Permanently delete this job posting?')}>Delete</button></>}
        </div>{own && count!=null && <span className="portal-count"><Users size={14}/>{count} Applicants</span>}
      </div>
    </article>;
  };
  return <div className="portal-page jobs-page">
    <PortalHero />
    <div className="portal-toolbar"><div className="portal-tabs"><button aria-pressed={activeTab==='browse'} onClick={() => setActiveTab('browse')}>Browse Jobs</button>{canPost && <button aria-pressed={activeTab==='my-jobs'} onClick={() => setActiveTab('my-jobs')}>My Posted Jobs ({myJobs.length})</button>}{isStudent && <button aria-pressed={activeTab==='applications'} onClick={() => setActiveTab('applications')}>My Applications ({applications.length})</button>}</div><div className="portal-actions">{canPost && <button className="portal-primary" onClick={openCreate}><Plus size={15}/>Post New Opportunity</button>}<button className="portal-secondary" aria-label="Refresh jobs" disabled={refreshing} onClick={fetchData}><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/></button></div></div>
    {activeTab==='browse' && <><div className="portal-category-tabs">{TYPES.map(([value,label]) => <button key={value} aria-pressed={type===value} onClick={() => setType(value)}>{label} ({loading ? '…' : value ? allJobs.filter(j=>j.employmentType===value).length : allJobs.length})</button>)}</div>
      <div className="portal-filters"><div className="portal-search"><Search size={16}/><input aria-label="Search jobs" placeholder="Search by job title or company…" value={search} onChange={e=>setSearch(e.target.value)}/></div><input aria-label="Filter jobs by location" placeholder="All Locations" value={location} onChange={e=>setLocation(e.target.value)}/><select aria-label="Employment type" value={type} onChange={e=>setType(e.target.value)}><option value="">All Types</option>{ALL_TYPES.map(t=><option key={t}>{t}</option>)}</select><button className="portal-secondary" aria-expanded={more} onClick={()=>setMore(!more)}><SlidersHorizontal size={14}/>More Filters</button><button className="portal-secondary" onClick={reset}>Reset</button>
        {more && <div className="portal-more-filters"><label>Company<input value={company} onChange={e=>setCompany(e.target.value)}/></label><label>Skills (comma separated)<input value={skills} onChange={e=>setSkills(e.target.value)}/></label><label>Eligible Branch<input value={branch} onChange={e=>setBranch(e.target.value)}/></label><label>Workplace<select value={workplace} onChange={e=>setWorkplace(e.target.value)}><option value="">All workplaces</option>{['On-site','Remote','Hybrid'].map(t=><option key={t}>{t}</option>)}</select></label></div>}
      </div></>}
    {activeTab==='my-jobs' && <div className="portal-filters"><select aria-label="Posted job status" value={ownStatus} onChange={e=>setOwnStatus(e.target.value)}><option value="">All Statuses</option>{['ACTIVE','CLOSED','DRAFT'].map(t=><option key={t}>{t}</option>)}</select></div>}
    {error && <div role="alert" className="portal-error">{error}<button onClick={fetchData} className="portal-secondary">Retry</button></div>}
    {loading ? <div role="status" className="portal-loading">Loading opportunities…</div> : error && !jobs.length && !myJobs.length && !applications.length ? null : activeTab==='applications' ? <div className="portal-job-list">{applications.length===0 ? <PortalEmpty title="No applications yet">Browse opportunities and track your applications here.</PortalEmpty> : applications.map(app=><article key={app.id} className="portal-job-card"><div className="portal-job-copy"><span className="portal-status neutral">{STATUS[app.status] || app.status}</span><h2 className="mt-3">{app.job?.title}</h2><p className="portal-company">{app.job?.company}</p><div className="portal-metadata"><span>Applied {fmt(app.createdAt)}</span><span>{app.job?.location}</span>{app.interviewDate && <span>Interview: {new Date(app.interviewDate).toLocaleString()}</span>}</div>{app.reviewNotes && <p className="text-sm mt-3">Recruiter note: {app.reviewNotes}</p>}</div><div className="portal-actions">{safeExternalUrl(app.resumeUrl) && <a className="portal-secondary" href={safeExternalUrl(app.resumeUrl)} target="_blank" rel="noopener noreferrer"><FileText size={14}/>Resume</a>}{app.status==='PENDING' && <button className="portal-danger" disabled={busy===app.id} onClick={()=>mutate(app.id,()=>jobService.withdrawApplication(app.id),'Withdraw this application?')}>Withdraw</button>}</div></article>)}</div> : <><div className="portal-result-summary">{sorted.length} {activeTab==='my-jobs' ? 'posted opportunities' : 'matching opportunities'}<select className="ml-3" aria-label="Sort jobs" value={sort} onChange={e=>setSort(e.target.value)}>{isStudent && <option value="match">Highest match</option>}<option value="newest">Newest first</option></select></div><div className="portal-job-list">{sorted.length ? sorted.map(renderJob) : <PortalEmpty title={activeTab==='my-jobs' ? 'No posted opportunities yet' : 'No matching opportunities'} onReset={activeTab==='browse' ? reset : undefined}>{activeTab==='my-jobs' ? 'Share an opening at your company with the alumni network.' : 'Try clearing filters, or check back for new openings.'}</PortalEmpty>}</div></>}
    <section className="portal-quick"><h2><Briefcase size={16}/>Quick Actions</h2><div className="portal-actions">{canPost ? <><button className="portal-secondary" onClick={()=>setActiveTab('my-jobs')}>My Posted Jobs</button><button className="portal-secondary" onClick={openCreate}>Post New Opportunity</button><button className="portal-secondary" onClick={()=>{setActiveTab('my-jobs');if(myJobs.length===1)setReviewing(myJobs[0]);}}>Review Applicants</button><button className="portal-secondary" onClick={()=>{setOwnStatus('ACTIVE');setActiveTab('my-jobs');}}>Manage Active Opportunities</button></> : <><button className="portal-secondary" onClick={()=>setActiveTab('browse')}>Browse Jobs</button>{isStudent && <button className="portal-secondary" onClick={()=>setActiveTab('applications')}>My Applications</button>}</>}</div></section>
    {create && <CreateJobModal job={editing} onClose={()=>{setCreate(false);setEditing(null);}} onSuccess={fetchData}/>}
    {applying && <ApplyJobModal job={applying} onClose={()=>setApplying(null)} onSuccess={fetchData}/>}
    {reviewing && <ApplicantReviewModal job={reviewing} onClose={()=>setReviewing(null)} onStatusChange={fetchData}/>}
    {detail && <PortalDialog title={detail.title} onClose={()=>setDetail(null)}><p className="portal-company">{detail.company} · {detail.location}</p><div className="portal-metadata"><span>{detail.employmentType?.replaceAll('_',' ')}</span>{detail.salary && <span>{detail.salary}</span>}{detail.deadline && <span>Deadline {fmt(detail.deadline)}</span>}</div><p className="portal-details-description">{detail.description}</p>{detail.requirements && <><h3>Requirements</h3><p className="portal-details-description">{detail.requirements}</p></>}<div className="portal-skills">{detail.skills?.map(s=><span key={s}>{s}</span>)}</div><p className="mt-4">{detail.minCgpa && `Minimum CGPA: ${detail.minCgpa}. `}{detail.eligibleBranches?.length>0 && `Eligible branches: ${detail.eligibleBranches.join(', ')}.`}</p>{isStudent && detail.isEligible===false && <p>{detail.eligibilityReasons?.join(' · ')}</p>}<div className="portal-actions">{safeExternalUrl(detail.externalApplyUrl) && <a className="portal-secondary" href={safeExternalUrl(detail.externalApplyUrl)} target="_blank" rel="noopener noreferrer">External Careers Portal</a>}{isStudent && !applicationFor(detail) && <button className="portal-primary" disabled={expired(detail) || detail.isEligible===false} onClick={()=>{setApplying(detail);setDetail(null);}}>Apply Now</button>}<button className="portal-secondary" onClick={()=>setDetail(null)}>Close</button></div></PortalDialog>}
  </div>;
}
