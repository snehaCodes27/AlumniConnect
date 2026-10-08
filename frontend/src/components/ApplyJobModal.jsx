import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { jobService } from '../services/jobService';
import { Briefcase, Building2, MapPin, Calendar, Award, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ApplyJobModal({ job, onClose, onSuccess }) {
  if (!job) return null;

  const { user } = useAuth();
  const profile = user?.studentProfile || {};

  const [resumeUrl, setResumeUrl] = useState(profile.resumeUrl || '');
  const [coverLetter, setCoverLetter] = useState(
    `Hi ${job.alumni?.firstName || 'Recruiter'}, I am eager to apply for the ${job.title} position at ${job.company}. My background in ${
      profile.branch || 'engineering'
    } and hands-on project experience align well with your team's requirements.`
  );
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolioUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isExpired = job.deadline && new Date(job.deadline) < new Date();
  const isEligible = job.isEligible !== false;
  const matchScore = job.matchScore || 75;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await jobService.applyForJob(job.id, {
        resumeUrl: resumeUrl.trim() || undefined,
        coverLetter: coverLetter.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
      });

      if (res.success) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 sm:p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-base transition-colors"
        >
          ×
        </button>

        {/* Job Summary Header */}
        <div className="flex items-start gap-4 mb-5 pb-5 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md">
            {job.company?.[0] || 'J'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                {job.title}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-2xs">
                🎯 {matchScore}% Match
              </span>
            </div>
            <p className="text-xs font-bold text-indigo-600 mt-0.5 flex items-center gap-1.5">
              <Building2 size={13} />
              <span>{job.company}</span>
              <span>•</span>
              <MapPin size={13} />
              <span>{job.location} ({job.workplaceType || 'On-site'})</span>
            </p>

            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 font-medium mt-1">
              <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-slate-700">
                {job.employmentType?.replace('_', ' ')}
              </span>
              {job.salary && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-semibold border border-emerald-100">
                  {job.salary}
                </span>
              )}
              {job.deadline && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-semibold border border-amber-100">
                  Deadline: {new Date(job.deadline).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Eligibility warnings */}
        {!isEligible && job.eligibilityReasons && job.eligibilityReasons.length > 0 && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle size={14} />
              <span>Job Criteria Notice:</span>
            </div>
            {job.eligibilityReasons.map((r, i) => (
              <div key={i} className="text-[11px]">
                • {r}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Resume URL (PDF / Cloud Link) *
            </label>
            <input
              type="url"
              required
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/your-resume.pdf"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Portfolio / GitHub URL
              </label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://github.com/username"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Cover Letter / Statement of Interest (Optional)
            </label>
            <textarea
              rows={4}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Highlight relevant projects, technical skills, and why you are excited about this role..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none shadow-2xs"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isExpired}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Submitting Application...</span>
              ) : isExpired ? (
                <span>Job Expired</span>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
