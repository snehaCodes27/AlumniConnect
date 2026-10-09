import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import './CompanyConnect.css';

export default function CompanyConnectAdmin() {
  const { socket } = useSocket();
  const [step, setStep] = useState(0); // 0=idle, 1=searching, 2=found, 3=invited, 4=accepted, 5=notified
  const [prompt, setPrompt] = useState('');
  const [drive, setDrive] = useState(null);
  const [driveId, setDriveId] = useState(null);
  const [foundAlumni, setFoundAlumni] = useState([]);
  const [selectedAlumni, setSelectedAlumni] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);
  const [botTyping, setBotTyping] = useState(false);

  const addLog = (msg, type = 'info') => {
    setLog((prev) => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  // Load first active drive on mount
  useEffect(() => {
    api.get('/company-connect/drives')
      .then((res) => {
        const drives = res.data?.drives || [];
        if (drives.length > 0) {
          const active = drives.find(d => d.status !== 'STUDENTS_NOTIFIED') || drives[0];
          setDrive(active);
          setDriveId(active.id);
          const d = active;
          if (d.registeredStudents?.length > 0) setStep(5);
          else if (d.acceptedAlumni?.length > 0) setStep(4);
          else if (d.invitedAlumni?.length > 0) setStep(3);
          else if (d.status !== 'ANNOUNCED') setStep(1);
        }
      })
      .catch(() => {});
  }, []);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleAlumniAccepted = (data) => {
      addLog(`🎉 Alumni ${data.alumniName || 'Mentor'} accepted guidance invitation!`, 'success');
      setStep((prev) => Math.max(prev, 4));
      refreshDrive();
    };

    const handleStudentsNotified = (data) => {
      addLog(`📢 Notification broadcasted to ${data.studentCount} students.`, 'info');
      refreshDrive();
    };

    const handleStudentRegistered = (data) => {
      addLog(`🎓 Student ${data.studentName || 'New student'} registered (${data.status}).`, 'info');
      refreshDrive();
    };

    socket.on('company_connect:alumni_accepted', handleAlumniAccepted);
    socket.on('company_connect:students_notified', handleStudentsNotified);
    socket.on('company_connect:student_registered', handleStudentRegistered);

    return () => {
      socket.off('company_connect:alumni_accepted', handleAlumniAccepted);
      socket.off('company_connect:students_notified', handleStudentsNotified);
      socket.off('company_connect:student_registered', handleStudentRegistered);
    };
  }, [socket]);

  // Step 1: Admin types prompt → Bot searches alumni
  const handleAISearch = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setBotTyping(true);
    addLog(`🤖 AI received prompt: "${prompt}"`, 'ai');

    setTimeout(async () => {
      try {
        setBotTyping(false);
        addLog('🔍 AI searching alumni database...', 'ai');
        const res = await api.post('/company-connect/search-alumni', { prompt });
        const alumni = res.data.alumni;
        setFoundAlumni(alumni);
        setSelectedAlumni(alumni.map((a) => a.id));
        setCompanyName(res.data.searchTerm || companyName);
        setStep(2);
        addLog(`✅ Found ${alumni.length} alumni matching "${res.data.searchTerm}"`, 'success');
      } catch (err) {
        addLog(`❌ Search failed: ${err.message}`, 'error');
      }
      setLoading(false);
    }, 1500);
  };

  // Step 2: 1-Click send invites to selected alumni (auto-creates drive + sends email)
  const handleSendInvites = async () => {
    setLoading(true);
    addLog(`📨 1-Click: Creating drive + sending email + SMS to ${selectedAlumni.length} alumni...`, 'info');
    try {
      const res = await api.post('/company-connect/search-invite', {
        companyName: companyName,
        alumniIds: selectedAlumni,
      });
      const { drive: newDrive, invited } = res.data;
      if (newDrive) {
        setDrive(newDrive);
        setDriveId(newDrive.id);
      }
      addLog(`✅ 1-Click done! Email + SMS sent to ${invited?.length || selectedAlumni.length} alumni.`, 'success');
      addLog(`📧 Alumni received 1-click Accept link in email — they can accept directly from inbox.`, 'ai');
      setStep(3);
    } catch (err) {
      addLog(`❌ ${err.response?.data?.error || err.message}`, 'error');
    }
    setLoading(false);
  };

  // Step 3: Broadcast to all students
  const handleBroadcastStudents = async () => {
    if (!driveId) return;
    setLoading(true);
    addLog('📢 Broadcasting to all eligible students via Email + SMS + In-App Notification...', 'info');
    try {
      const res = await api.post('/company-connect/broadcast-students', { driveId });
      addLog(`✅ Notified ${res.data.notifiedCount} students via Email + SMS!`, 'success');
      addLog(`📧 Placement drive email sent to all students. Check inboxes (may be in Spam).`, 'ai');
      setStep(5);
    } catch (err) {
      addLog(`❌ ${err.response?.data?.error || err.message}`, 'error');
    }
    setLoading(false);
  };

  const refreshDrive = async () => {
    if (!driveId) return;
    try {
      const res = await api.get(`/company-connect/drives/${driveId}`);
      const updatedDrive = res.data.drive;
      setDrive(updatedDrive);
      setStep((prev) => {
        if (updatedDrive.registeredStudents?.length > 0) return Math.max(prev, 5);
        if (updatedDrive.acceptedAlumni?.length > 0) {
          if (prev < 4) {
            addLog(`🎉 Alumni accepted! ${updatedDrive.acceptedAlumni.map((a) => a.name).join(', ')} ready to guide.`, 'success');
          }
          return Math.max(prev, 4);
        }
        if (updatedDrive.invitedAlumni?.length > 0) return Math.max(prev, 3);
        return prev;
      });
    } catch (e) {
      console.warn('[refreshDrive error]', e.message);
    }
  };

  const steps = [
    { label: 'Placement Announced', icon: '🏢' },
    { label: 'AI Alumni Search', icon: '🤖' },
    { label: 'Alumni Found', icon: '👥' },
    { label: 'Invites Sent', icon: '📨' },
    { label: 'Alumni Accepted', icon: '✅' },
    { label: 'Students Notified', icon: '📢' },
  ];

  const handleResetDemo = async () => {
    try {
      await api.post('/company-connect/reset', { driveId: driveId || undefined });
      setStep(0);
      setDrive(null);
      setDriveId(null);
      setFoundAlumni([]);
      setSelectedAlumni([]);
      setCompanyName('');
      setLog([]);
      addLog('🔄 Demo state reset to initial state.', 'info');
    } catch (err) {
      addLog(`❌ Reset failed: ${err.message}`, 'error');
    }
  };

  const handleTestEmail = async () => {
    addLog('📧 Sending test email to admin inbox...', 'info');
    try {
      const res = await api.post('/company-connect/test-email');
      if (res.data.success) {
        addLog(`✅ ${res.data.message}`, 'success');
      } else {
        addLog(`❌ Email failed: ${res.data.error}`, 'error');
      }
    } catch (err) {
      addLog(`❌ Email error: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  return (
    <div className="cc-container">
      {/* Header */}
      <div className="cc-header">
        <div className="cc-header-icon">🏢</div>
        <div>
          <h1>Company Intelligence</h1>
          <p>AI-powered placement drive management — {drive ? `${drive.companyName} Drive · ${drive.driveDate}` : 'Ready to search alumni for any company...'}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link to="/admin/dashboard" className="cc-refresh-btn" style={{ textDecoration: 'none', background: '#374151' }}>
            ← Admin Dashboard
          </Link>
          <button className="cc-refresh-btn" onClick={handleTestEmail} style={{ background: '#1e3a5f' }} title="Send a test email to admin inbox to verify email works">
            📧 Test Email
          </button>
          <button className="cc-refresh-btn" onClick={handleResetDemo} style={{ background: '#7f1d1d' }} title="Reset flow for fresh demo">
            ↺ Reset Demo
          </button>
          <button className="cc-refresh-btn" onClick={refreshDrive} title="Refresh drive status">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="cc-steps">
        {steps.map((s, i) => (
          <div key={i} className={`cc-step ${i <= step ? 'cc-step-done' : ''} ${i === step ? 'cc-step-active' : ''}`}>
            <div className="cc-step-icon">{s.icon}</div>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="cc-body">
        {/* Left: AI Bot Panel */}
        <div className="cc-left">
          <div className="cc-bot-header">
            <span className="cc-bot-avatar">🤖</span>
            <div>
              <strong>AlumniConnect AI Bot</strong>
              <span className="cc-bot-status">● Online</span>
            </div>
          </div>

          {/* Drive Info Card */}
          {drive && (
            <div className="cc-drive-card">
              <div className="cc-drive-badge">ACTIVE DRIVE</div>
              <h3>{drive.companyName}</h3>
              <div className="cc-drive-details">
                <span>📅 {drive.driveDate}</span>
                <span>📊 Min CGPA: {drive.minCgpa}</span>
                <span>🎓 {drive.eligibleBranches?.join(', ')}</span>
              </div>
              <div className="cc-drive-stats">
                <div className="cc-stat">
                  <strong>{drive.invitedAlumni?.length || 0}</strong>
                  <span>Alumni Invited</span>
                </div>
                <div className="cc-stat">
                  <strong>{drive.acceptedAlumni?.length || 0}</strong>
                  <span>Accepted</span>
                </div>
                <div className="cc-stat">
                  <strong>{drive.registeredStudents?.length || 0}</strong>
                  <span>Students</span>
                </div>
              </div>
            </div>
          )}

          {/* AI Prompt Box */}
          {step < 2 && (
            <div className="cc-prompt-box">
              <label>💬 Give AI a command:</label>
              <div className="cc-prompt-suggestions">
                {['Find alumni who work at Microsoft', 'Search Tata Consultancy Services alumni', 'Find alumni at Infosys'].map((s) => (
                  <button key={s} className="cc-suggestion" onClick={() => setPrompt(s)}>{s}</button>
                ))}
              </div>
              <div className="cc-prompt-input-row">
                <input
                  className="cc-prompt-input"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                   placeholder="e.g. Find alumni who work in Microsoft..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                />
                <button className="cc-send-btn" onClick={handleAISearch} disabled={loading || !prompt.trim()}>
                  {loading ? '⏳' : '▶'}
                </button>
              </div>
              {botTyping && <div className="cc-typing">AI is thinking<span className="cc-dots">...</span></div>}
            </div>
          )}

          {/* Found Alumni List */}
          {step >= 2 && foundAlumni.length > 0 && (
            <div className="cc-alumni-list">
              <div className="cc-section-title">
                <span>👥 Matched Alumni ({foundAlumni.length})</span>
                {step === 2 && (
                  <button className="cc-select-all" onClick={() =>
                    setSelectedAlumni(selectedAlumni.length === foundAlumni.length ? [] : foundAlumni.map(a => a.id))
                  }>
                    {selectedAlumni.length === foundAlumni.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
              {foundAlumni.map((a) => (
                <div key={a.id} className={`cc-alumni-card ${selectedAlumni.includes(a.id) ? 'cc-alumni-selected' : ''}`}
                  onClick={() => step === 2 && setSelectedAlumni(prev =>
                    prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id]
                  )}>
                  <div className="cc-alumni-avatar">{a.name?.charAt(0)}</div>
                  <div className="cc-alumni-info">
                    <strong>{a.name}</strong>
                    <span>{a.role} · {a.company}</span>
                    <span className="cc-alumni-branch">{a.branch} · {a.passoutYear}</span>
                  </div>
                  {step === 2 && (
                    <div className={`cc-alumni-check ${selectedAlumni.includes(a.id) ? 'cc-check-on' : ''}`}>
                      {selectedAlumni.includes(a.id) ? '✓' : '○'}
                    </div>
                  )}
                  {step >= 3 && (
                    <div className={`cc-invite-status ${
                      drive?.acceptedAlumni?.find(x => x.alumniId === a.id) ? 'cc-status-accepted' : 'cc-status-invited'
                    }`}>
                      {drive?.acceptedAlumni?.find(x => x.alumniId === a.id) ? '✅ Accepted' : '📨 Invited'}
                    </div>
                  )}
                </div>
              ))}

              {/* Action Buttons */}
              {step === 2 && (
                <button className="cc-action-btn" onClick={handleSendInvites} disabled={loading || selectedAlumni.length === 0}>
                  {loading ? '⏳ Sending Email + SMS...' : `📧 📤 1-Click Email + SMS to ${selectedAlumni.length} Alumni`}
                </button>
              )}
              {step === 3 && (
                <div className="cc-waiting">
                  <span>⏳ Waiting for alumni to accept...</span>
                  <button className="cc-refresh-small" onClick={refreshDrive}>Check Status 🔄</button>
                </div>
              )}
              {step === 4 && (
                <button className="cc-action-btn cc-action-green" onClick={handleBroadcastStudents} disabled={loading}>
                  {loading ? '⏳ Broadcasting...' : '📢 Notify All Students via SMS + Email'}
                </button>
              )}
              {step >= 5 && (
                <div className="cc-success-banner">
                  🎉 Complete! Students notified. Community created. Webinar link sent!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Activity Log */}
        <div className="cc-right">
          <div className="cc-log-header">📋 Activity Log</div>
          {log.length === 0 && (
            <div className="cc-log-empty">Type a prompt to start the AI-powered flow...</div>
          )}
          <div className="cc-log-list">
            {log.map((entry, i) => (
              <div key={i} className={`cc-log-entry cc-log-${entry.type}`}>
                <span className="cc-log-time">{entry.time}</span>
                <span>{entry.msg}</span>
              </div>
            ))}
          </div>

          {/* Registered Students Panel (Step 5+) */}
          {drive?.registeredStudents?.length > 0 && (
            <div className="cc-students-panel">
              <div className="cc-section-title">🎓 Registered Students</div>
              {drive.registeredStudents.map((s) => (
                <div key={s.studentId} className={`cc-student-row ${s.isEligible ? 'cc-eligible' : 'cc-ineligible'}`}>
                  <span>{s.name}</span>
                  <span>CGPA: {s.cgpa}</span>
                  <span className={`cc-badge ${s.isEligible ? 'cc-badge-green' : 'cc-badge-red'}`}>
                    {s.isEligible ? '✅ Eligible' : '❌ Not Eligible'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
