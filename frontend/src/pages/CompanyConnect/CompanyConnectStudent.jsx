import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { studentProfileService } from '../../services/studentProfileService';
import { useSocket } from '../../context/SocketContext';
import './company-connect-v2.css';
export default function CompanyConnectStudent() {
  const {
      socket
    } = useSocket(),
    location = useLocation();
  const [drives, setDrives] = useState([]),
    [id, setId] = useState(new URLSearchParams(location.search).get('driveId') || ''),
    [profile, setProfile] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [roll, setRoll] = useState('');
  const lock = useRef(false),
    seq = useRef(0);
  const load = useCallback(async () => {
    const n = ++seq.current;
    setLoading(true);
    try {
      const [d, p] = await Promise.all([api.get('/company-connect/drives'), studentProfileService.getProfile()]);
      if (n !== seq.current) return;
      const rows = d.data.drives || [];
      setDrives(rows);
      setId(id => rows.some(r => r.id === id) ? id : rows[0]?.id || '');
      setProfile(p.data?.profile || p.data?.studentProfile || null);
      setError('');
    } catch (e) {
      if (n === seq.current) setError(e.response?.data?.message || 'Unable to load placement drives.');
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return () => {
      seq.current++;
    };
  }, [load]);
  useEffect(() => {
    socket?.on('company_connect:students_notified', load);
    socket?.on('connect', load);
    return () => {
      socket?.off('company_connect:students_notified', load);
      socket?.off('connect', load);
    };
  }, [socket, load]);
  const drive = drives.find(d => d.id === id),
    result = drive?.registeredStudents?.[0],
    closed = drive?.status === 'CLOSED' || drive?.driveDate < new Date().toISOString().slice(0, 10);
  async function submit(e) {
    e.preventDefault();
    if (lock.current || !drive) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await api.post('/company-connect/register', {
        driveId: drive.id,
        formDetails: {
          rollNumber: roll
        }
      });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Registration failed. Please retry.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return <main className="cc-student-page"><header className="cc-student-hero"><h1>Placement Drives</h1><p>Prepare with alumni who have experience at the hiring company.</p></header>{error && <p role="alert">{error} <button onClick={load}>Retry</button></p>}{loading && !drive ? <p role="status">Loading…</p> : !drive ? <section className="cc-student-card"><h2>No placement announcements yet</h2><p>Drives appear here after alumni mentors accept and Admin announces the drive.</p><button onClick={load}>Refresh</button></section> : <><section className="cc-student-card"><label>Choose a drive<select value={id} onChange={e => {
            setId(e.target.value);
            setRoll('');
            setError('');
          }} disabled={busy}>{drives.map(d => <option key={d.id} value={d.id}>{d.companyName} · {d.driveDate} · {d.status}</option>)}</select></label><h2>{drive.companyName}</h2><p>{drive.driveDate} · Minimum CGPA: {drive.minCgpa} · {drive.eligibleBranches?.join(', ') || 'All branches'} · {drive.eligibleYears?.length ? `Years ${drive.eligibleYears.join(', ')}` : 'All study years'}</p><div className="cc-mentors">{drive.acceptedAlumni?.map(a => <span key={a.alumniId}>{a.name}{a.company ? ` · ${a.company}` : ''}</span>)}</div></section><section className="cc-student-card">{result ? <><h2>{result.isEligible ? 'Registration confirmed' : 'Eligibility requirements not met'}</h2><p>Saved registration: {result.rollNumber}</p><ul>{result.eligibilityReasons?.map(r => <li key={r}>{r}</li>)}</ul>{result.isEligible ? <>{drive.communityId && <Link to={`/communities/placement-${drive.id}`}>Open placement community</Link>}{drive.webinarLink ? <a href={drive.webinarLink} target="_blank" rel="noopener noreferrer">Join guidance meeting</a> : <p>The meeting link has not been published yet.</p>}</> : <Link to="/student/profile">Review your student profile</Link>}</> : closed ? <h2>Registration closed</h2> : <><h2>Register for this drive</h2><p>Eligibility uses your saved profile. Update missing information before submitting.</p><p>Branch: {profile?.branch || 'Not provided'} · CGPA: {profile?.cgpa ?? 'Not provided'} · Study year: {profile?.currentYear ?? 'Not provided'}</p><Link to="/student/profile">Review profile</Link><form onSubmit={submit}><label>Roll number<input value={roll} onChange={e => setRoll(e.target.value)} maxLength={60} required disabled={busy} /></label><button disabled={busy} type="submit">{busy ? 'Checking eligibility…' : 'Register and check eligibility'}</button></form></>}</section></>}</main>;
}
