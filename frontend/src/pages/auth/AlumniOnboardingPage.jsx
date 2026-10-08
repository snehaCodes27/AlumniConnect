import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { alumniProfileService } from '../../services/alumniProfileService';

const STEPS = [
  { key: 'personal', title: 'Personal Info', icon: '👤' },
  { key: 'academic', title: 'Academic Info', icon: '🎓' },
  { key: 'professional', title: 'Professional Info', icon: '💼' },
  { key: 'skills', title: 'Skills & Expertise', icon: '🛠️' },
  { key: 'experience', title: 'Career History', icon: '🏢' },
  { key: 'connect', title: 'Connect & Portfolio', icon: '🔗' },
];

const BRANCHES = [
  'Computer Science & Engineering',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology',
  'Mathematics & Computing',
  'Information Technology',
  'Other',
];

export default function AlumniOnboardingPage() {
  const navigate = useNavigate();
  const { user, updateUser, refreshUser } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    phone: user?.phone || '',
    location: '',
    graduationYear: '',
    branch: '',
    currentCompany: '',
    jobRole: '',
    yearsOfExperience: '',
    domain: '',
    skills: [],
    areasOfExpertise: [],
    linkedinUrl: '',
    githubUrl: '',
    mentorshipAvailable: false,
    previousCompanies: [],
    profilePhoto: null,
    resume: null,
  });

  const [tagInput, setTagInput] = useState({ skills: '', areasOfExpertise: '' });
  const [photoPreview, setPhotoPreview] = useState(null);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleFileChange = (field, file) => {
    handleChange(field, file);
    if (field === 'profilePhoto' && file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleTagInputChange = (field, value) => {
    setTagInput((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = (field) => {
    const input = tagInput[field]?.trim();
    if (input && !formData[field].includes(input)) {
      handleChange(field, [...formData[field], input]);
    }
    handleTagInputChange(field, '');
  };

  const removeTag = (field, index) => {
    handleChange(
      field,
      formData[field].filter((_, i) => i !== index)
    );
  };

  const addPreviousCompany = () => {
    setFormData((prev) => ({
      ...prev,
      previousCompanies: [
        ...prev.previousCompanies,
        { companyName: '', jobRole: '', domain: '', startYear: '', endYear: '' },
      ],
    }));
  };

  const updatePreviousCompany = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      previousCompanies: prev.previousCompanies.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const removePreviousCompany = (index) => {
    setFormData((prev) => ({
      ...prev,
      previousCompanies: prev.previousCompanies.filter((_, i) => i !== index),
    }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const validateStep = (step) => {
    const errors = [];
    switch (step) {
      case 0:
        if (!formData.fullName.trim()) errors.push('Full name is required.');
        break;
      case 1:
        if (!formData.graduationYear) errors.push('Graduation year is required.');
        if (!formData.branch) errors.push('Branch is required.');
        break;
      case 2:
        if (!formData.currentCompany.trim()) errors.push('Current company is required.');
        if (!formData.jobRole.trim()) errors.push('Current job role is required.');
        if (!formData.yearsOfExperience) errors.push('Years of experience is required.');
        break;
      case 3:
        if (formData.skills.length === 0) errors.push('At least one skill is required.');
        if (formData.areasOfExpertise.length === 0) errors.push('At least one area of expertise is required.');
        break;
      case 4:
        formData.previousCompanies.forEach((c, i) => {
          if (!c.companyName.trim()) errors.push(`Previous company #${i + 1}: company name is required.`);
        });
        break;
      case 5:
        break;
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      setErrorMessage(errors.join(' '));
      return;
    }

    if (currentStep < STEPS.length - 1) {
      nextStep();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = new FormData();
      payload.append('fullName', formData.fullName);
      payload.append('phone', formData.phone);
      payload.append('location', formData.location);
      payload.append('graduationYear', formData.graduationYear);
      payload.append('branch', formData.branch);
      payload.append('currentCompany', formData.currentCompany);
      payload.append('jobRole', formData.jobRole);
      payload.append('yearsOfExperience', formData.yearsOfExperience);
      payload.append('domain', formData.domain);
      payload.append('skills', JSON.stringify(formData.skills));
      payload.append('areasOfExpertise', JSON.stringify(formData.areasOfExpertise));
      payload.append('linkedinUrl', formData.linkedinUrl);
      payload.append('githubUrl', formData.githubUrl);
      payload.append('mentorshipAvailable', formData.mentorshipAvailable);
      payload.append('previousCompanies', JSON.stringify(formData.previousCompanies));

      if (formData.profilePhoto instanceof File) {
        payload.append('profilePhoto', formData.profilePhoto);
      }
      if (formData.resume instanceof File) {
        payload.append('resume', formData.resume);
      }

      const response = await alumniProfileService.completeOnboarding(payload);

      if (response.success) {
        if (updateUser) {
          updateUser({ needsOnboarding: false });
        }
        if (refreshUser) {
          await refreshUser();
        }
        setSuccessMessage('Onboarding completed successfully! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/alumni/dashboard');
        }, 600);
      } else {
        setErrorMessage(response.message || 'Failed to complete onboarding.');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'An unexpected error occurred.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-5">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-3xl font-bold text-slate-500">
                      {formData.fullName ? formData.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AC'}
                    </span>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-6 h-6 bg-cyan-500 rounded-full border-2 border-slate-900 flex items-center justify-center cursor-pointer hover:bg-cyan-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) handleFileChange('profilePhoto', file);
                    }}
                  />
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.895.716c.5.4 1.25.684 2.04.684h10.07c.785 0 1.54-.284 2.04-.684L19 3h2a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
                  </svg>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g., San Francisco, CA"
                className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Graduation Year *</label>
              <input
                type="number"
                value={formData.graduationYear}
                onChange={(e) => handleChange('graduationYear', e.target.value)}
                placeholder="e.g., 2020"
                min="1980"
                max="2030"
                className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Branch *</label>
              <select
                value={formData.branch}
                onChange={(e) => handleChange('branch', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select your branch</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Current Company *</label>
              <input
                type="text"
                value={formData.currentCompany}
                onChange={(e) => handleChange('currentCompany', e.target.value)}
                placeholder="e.g., TechCorp Inc."
                className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Current Job Role *</label>
              <input
                type="text"
                value={formData.jobRole}
                onChange={(e) => handleChange('jobRole', e.target.value)}
                placeholder="e.g., Senior Software Engineer"
                className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Years of Experience *</label>
              <input
                type="number"
                value={formData.yearsOfExperience}
                onChange={(e) => handleChange('yearsOfExperience', e.target.value)}
                placeholder="e.g., 5"
                min="0"
                max="50"
                className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Domain</label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => handleChange('domain', e.target.value)}
                placeholder="e.g., Software Development, Product Management"
                className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Skills *</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-full text-sm flex items-center gap-1.5">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeTag('skills', i)}
                      className="hover:text-cyan-200 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput.skills}
                  onChange={(e) => handleTagInputChange('skills', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag('skills');
                    }
                  }}
                  placeholder="Type a skill and press Enter (e.g., React, Node.js, Python)"
                  className="flex-1 px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => addTag('skills')}
                  disabled={!tagInput.skills.trim()}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Areas of Expertise *</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.areasOfExpertise.map((area, i) => (
                  <span key={i} className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-full text-sm flex items-center gap-1.5">
                    {area}
                    <button
                      type="button"
                      onClick={() => removeTag('areasOfExpertise', i)}
                      className="hover:text-cyan-200 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput.areasOfExpertise}
                  onChange={(e) => handleTagInputChange('areasOfExpertise', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag('areasOfExpertise');
                    }
                  }}
                  placeholder="e.g., Mentoring, Hiring, Technical Interviews"
                  className="flex-1 px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => addTag('areasOfExpertise')}
                  disabled={!tagInput.areasOfExpertise.trim()}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-slate-200">Previous Companies</h4>
              <button
                type="button"
                onClick={addPreviousCompany}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Another Company
              </button>
            </div>

            {formData.previousCompanies.length === 0 ? (
              <div className="text-center py-8 bg-slate-800/30 border border-slate-700/80 rounded-xl">
                <p className="text-slate-400 text-sm mb-3">No previous companies added yet.</p>
                <button
                  type="button"
                  onClick={addPreviousCompany}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-sm font-medium transition-all"
                >
                  Add First Company
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.previousCompanies.map((company, idx) => (
                  <div key={idx} className="p-4 bg-slate-800/50 border border-slate-700/80 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-300">Company #{idx + 1}</span>
                      {formData.previousCompanies.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePreviousCompany(idx)}
                          className="text-rose-400 hover:text-rose-300 text-xs font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Company Name *</label>
                        <input
                          type="text"
                          value={company.companyName}
                          onChange={(e) => updatePreviousCompany(idx, 'companyName', e.target.value)}
                          placeholder="Company name"
                          className="w-full px-3 py-2 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Job Role</label>
                        <input
                          type="text"
                          value={company.jobRole}
                          onChange={(e) => updatePreviousCompany(idx, 'jobRole', e.target.value)}
                          placeholder="Job role"
                          className="w-full px-3 py-2 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Domain/Department</label>
                        <input
                          type="text"
                          value={company.domain}
                          onChange={(e) => updatePreviousCompany(idx, 'domain', e.target.value)}
                          placeholder="e.g., Engineering"
                          className="w-full px-3 py-2 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Start Year</label>
                          <input
                            type="number"
                            value={company.startYear}
                            onChange={(e) => updatePreviousCompany(idx, 'startYear', e.target.value)}
                            placeholder="YYYY"
                            min="1980"
                            max="2030"
                            className="w-full px-3 py-2 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">End Year</label>
                          <input
                            type="number"
                            value={company.endYear}
                            onChange={(e) => updatePreviousCompany(idx, 'endYear', e.target.value)}
                            placeholder="YYYY"
                            min="1980"
                            max="2030"
                            className="w-full px-3 py-2 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">LinkedIn Profile</label>
              <input
                type="url"
                value={formData.linkedinUrl}
                onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">GitHub Profile</label>
              <input
                type="url"
                value={formData.githubUrl}
                onChange={(e) => handleChange('githubUrl', e.target.value)}
                placeholder="https://github.com/yourusername"
                className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/80 rounded-xl">
              <div>
                <label className="block text-sm font-medium text-slate-300">Mentorship Availability</label>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formData.mentorshipAvailable
                    ? 'You are available for mentorship.'
                    : 'You are not available for mentorship.'}
                </p>
              </div>
              <label className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors">
                <input
                  type="checkbox"
                  checked={formData.mentorshipAvailable}
                  onChange={(e) => handleChange('mentorshipAvailable', e.target.checked)}
                  className="sr-only"
                />
                <span
                  className={`inline-block h-6 w-11 rounded-full transition ${
                    formData.mentorshipAvailable ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                      formData.mentorshipAvailable ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Resume (Optional)</label>
              <label className="block border-2 border-dashed border-slate-700/80 rounded-xl p-6 text-center cursor-pointer hover:border-cyan-500/50 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleFileChange('resume', file);
                  }}
                />
                {formData.resume ? (
                  <p className="text-sm text-slate-300">{formData.resume.name}</p>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-slate-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 2h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414A1 1 0 0117 6.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-slate-400">Upload your resume (PDF only)</p>
                  </>
                )}
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-slate-100">
      <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-3xl z-10">
        <div className="flex justify-center">
          <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 font-semibold text-xs uppercase tracking-wider">
            Alumni Onboarding
          </span>
        </div>
        <h2 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-white">
          Complete Your Profile
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Tell us about yourself to start connecting with students and fellow alumni.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl z-10">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 py-8 px-4 shadow-2xl rounded-2xl sm:px-10">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">
                Step {currentStep + 1} of {STEPS.length}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {Math.round(((currentStep + 1) / STEPS.length) * 100)}% Complete
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-3">
              {STEPS.map((step, idx) => (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      idx === currentStep
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                        : idx < currentStep
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {idx < currentStep ? '✓' : step.icon}
                  </div>
                  <span className="text-xs text-slate-500 mt-1 hidden sm:block">{step.title}</span>
                </div>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-cyan-400">{STEPS[currentStep].icon}</span>
                {STEPS[currentStep].title}
              </h3>
              {renderStepContent()}
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 0 || isSubmitting}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl font-medium transition-all border border-slate-700"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : currentStep === STEPS.length - 1 ? (
                  'Complete Onboarding'
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
