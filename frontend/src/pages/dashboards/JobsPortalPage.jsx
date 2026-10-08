import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { jobService } from '../../services/jobService';
import NotificationDropdown from '../../components/NotificationDropdown';
import CreateJobModal from '../../components/CreateJobModal';
import ApplyJobModal from '../../components/ApplyJobModal';
import ApplicantReviewModal from '../../components/ApplicantReviewModal';
import {
  Briefcase,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  GraduationCap,
  Sparkles,
  Search,
  Filter,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronRight,
  RefreshCw,
  Eye,
  FileText,
  AlertCircle,
  BadgeCheck,
  TrendingUp,
  Award,
  Trash2,
  Edit3,
  ExternalLink,
  Ban,
  ArrowLeft
} from 'lucide-react';

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'REMOTE'];

const STATUS_BADGES = {
  PENDING: { label: 'Applied', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
  REVIEWING: { label: 'Under Review', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Eye },
  SHORTLISTED: { label: 'Shortlisted ⭐', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: BadgeCheck },
  INTERVIEW: { label: 'Interview Scheduled 📅', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: Calendar },
  SELECTED: { label: 'Offered / Selected 🎉', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 },
  REJECTED: { label: 'Not Selected', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-slate-100 text-slate-600 border-slate-300', icon: Ban },
};

export default function JobsPortalPage() {
  const { user, socket } = useAuth();
  const navigate = useNavigate();

  const isAlumni = user?.role === 'ALUMNI';
  const isStudent = user?.role === 'STUDENT';

  // Active view tab: for Student: 'browse' | 'applications'; for Alumni: 'my-jobs' | 'browse'
  const [activeTab, setActiveTab] = useState(isAlumni ? 'my-jobs' : 'browse');

  // Job List State
  const [jobs, setJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [sortBy, setSortBy] = useState('match'); // 'match' | 'newest' | 'salary'

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [applyingJob, setApplyingJob] = useState(null);
  const [reviewingJob, setReviewingJob] = useState(null);

  // Detailed view modal state
  const [selectedJobDetail, setSelectedJobDetail] = useState(null);

  // Load Data
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      if (isStudent || activeTab === 'browse') {
        const jobsRes = await jobService.getActiveJobs({
          q: search || undefined,
          employmentType: typeFilter || undefined,
          location: locationFilter || undefined,
        });
        // Backend: { success, data: { jobs, pagination } }
        let fetchedJobs = jobsRes?.data?.jobs || jobsRes?.jobs || [];

        if (sortBy === 'match') {
          fetchedJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        } else if (sortBy === 'salary') {
          fetchedJobs.sort((a, b) => (b.salaryMax || b.salaryMin || 0) - (a.salaryMax || a.salaryMin || 0));
        } else {
          fetchedJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        setJobs(fetchedJobs);
      }

      if (isStudent) {
        const appsRes = await jobService.getStudentApplications();
        // Backend: { success, data: { applications, pagination } }
        setApplications(appsRes?.data?.applications || appsRes?.applications || []);
      }

      if (isAlumni) {
        const myJobsRes = await jobService.getAlumniJobs();
        // Backend: { success, data: { jobs, pagination } }
        setMyJobs(myJobsRes?.data?.jobs || myJobsRes?.jobs || []);
      }
    } catch (err) {
      console.error('Error fetching jobs data:', err);
      setError(err.response?.data?.message || 'Failed to load jobs data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStudent, isAlumni, activeTab, search, typeFilter, locationFilter, minSalary, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time Socket.IO Listeners
  useEffect(() => {
    if (!socket) return;

    const handleApplicationUpdate = (data) => {
      fetchData();
    };

    const handleNewApplication = (data) => {
      fetchData();
    };

    socket.on('job:application:status:updated', handleApplicationUpdate);
    socket.on('job:application:received', handleNewApplication);

    return () => {
      socket.off('job:application:status:updated', handleApplicationUpdate);
      socket.off('job:application:received', handleNewApplication);
    };
  }, [socket, fetchData]);

  // Actions
  const handleCloseJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to close this job opening? New applications will be disabled.')) return;
    try {
      await jobService.closeJob(jobId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close job.');
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job posting permanently?')) return;
    try {
      await jobService.deleteJob(jobId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete job.');
    }
  };

  const handleWithdrawApplication = async (applicationId) => {
    if (!window.confirm('Are you sure you want to withdraw your job application?')) return;
    try {
      await jobService.withdrawApplication(applicationId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to withdraw application.');
    }
  };

  // Check if student applied to a specific job
  const getStudentApplicationForJob = (jobId) => {
    return applications.find((app) => app.jobId === jobId);
  };

  const dashboardPath = user?.role === 'ADMIN' ? '/admin/dashboard' : user?.role === 'ALUMNI' ? '/alumni/dashboard' : '/student/dashboard';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={dashboardPath}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Career & Jobs Hub
                </h1>
                <p className="text-xs text-slate-400">Discover exclusive alumni job openings & career opportunities</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationDropdown />

            {isAlumni && (
              <button
                onClick={() => {
                  setEditingJob(null);
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 text-sm"
              >
                <Plus className="w-4 h-4" />
                Post New Opportunity
              </button>
            )}

            <button
              onClick={fetchData}
              disabled={refreshing}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-slate-800 p-6 sm:p-8 mb-8 shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Direct Alumni Referrals & Hiring
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {isStudent ? 'Unlock Top Opportunities Matched to Your Skills' : 'Hire Promising Talent from Your Alma Mater'}
            </h2>
            <p className="text-sm text-slate-300">
              {isStudent
                ? 'Apply directly to verified alumni job postings, get instant match compatibility scores, and track application status in real-time.'
                : 'Create full-time roles or internships, set eligibility constraints, review match scores, and invite candidates for interviews.'}
            </p>
          </div>

          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none pr-8 hidden md:block">
            <Building2 className="w-64 h-64 text-indigo-400" />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            {isStudent && (
              <>
                <button
                  onClick={() => setActiveTab('browse')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                    activeTab === 'browse'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Browse Openings ({jobs.length})
                </button>
                <button
                  onClick={() => setActiveTab('applications')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                    activeTab === 'applications'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  My Applications ({applications.length})
                </button>
              </>
            )}

            {isAlumni && (
              <>
                <button
                  onClick={() => setActiveTab('my-jobs')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                    activeTab === 'my-jobs'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  My Posted Jobs ({myJobs.length})
                </button>
                <button
                  onClick={() => setActiveTab('browse')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                    activeTab === 'browse'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Network Job Directory ({jobs.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters Bar (Shown in 'browse' tab) */}
        {activeTab === 'browse' && (
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700/60 p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Title, company, or skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Employment Types</option>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <input
                type="text"
                placeholder="Location (e.g. Remote, NY)"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <input
                type="number"
                placeholder="Min Salary ($)"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="match">Sort: Highest Match Score</option>
                <option value="newest">Sort: Most Recent</option>
                <option value="salary">Sort: Highest Salary</option>
              </select>
            </div>
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-slate-400 text-sm">Loading jobs & opportunities...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-900/20 border border-red-800/50 rounded-2xl text-center text-red-300">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* 1. STUDENT/NETWORK BROWSE JOBS TAB */}
            {activeTab === 'browse' && (
              <div>
                {jobs.length === 0 ? (
                  <div className="text-center py-16 bg-slate-800/40 rounded-2xl border border-slate-800">
                    <Briefcase className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-300">No Job Openings Found</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                      Try resetting filters or checking back later when alumni post new opportunities.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map((job) => {
                      const app = getStudentApplicationForJob(job.id);
                      const isExpired = job.deadline && new Date(job.deadline) < new Date();
                      const matchScore = job.matchScore || 0;

                      return (
                        <div
                          key={job.id}
                          className="bg-slate-800/70 hover:bg-slate-800 rounded-2xl border border-slate-700/60 hover:border-indigo-500/50 p-6 flex flex-col justify-between transition group relative shadow-lg"
                        >
                          <div>
                            {/* Match score badge (for student) */}
                            {isStudent && (
                              <div className="flex items-center justify-between mb-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    matchScore >= 75
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : matchScore >= 40
                                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                      : 'bg-slate-700 text-slate-300'
                                  }`}
                                >
                                  <Sparkles className="w-3 h-3" />
                                  {matchScore}% Skill Match
                                </span>

                                {job.status === 'CLOSED' || isExpired ? (
                                  <span className="px-2 py-0.5 rounded text-xs bg-red-900/40 text-red-400 border border-red-800">
                                    Closed
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-800">
                                    Active
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Job Title & Company */}
                            <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition mb-1">
                              {job.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-300 font-medium mb-4">
                              <Building2 className="w-4 h-4 text-indigo-400" />
                              <span>{job.company}</span>
                            </div>

                            {/* Details pills */}
                            <div className="flex flex-wrap gap-2 text-xs text-slate-400 mb-4">
                              <span className="inline-flex items-center gap-1 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700">
                                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                {job.employmentType.replace('_', ' ')}
                              </span>
                              <span className="inline-flex items-center gap-1 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {job.location}
                              </span>
                              {(job.salaryMin || job.salaryMax) && (
                                <span className="inline-flex items-center gap-1 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700 text-emerald-400">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  {job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : ''}
                                  {job.salaryMin && job.salaryMax ? ' - ' : ''}
                                  {job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : ''}
                                </span>
                              )}
                            </div>

                            {/* Eligibility preview */}
                            {(job.eligibilityBranch?.length > 0 || job.eligibilityCgpa) && (
                              <div className="text-xs bg-slate-900/40 p-2.5 rounded-xl border border-slate-700/40 mb-4 space-y-1 text-slate-400">
                                {job.eligibilityCgpa > 0 && (
                                  <div>
                                    <span className="text-slate-300 font-medium">Min CGPA:</span> {job.eligibilityCgpa}
                                  </div>
                                )}
                                {job.eligibilityBranch?.length > 0 && (
                                  <div className="truncate">
                                    <span className="text-slate-300 font-medium">Branches:</span>{' '}
                                    {job.eligibilityBranch.join(', ')}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Skills required */}
                            {job.skillsRequired?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-4">
                                {job.skillsRequired.slice(0, 4).map((skill, idx) => (
                                  <span key={idx} className="bg-indigo-950/60 text-indigo-300 text-xs px-2 py-0.5 rounded-md border border-indigo-800/40">
                                    {skill}
                                  </span>
                                ))}
                                {job.skillsRequired.length > 4 && (
                                  <span className="text-slate-500 text-xs py-0.5">
                                    +{job.skillsRequired.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Alumni Poster Info */}
                            {job.postedBy && (
                              <div className="flex items-center gap-2 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
                                <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300">
                                  {job.postedBy.name?.charAt(0) || 'A'}
                                </div>
                                <span className="truncate">Posted by {job.postedBy.name}</span>
                              </div>
                            )}
                          </div>

                          {/* Card Footer Actions */}
                          <div className="mt-6 pt-3 border-t border-slate-700/50 flex items-center gap-2">
                            <button
                              onClick={() => setSelectedJobDetail(job)}
                              className="flex-1 py-2 px-3 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition text-center"
                            >
                              View Details
                            </button>

                            {isStudent && (
                              app ? (
                                <div className="px-3 py-2 bg-slate-900 border border-indigo-500/40 rounded-xl text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  {STATUS_BADGES[app.status]?.label || app.status}
                                </div>
                              ) : (
                                <button
                                  disabled={job.status === 'CLOSED' || isExpired}
                                  onClick={() => setApplyingJob(job)}
                                  className="flex-1 py-2 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition text-center shadow-md shadow-indigo-600/20"
                                >
                                  {job.status === 'CLOSED' || isExpired ? 'Closed' : 'Apply Now'}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. STUDENT MY APPLICATIONS TAB */}
            {activeTab === 'applications' && isStudent && (
              <div>
                {applications.length === 0 ? (
                  <div className="text-center py-16 bg-slate-800/40 rounded-2xl border border-slate-800">
                    <FileText className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-300">No Job Applications Yet</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                      Explore active openings in the Browse tab and apply to get referral opportunities.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app) => {
                      const statusInfo = STATUS_BADGES[app.status] || STATUS_BADGES.PENDING;
                      const StatusIcon = statusInfo.icon;

                      return (
                        <div
                          key={app.id}
                          className="bg-slate-800/70 hover:bg-slate-800 rounded-2xl border border-slate-700/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}
                              >
                                <StatusIcon className="w-3.5 h-3.5" />
                                {statusInfo.label}
                              </span>
                              <span className="text-xs text-slate-400">
                                Applied on {new Date(app.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1">{app.job?.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-slate-300 mb-3">
                              <span className="flex items-center gap-1 font-medium">
                                <Building2 className="w-4 h-4 text-indigo-400" />
                                {app.job?.company}
                              </span>
                              <span className="flex items-center gap-1 text-slate-400">
                                <MapPin className="w-4 h-4" />
                                {app.job?.location}
                              </span>
                            </div>

                            {/* Interview Details if scheduled */}
                            {app.interviewDate && (
                              <div className="p-3 bg-indigo-950/60 border border-indigo-800/60 rounded-xl text-xs text-indigo-200 mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                <div>
                                  <span className="font-semibold">Scheduled Interview:</span>{' '}
                                  {new Date(app.interviewDate).toLocaleString()}
                                </div>
                              </div>
                            )}

                            {/* Reviewer notes */}
                            {app.reviewNotes && (
                              <div className="p-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-xs text-slate-300">
                                <span className="font-semibold text-slate-400">Recruiter Note:</span> "{app.reviewNotes}"
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 self-start md:self-center">
                            {app.resumeUrl && (
                              <a
                                href={app.resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl text-xs font-medium text-slate-300 flex items-center gap-1.5 transition"
                              >
                                <FileText className="w-4 h-4 text-indigo-400" /> Resume
                              </a>
                            )}

                            {app.status === 'PENDING' && (
                              <button
                                onClick={() => handleWithdrawApplication(app.id)}
                                className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 rounded-xl text-xs font-medium transition"
                              >
                                Withdraw
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. ALUMNI MY POSTED JOBS TAB */}
            {activeTab === 'my-jobs' && isAlumni && (
              <div>
                {myJobs.length === 0 ? (
                  <div className="text-center py-16 bg-slate-800/40 rounded-2xl border border-slate-800">
                    <Briefcase className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-300">You Haven't Posted Any Jobs Yet</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
                      Share job openings at your company to mentor and hire top students from your alma mater.
                    </p>
                    <button
                      onClick={() => {
                        setEditingJob(null);
                        setShowCreateModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 hover:opacity-90 transition text-sm"
                    >
                      <Plus className="w-4 h-4" /> Post Your First Opening
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myJobs.map((job) => {
                      const isClosed = job.status === 'CLOSED';
                      const applicantCount = job.applicantCount || job._count?.applications || 0;

                      return (
                        <div
                          key={job.id}
                          className="bg-slate-800/70 hover:bg-slate-800 rounded-2xl border border-slate-700/60 p-6 transition flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {isClosed ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950/60 text-red-400 border border-red-800">
                                  Closed
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                                  Active Opening
                                </span>
                              )}
                              <span className="text-xs text-slate-400">
                                Posted on {new Date(job.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1">{job.title}</h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 mb-3">
                              <span className="font-medium flex items-center gap-1">
                                <Building2 className="w-4 h-4 text-indigo-400" /> {job.company}
                              </span>
                              <span className="flex items-center gap-1 text-slate-400">
                                <MapPin className="w-4 h-4" /> {job.location}
                              </span>
                              <span className="flex items-center gap-1 text-slate-400">
                                <Clock className="w-4 h-4" /> {job.employmentType.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Candidate count pill */}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 rounded-xl border border-indigo-500/30 text-xs text-indigo-300 font-semibold">
                              <Users className="w-4 h-4 text-indigo-400" />
                              <span>{applicantCount} Total Applicants</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => setReviewingJob(job)}
                              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                            >
                              <Users className="w-4 h-4" />
                              Review Applicants ({applicantCount})
                            </button>

                            <button
                              onClick={() => {
                                setEditingJob(job);
                                setShowCreateModal(true);
                              }}
                              className="p-2 bg-slate-900 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
                              title="Edit Job"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {!isClosed && (
                              <button
                                onClick={() => handleCloseJob(job.id)}
                                className="px-3 py-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800 text-amber-300 rounded-xl text-xs font-medium transition"
                              >
                                Close Job
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              className="p-2 bg-red-950/30 hover:bg-red-900/50 text-red-400 rounded-xl border border-red-800 transition"
                              title="Delete Job"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALS */}
      {/* 1. Create / Edit Job Modal */}
      {showCreateModal && (
        <CreateJobModal
          job={editingJob}
          onClose={() => {
            setShowCreateModal(false);
            setEditingJob(null);
          }}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* 2. Apply Job Modal */}
      {applyingJob && (
        <ApplyJobModal
          job={applyingJob}
          onClose={() => setApplyingJob(null)}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* 3. Applicant Review Modal */}
      {reviewingJob && (
        <ApplicantReviewModal
          job={reviewingJob}
          onClose={() => setReviewingJob(null)}
          onStatusChange={() => fetchData()}
        />
      )}

      {/* 4. Detailed Job Preview Modal */}
      {selectedJobDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                  {selectedJobDetail.employmentType.replace('_', ' ')}
                </span>
                <h2 className="text-2xl font-bold text-white mt-2">{selectedJobDetail.title}</h2>
                <p className="text-slate-300 text-sm font-medium">{selectedJobDetail.company}</p>
              </div>
              <button
                onClick={() => setSelectedJobDetail(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location</h4>
                <p className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-indigo-400" /> {selectedJobDetail.location}
                </p>
              </div>

              {selectedJobDetail.description && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Job Description</h4>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-300 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    {selectedJobDetail.description}
                  </p>
                </div>
              )}

              {selectedJobDetail.skillsRequired?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobDetail.skillsRequired.map((s, i) => (
                      <span key={i} className="bg-indigo-950 text-indigo-300 px-3 py-1 rounded-lg border border-indigo-800 text-xs font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(selectedJobDetail.eligibilityBranch?.length > 0 || selectedJobDetail.eligibilityCgpa > 0) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Eligibility Requirements</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {selectedJobDetail.eligibilityCgpa > 0 && (
                      <li>Minimum CGPA: <span className="font-semibold text-white">{selectedJobDetail.eligibilityCgpa}</span></li>
                    )}
                    {selectedJobDetail.eligibilityBranch?.length > 0 && (
                      <li>Eligible Branches: <span className="font-semibold text-white">{selectedJobDetail.eligibilityBranch.join(', ')}</span></li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setSelectedJobDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
              >
                Close
              </button>
              {isStudent && !getStudentApplicationForJob(selectedJobDetail.id) && selectedJobDetail.status === 'ACTIVE' && (
                <button
                  onClick={() => {
                    setApplyingJob(selectedJobDetail);
                    setSelectedJobDetail(null);
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Apply Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
