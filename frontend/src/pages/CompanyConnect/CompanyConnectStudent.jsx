import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './CompanyConnect.css';

export default function CompanyConnectStudent({ currentUser: propUser }) {
  const { user: authUser } = useAuth();
  const currentUser = propUser || authUser;
  const [drive, setDrive] = useState(null);
  const [driveId, setDriveId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    rollNumber: '',
    cgpa: '',
    branch: currentUser?.studentProfile?.branch || 'Information Technology',
  });

  useEffect(() => {
    api.get('/company-connect/drives')
      .then((res) => {
        const drives = res.data?.drives || [];
        if (drives.length > 0) {
          const active = drives.find(d => d.status === 'STUDENTS_NOTIFIED') || drives[0];
          setDrive(active);
          setDriveId(active.id);
          const found = active.registeredStudents?.find(
            (s) => s.studentId === currentUser?.id
          );
          if (found) {
            setRegistered(true);
            setResult(found);
          }
        }
      })
      .catch(() => {});
  }, [currentUser]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.rollNumber || !form.cgpa || !driveId) return;
    setLoading(true);
    try {
      const res = await api.post('/company-connect/register', {
        driveId,
        formDetails: form,
      });
      setResult(res.data.registration);
      setRegistered(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  if (!drive) return <div className="cc-student-loading">Loading drive details...</div>;

  return (
    <div className="cc-student-container">
      {/* Top back navigation */}
      <div style={{ marginBottom: '16px' }}>
        <Link to="/student/dashboard" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: '#4f46e5',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '13px',
        }}>
          ← Back to Student Dashboard
        </Link>
      </div>

      {/* Drive Announcement Banner */}
      <div className="cc-student-banner">
        <div className="cc-student-banner-icon">🏢</div>
        <div>
          <h2>{drive.companyName} Placement Drive</h2>
          <p>📅 {drive.driveDate} · Min CGPA: {drive.minCgpa} · {drive.eligibleBranches?.join(', ')}</p>
          <p className="cc-webinar">
            🔗 Webinar: <a href={drive.webinarLink} target="_blank" rel="noopener noreferrer">{drive.webinarLink}</a>
          </p>
        </div>
      </div>

      {/* Alumni mentors */}
      {drive.acceptedAlumni?.length > 0 && (
        <div className="cc-mentors-section">
          <h3>👥 Alumni Mentors Ready to Guide You</h3>
          <div className="cc-mentors-list">
            {drive.acceptedAlumni.map((a) => (
              <div key={a.alumniId} className="cc-mentor-chip">
                <span className="cc-mentor-av">{a.name?.charAt(0)}</span>
                <span>{a.name}</span>
                <span className="cc-mentor-co">· {a.company}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registration Form or Result */}
      {!registered ? (
        <div className="cc-student-form-card">
          <h3>📝 Register for {drive.companyName} Drive</h3>
          <p>Fill in your details. Our AI will automatically check your eligibility.</p>
          <form onSubmit={handleRegister} className="cc-student-form">
            <div className="cc-form-group">
              <label>Roll Number *</label>
              <input
                value={form.rollNumber}
                onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
                placeholder="e.g. 22IT101"
                required
              />
            </div>
            <div className="cc-form-group">
              <label>Current CGPA *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={form.cgpa}
                onChange={(e) => setForm({ ...form, cgpa: e.target.value })}
                placeholder="e.g. 8.5"
                required
              />
            </div>
            <div className="cc-form-group">
              <label>Branch</label>
              <input
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                placeholder="Information Technology"
              />
            </div>
            <button type="submit" className="cc-action-btn" disabled={loading}>
              {loading ? '⏳ Checking Eligibility...' : '🤖 Submit — AI Eligibility Check'}
            </button>
          </form>
        </div>
      ) : (
        <div className={`cc-result-card ${result?.isEligible ? 'cc-result-eligible' : 'cc-result-ineligible'}`}>
          <div className="cc-result-icon">{result?.isEligible ? '🎉' : '😔'}</div>
          <h3>{result?.isEligible ? 'Congratulations! You are Eligible!' : 'Not Eligible for This Drive'}</h3>
          <div className="cc-result-reasons">
            {result?.eligibilityReasons?.map((r, i) => (
              <div key={i} className="cc-reason">{r}</div>
            ))}
          </div>
          {result?.isEligible && (
            <div className="cc-result-next">
              <p>✅ You have been added to <strong>{drive.companyName} Placement Community!</strong></p>
              <p>📱 Check your SMS for the webinar link.</p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }}>
                <a href={drive.webinarLink} target="_blank" rel="noopener noreferrer" className="cc-webinar-btn">
                  🎥 Join Webinar
                </a>
                <Link to="/communities" className="cc-webinar-btn" style={{ background: '#4f46e5' }}>
                  💬 Open Placement Community
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
