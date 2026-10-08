import React, { useState, useEffect } from 'react';
import { jobService } from '../services/jobService';

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'REMOTE', label: 'Remote' },
];

const WORKPLACE_TYPES = ['On-site', 'Remote', 'Hybrid'];

const BRANCHES = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Chemical Engineering',
];

export default function CreateJobModal({ jobToEdit = null, job = null, onClose, onSuccess }) {
  const targetJob = jobToEdit || job;
  const isEditing = Boolean(targetJob);

  const [company, setCompany] = useState(targetJob?.company || '');
  const [title, setTitle] = useState(targetJob?.title || '');
  const [location, setLocation] = useState(targetJob?.location || '');
  const [employmentType, setEmploymentType] = useState(targetJob?.employmentType || 'FULL_TIME');
  const [workplaceType, setWorkplaceType] = useState(targetJob?.workplaceType || 'On-site');
  const [salary, setSalary] = useState(targetJob?.salary || '');
  const [minExperience, setMinExperience] = useState(targetJob?.minExperience || 0);
  const [minCgpa, setMinCgpa] = useState(targetJob?.minCgpa || '');
  const [skillsInput, setSkillsInput] = useState((targetJob?.skills || []).join(', '));
  const [eligibleBranches, setEligibleBranches] = useState(targetJob?.eligibleBranches || []);
  const [eligibleBatchesInput, setEligibleBatchesInput] = useState((targetJob?.eligibleBatches || []).join(', '));
  const [description, setDescription] = useState(targetJob?.description || '');
  const [requirements, setRequirements] = useState(targetJob?.requirements || '');
  const [deadline, setDeadline] = useState(
    targetJob?.deadline ? new Date(targetJob.deadline).toISOString().substring(0, 10) : ''
  );
  const [externalApplyUrl, setExternalApplyUrl] = useState(targetJob?.externalApplyUrl || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleBranch = (branch) => {
    setEligibleBranches((prev) =>
      prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const skills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
    const eligibleBatches = eligibleBatchesInput
      .split(',')
      .map((b) => parseInt(b.trim(), 10))
      .filter((n) => !isNaN(n));

    const payload = {
      company: company.trim(),
      title: title.trim(),
      location: location.trim(),
      employmentType,
      workplaceType,
      salary: salary.trim() || undefined,
      minExperience: parseInt(minExperience, 10) || 0,
      minCgpa: minCgpa !== '' ? parseFloat(minCgpa) : undefined,
      skills,
      eligibleBranches,
      eligibleBatches,
      description: description.trim(),
      requirements: requirements.trim() || undefined,
      deadline: deadline ? `${deadline}T23:59:59.000Z` : undefined,
      externalApplyUrl: externalApplyUrl.trim() || undefined,
    };

    try {
      let res;
      if (isEditing) {
        res = await jobService.updateJob(targetJob.id, payload);
      } else {
        res = await jobService.createJob(payload);
      }

      if (res.success) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save job opening.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 sm:p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-base transition-colors"
        >
          ×
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-black text-slate-900">
            {isEditing ? 'Edit Job Opening 💼' : 'Post a New Job Opportunity 💼'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Share career opportunities, internships, and referrals with verified campus students.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google, TCS, Microsoft"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Job Title / Role *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Software Engineer Intern, Data Analyst"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Employment Type *
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Workplace Mode *
              </label>
              <select
                value={workplaceType}
                onChange={(e) => setWorkplaceType(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {WORKPLACE_TYPES.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Location *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru, Remote, Pune"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Salary / Stipend
              </label>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. ₹12 - 18 LPA or ₹30k/mo"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Min Experience (Yrs)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={minExperience}
                onChange={(e) => setMinExperience(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Min CGPA Cutoff
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={minCgpa}
                onChange={(e) => setMinCgpa(e.target.value)}
                placeholder="e.g. 7.5 (Optional)"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Required Skills (Comma-separated)
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="React, Node.js, Python, PostgreSQL, AWS"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Eligible Academic Branches
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              {BRANCHES.map((b) => {
                const isSelected = eligibleBranches.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBranch(b)}
                    className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {b}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Eligible Batches (Comma-separated)
              </label>
              <input
                type="text"
                value={eligibleBatchesInput}
                onChange={(e) => setEligibleBatchesInput(e.target.value)}
                placeholder="e.g. 2024, 2025, 2026"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Application Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Job Description *
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the job responsibilities, key projects, team culture, and interview process..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Requirements & Qualifications
            </label>
            <textarea
              rows={3}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Specify mandatory qualifications, degree requirements, or portfolio links..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* External Link */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              External Careers Portal URL (Optional)
            </label>
            <input
              type="url"
              value={externalApplyUrl}
              onChange={(e) => setExternalApplyUrl(e.target.value)}
              placeholder="https://careers.google.com/jobs/..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Job Opening' : 'Post Job Opening 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
