import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentProfileService } from '../../services/studentProfileService';

const sections = [
  {
    key: 'personal',
    title: 'Personal Information',
    fields: [
      { key: 'profilePhoto', label: 'Profile Photo', type: 'file', accept: 'image/*', userField: true },
      { key: 'firstName', label: 'First Name', type: 'text', userField: true },
      { key: 'lastName', label: 'Last Name', type: 'text', userField: true },
      { key: 'email', label: 'Email', type: 'email', userField: true, readOnly: true },
      { key: 'phone', label: 'Phone', type: 'tel', userField: true },
      { key: 'location', label: 'Location', type: 'text' },
    ],
  },
  {
    key: 'academic',
    title: 'Academic Information',
    fields: [
      { key: 'college', label: 'College', type: 'text' },
      { key: 'degree', label: 'Degree', type: 'text' },
      { key: 'branch', label: 'Branch', type: 'text' },
      { key: 'currentYear', label: 'Current Year', type: 'number', min: 1, max: 5 },
      { key: 'batch', label: 'Batch', type: 'text' },
      { key: 'graduationYear', label: 'Graduation Year', type: 'number', min: 2020, max: 2030 },
      { key: 'cgpa', label: 'CGPA/Percentage', type: 'number', step: 0.01, min: 0, max: 10 },
    ],
  },
  {
    key: 'skills',
    title: 'Skills',
    fields: [
      { key: 'technicalSkills', label: 'Technical Skills', type: 'tags', placeholder: 'e.g., React, Node.js, Python' },
      { key: 'tools', label: 'Tools/Technologies', type: 'tags', placeholder: 'e.g., Git, Docker, AWS' },
    ],
  },
  {
    key: 'interests',
    title: 'Interests',
    fields: [
      { key: 'domainInterests', label: 'Domain Interests', type: 'tags', placeholder: 'e.g., Web Development, AI/ML, Cybersecurity' },
      { key: 'careerInterests', label: 'Career Interests', type: 'tags', placeholder: 'e.g., Full-time, Internship, Research' },
    ],
  },
  {
    key: 'career',
    title: 'Career Goals',
    fields: [
      { key: 'careerGoal', label: 'Career Goal', type: 'textarea', placeholder: 'Describe your career aspirations...' },
      { key: 'preferredDomain', label: 'Preferred Domain', type: 'text' },
      { key: 'preferredRole', label: 'Preferred Role', type: 'text' },
      { key: 'preferredCompany', label: 'Preferred Company', type: 'text' },
    ],
  },
  {
    key: 'links',
    title: 'Professional Links',
    fields: [
      { key: 'linkedinUrl', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/in/...' },
      { key: 'githubUrl', label: 'GitHub', type: 'url', placeholder: 'https://github.com/...' },
      { key: 'portfolioUrl', label: 'Portfolio', type: 'url', placeholder: 'https://yourportfolio.com' },
    ],
  },
  {
    key: 'documents',
    title: 'Documents',
    fields: [
      { key: 'profilePhoto', label: 'Profile Photo', type: 'file', accept: 'image/*', upload: 'photo' },
      { key: 'resumeUrl', label: 'Resume/CV', type: 'file', accept: '.pdf', upload: 'resume' },
    ],
  },
];

export default function StudentProfilePage() {
  const { user, token } = useAuth();
  const [activeSection, setActiveSection] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [profileCompletion, setProfileCompletion] = useState({ percentage: 0, incompleteFields: [] });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await studentProfileService.getProfile();
      if (response.success) {
        const mergedData = {
          ...response.data.user,
          ...response.data.studentProfile,
        };
        setFormData(mergedData);
        setOriginalData(mergedData);
        setProfileCompletion(response.data.profileCompletion);
        if (response.data.user.profilePhoto) {
          setPhotoPreview(response.data.user.profilePhoto);
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const handleFileChange = (key, file) => {
    if (key === 'profilePhoto' && file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
    setFormData(prev => ({ ...prev, [key]: file }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const handleTagsChange = (key, tags) => {
    handleChange(key, tags);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage('');
    setErrors({});

    const userFields = ['firstName', 'lastName', 'phone', 'profilePhoto'];
    const userData = {};
    const profileData = {};

    Object.entries(formData).forEach(([key, value]) => {
      if (userFields.includes(key)) {
        userData[key] = value;
      } else {
        if (Array.isArray(value)) {
          profileData[key] = value;
        } else if (value instanceof File) {
          profileData[key] = value;
        } else {
          profileData[key] = value;
        }
      }
    });

    try {
      const response = await studentProfileService.updateProfile(profileData);
      if (response.success) {
        setSuccessMessage('Profile saved successfully!');
        setOriginalData(response.data);
        setFormData(prev => ({ ...prev, ...response.data.user, ...response.data.studentProfile }));
        setProfileCompletion(response.data.profileCompletion);
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save profile.';
      setErrors({ form: message });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
    setErrors({});
  };

  const handleUploadPhoto = async (file) => {
    try {
      const response = await studentProfileService.uploadPhoto(file);
      if (response.success) {
        setPhotoPreview(response.data.profilePhoto);
        handleChange('profilePhoto', response.data.profilePhoto);
        setSuccessMessage('Profile photo updated!');
      }
    } catch (err) {
      setErrors({ photo: err.response?.data?.message || 'Upload failed.' });
    }
  };

  const handleUploadResume = async (file) => {
    try {
      const response = await studentProfileService.uploadResume(file);
      if (response.success) {
        handleChange('resumeUrl', response.data.resumeUrl);
        setSuccessMessage('Resume uploaded!');
      }
    } catch (err) {
      setErrors({ resume: err.response?.data?.message || 'Upload failed.' });
    }
  };

  const renderField = (field) => {
    const value = formData[field.key] || '';
    const error = errors[field.key];

    if (field.type === 'file') {
      const isUpload = field.upload === 'photo' || field.upload === 'resume';
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-1">{field.label}</label>
          <input
            type="file"
            accept={field.accept}
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              if (field.upload === 'photo') handleUploadPhoto(file);
              else if (field.upload === 'resume') handleUploadResume(file);
              else handleFileChange(field.key, file);
            }}
            disabled={!isEditing || isUpload}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {field.upload === 'photo' && formData.profilePhoto && !isEditing && (
            <p className="text-xs text-slate-500 mt-1">Click edit to change photo</p>
          )}
          {field.upload === 'resume' && formData.resumeUrl && !isEditing && (
            <p className="text-xs text-slate-500 mt-1">Click edit to change resume</p>
          )}
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      );
    }

    if (field.type === 'tags') {
      const tags = Array.isArray(value) ? value : (value ? value.split(',').map(s => s.trim()).filter(Boolean) : []);
      const [newTag, setNewTag] = useState('');
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-1">{field.label}</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag, i) => (
              <span key={i} className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-sm flex items-center gap-1">
                {tag}
                <button type="button" onClick={() => {
                  const newTags = tags.filter((_, idx) => idx !== i);
                  handleTagsChange(field.key, newTags);
                }} className="hover:text-white transition-colors">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTag.trim()) {
                  handleTagsChange(field.key, [...tags, newTag.trim()]);
                  setNewTag('');
                }
              }}
              placeholder={field.placeholder}
              disabled={!isEditing}
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
            />
          </div>
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-1">{field.label}</label>
          <textarea
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            disabled={!isEditing || field.readOnly}
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      );
    }

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-1">{field.label}</label>
        <input
          type={field.type}
          value={value}
          onChange={(e) => handleChange(field.key, field.type === 'number' ? (e.target.value ? parseFloat(e.target.value) : '') : e.target.value)}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step}
          disabled={!isEditing || field.readOnly}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>
    );
  };

  const renderSection = (section) => (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-indigo-300 flex items-center gap-2">
        {section.title}
        {profileCompletion.incompleteFields.some(f => 
          section.fields.some(sf => sf.label === f)
        ) && (
          <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs rounded-full">
            Incomplete
          </span>
        )}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {section.fields.map((field) => renderField(field))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Student Profile</h1>
            <p className="text-sm text-slate-400">Manage your profile information</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-500">Profile Completion</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-indigo-400">{profileCompletion.percentage}%</span>
                <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                    style={{ width: `${profileCompletion.percentage}%` }}
                  />
                </div>
              </div>
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-all"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium border border-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </header>

        {successMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm">
            {successMessage}
          </div>
        )}

        {errors.form && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
            {errors.form}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center space-y-4">
              <div className="relative w-24 h-24 mx-auto">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover border-2 border-slate-700"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                    <span className="text-3xl font-bold text-slate-500">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                )}
                {isEditing && formData.profilePhoto instanceof File && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <span className="text-white text-sm">Updating...</span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user?.firstName} {user?.lastName}</h2>
                <p className="text-sm text-slate-400">{user?.email}</p>
                <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-semibold text-xs rounded-full uppercase">
                  Student
                </span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <h3 className="font-semibold text-slate-300 mb-3">Completion Status</h3>
              <p className="text-sm text-slate-400 mb-4">
                {profileCompletion.completedCount} of {profileCompletion.totalCount} fields completed
              </p>
              {profileCompletion.incompleteFields.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {profileCompletion.incompleteFields.map((field, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      {field}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <main className="lg:col-span-3 space-y-6">
            {sections.map((section) => renderSection(section))}
          </main>
        </div>
      </div>
    </div>
  );
}