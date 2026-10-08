import React, { useState } from 'react';
import { mentorshipService } from '../services/mentorshipService';

const DEFAULT_TOPICS = [
  'Career Guidance & Roadmap',
  'Technical Interview Preparation',
  'Resume & Portfolio Review',
  'System Design & Architecture Guidance',
  'Industry Transition & Domain Advice',
  'Company Culture & Referral Advice',
  'Projects & Open Source Mentorship',
  'Higher Studies & Research Guidance',
];

export default function MentorshipRequestModal({ alumni, matchScore, matchReasons, onClose, onSuccess }) {
  if (!alumni) return null;

  const { user, currentCompany, jobRole, domain, branch, yearsOfExperience } = alumni;
  const [topic, setTopic] = useState(DEFAULT_TOPICS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [goals, setGoals] = useState('');
  const [message, setMessage] = useState(
    `Hi ${user?.firstName || 'Mentor'}, I would love to request mentorship from you on AlumniConnect. I am keen on gaining your guidance regarding career growth and industry best practices ${
      currentCompany ? `at ${currentCompany}` : ''
    }.`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const finalTopic = topic === 'Custom' ? customTopic.trim() : topic;
    if (!finalTopic) {
      setError('Please select or specify a mentorship topic.');
      setIsSubmitting(false);
      return;
    }

    if (!message.trim()) {
      setError('Please write a short introduction and message.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await mentorshipService.sendRequest({
        alumniId: user?.id || alumni.userId,
        topic: finalTopic,
        goals: goals.trim() || undefined,
        message: message.trim(),
      });

      if (res.success) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to send mentorship request.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const score = matchScore || alumni.matchScore || 85;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 sm:p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-base transition-colors"
        >
          ×
        </button>

        {/* Header with Mentor details & Match score */}
        <div className="flex items-start gap-4 mb-5 pb-5 border-b border-slate-100">
          {user?.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt={user.firstName}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-sm"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-lg leading-tight">
                {user?.firstName} {user?.lastName}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-2xs">
                🎯 {score}% Match
              </span>
            </div>
            <p className="text-xs font-semibold text-indigo-600 mt-0.5">
              {jobRole || 'Alumni Mentor'} {currentCompany ? `• ${currentCompany}` : ''}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {domain ? `${domain} • ` : ''}
              {branch ? `${branch} • ` : ''}
              {yearsOfExperience ? `${yearsOfExperience} yrs exp` : ''}
            </p>
          </div>
        </div>

        {/* Match reasons highlights */}
        {matchReasons && matchReasons.length > 0 && (
          <div className="mb-5 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
            <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>✨</span>
              <span>Why you match with this mentor:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchReasons.map((r, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-white/90 text-indigo-950 text-xs font-medium rounded-lg border border-indigo-200/80 shadow-2xs"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
            <span className="text-base">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-4 text-xs">
          {/* Topic */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mentorship Topic / Focus Area *
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-2xs"
            >
              {DEFAULT_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="Custom">Other (Custom Topic)</option>
            </select>
          </div>

          {topic === 'Custom' && (
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Specify Custom Topic *
              </label>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g., Preparing for Cloud Solutions Architect certification"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-2xs"
                required
              />
            </div>
          )}

          {/* Goals */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Your Goals & Expectations (Optional)
            </label>
            <input
              type="text"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g., Guidance on cracking SDE interviews and resume feedback for Q4"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>

          {/* Intro Message */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Personalized Note / Message to Mentor *
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce your current college year, projects, and what you hope to learn..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none shadow-2xs"
              required
            />
          </div>

          {/* Submit buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending Request...</span>
                </>
              ) : (
                <>
                  <span>🤝</span>
                  <span>Send Mentorship Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
