import React, { useState, useEffect, useCallback } from 'react';
import { jobService } from '../services/jobService';
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Award,
  Calendar,
  FileText,
  ExternalLink,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REVIEWING', label: 'Under Review' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'INTERVIEW', label: 'Interview Scheduled' },
  { value: 'SELECTED', label: 'Selected / Offer' },
  { value: 'REJECTED', label: 'Declined' },
];

export default function ApplicantReviewModal({ job, onClose }) {
  if (!job) return null;

  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Status Change Modal / Drawer state
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [newStatus, setNewStatus] = useState('SHORTLISTED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobService.getJobApplicants(job.id, {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        limit: 50,
      });

      if (res.success) {
        setApplicants(res.data.applicants || []);
      }
    } catch (err) {
      console.error('Failed to fetch job applicants:', err);
    } finally {
      setLoading(false);
    }
  }, [job.id, statusFilter]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedApplicant) return;

    setIsUpdating(true);
    try {
      const res = await jobService.updateApplicationStatus(selectedApplicant.id, {
        status: newStatus,
        reviewNotes: reviewNotes.trim() || undefined,
        interviewDate: interviewDate ? `${interviewDate}T10:00:00.000Z` : undefined,
      });

      if (res.success) {
        setToastMessage(`Updated ${selectedApplicant.student?.firstName}'s status to ${newStatus}.`);
        setTimeout(() => setToastMessage(''), 4000);
        setSelectedApplicant(null);
        setReviewNotes('');
        setInterviewDate('');
        fetchApplicants();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update applicant status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredApplicants = applicants.filter((app) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${app.student?.firstName || ''} ${app.student?.lastName || ''}`.toLowerCase();
    const branch = (app.student?.studentProfile?.branch || '').toLowerCase();
    const skills = (app.student?.studentProfile?.skills || []).join(' ').toLowerCase();
    return name.includes(q) || branch.includes(q) || skills.includes(q);
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col relative">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">
                Applicants for {job.title}
              </h2>
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200">
                {job.company}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review candidates, evaluate skill match scores, schedule interviews, and issue offers.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-base transition-colors"
          >
            ×
          </button>
        </div>

        {toastMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-between">
            <span>✨ {toastMessage}</span>
            <button onClick={() => setToastMessage('')} className="font-bold">
              ×
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex-1 max-w-sm">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, branch, skills..."
              className="bg-transparent border-none outline-hidden text-xs text-slate-800 placeholder-slate-400 w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-hidden"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Applicants List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
              Loading candidates from PostgreSQL database...
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <div className="text-3xl mb-2">📋</div>
              <h4 className="font-bold text-slate-700 text-sm">No candidates found</h4>
              <p className="text-slate-400 mt-1">No applications matching current filters.</p>
            </div>
          ) : (
            filteredApplicants.map((app) => {
              const student = app.student;
              const profile = student?.studentProfile;

              let statusBadge = (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-extrabold rounded-full">
                  Pending
                </span>
              );

              if (app.status === 'SHORTLISTED') {
                statusBadge = (
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-extrabold rounded-full">
                    Shortlisted ⭐
                  </span>
                );
              } else if (app.status === 'INTERVIEW') {
                statusBadge = (
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-extrabold rounded-full">
                    Interview Scheduled 📅
                  </span>
                );
              } else if (app.status === 'SELECTED') {
                statusBadge = (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold rounded-full">
                    Selected / Offer 🎉
                  </span>
                );
              } else if (app.status === 'REJECTED') {
                statusBadge = (
                  <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold rounded-full">
                    Declined
                  </span>
                );
              }

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                        {student?.firstName?.[0]}
                        {student?.lastName?.[0]}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-sm">
                            {student?.firstName} {student?.lastName}
                          </h4>
                          {app.matchScore && (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black">
                              🎯 {app.matchScore}% Match
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          {profile?.branch || 'Student'}
                          {profile?.graduationYear ? ` • Class of ${profile.graduationYear}` : ''}
                          {profile?.cgpa ? ` • CGPA: ${profile.cgpa}` : ''}
                        </p>
                        <p className="text-xs text-slate-400">{student?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-start">
                      {statusBadge}
                    </div>
                  </div>

                  {/* Cover Letter / Notes */}
                  {app.coverLetter && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 italic">
                      "<span className="font-semibold text-slate-800">Cover Letter:</span> {app.coverLetter}"
                    </div>
                  )}

                  {/* Review Notes from Alumni */}
                  {app.reviewNotes && (
                    <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 font-medium">
                      <span className="font-bold">Your Notes:</span> {app.reviewNotes}
                      {app.interviewDate && (
                        <span className="block text-[11px] text-indigo-700 mt-0.5 font-bold">
                          📅 Interview Date: {new Date(app.interviewDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Skills tags */}
                  {profile?.skills && profile.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {profile.skills.map((sk) => (
                        <span key={sk} className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md border border-slate-200">
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {app.resumeUrl && (
                        <a
                          href={app.resumeUrl.startsWith('http') ? app.resumeUrl : `https://${app.resumeUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                        >
                          <FileText size={13} />
                          <span>View Resume</span>
                        </a>
                      )}
                      {app.portfolioUrl && (
                        <a
                          href={app.portfolioUrl.startsWith('http') ? app.portfolioUrl : `https://${app.portfolioUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink size={13} />
                          <span>Portfolio</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedApplicant(app);
                          setNewStatus('SHORTLISTED');
                          setReviewNotes(app.reviewNotes || '');
                        }}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors"
                      >
                        ⭐ Shortlist
                      </button>
                      <button
                        onClick={() => {
                          setSelectedApplicant(app);
                          setNewStatus('INTERVIEW');
                          setReviewNotes(app.reviewNotes || '');
                        }}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 transition-colors"
                      >
                        📅 Schedule Interview
                      </button>
                      <button
                        onClick={() => {
                          setSelectedApplicant(app);
                          setNewStatus('SELECTED');
                          setReviewNotes(app.reviewNotes || '');
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors"
                      >
                        🎉 Select / Offer
                      </button>
                      <button
                        onClick={() => {
                          setSelectedApplicant(app);
                          setNewStatus('REJECTED');
                          setReviewNotes(app.reviewNotes || '');
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Update Status Drawer / Modal */}
        {selectedApplicant && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 relative">
              <button
                onClick={() => setSelectedApplicant(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-base transition-colors"
              >
                ×
              </button>

              <h3 className="font-extrabold text-slate-900 text-base mb-1">
                Update Status for {selectedApplicant.student?.firstName} {selectedApplicant.student?.lastName}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Updating application status for "{job.title}".
              </p>

              <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Application Status *
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="SHORTLISTED">⭐ Shortlisted</option>
                    <option value="INTERVIEW">📅 Interview Scheduled</option>
                    <option value="SELECTED">🎉 Selected / Job Offer</option>
                    <option value="REVIEWING">🔍 Under Review</option>
                    <option value="REJECTED">✕ Declined</option>
                  </select>
                </div>

                {newStatus === 'INTERVIEW' && (
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Interview Date & Time
                    </label>
                    <input
                      type="date"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Feedback / Instructions Note for Candidate (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="e.g. Please join the Google Meet link on Tuesday at 3:00 PM for round 1 technical discussion."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedApplicant(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all shadow-md"
                  >
                    {isUpdating ? 'Saving...' : 'Update Candidate Status'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
