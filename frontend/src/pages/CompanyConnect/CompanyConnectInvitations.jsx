import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { Building2, CalendarDays, CheckCircle2, ArrowRight, Video, X, RefreshCw } from 'lucide-react';
import './company-connect-invitations.css';
export default function CompanyConnectInvitations() {
  const {
      socket
    } = useSocket(),
    location = useLocation(),
    seq = useRef(0),
    lock = useRef(false);
  const [drives, setDrives] = useState([]),
    [selected, setSelected] = useState(new URLSearchParams(location.search).get('driveId') || ''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const n = ++seq.current;
    try {
      const res = await api.get('/company-connect/drives');
      if (n !== seq.current) return;
      const rows = res.data.drives || [];
      setDrives(rows);
      setSelected(id => rows.some(d => d.id === id) ? id : rows.find(d => d.invitedAlumni?.[0]?.status === 'INVITED')?.id || rows[0]?.id || '');
      setError('');
    } catch {
      if (n === seq.current) setError('Placement invitations could not be loaded.');
    }
  }, []);
  useEffect(() => {
    load();
    return () => {
      seq.current++;
    };
  }, [load]);
  useEffect(() => {
    const events = ['company_connect:invites_sent', 'company_connect:invite_updated', 'connect'];
    events.forEach(e => socket?.on(e, load));
    return () => events.forEach(e => socket?.off(e, load));
  }, [socket, load]);
  const drive = drives.find(d => d.id === selected),
    invite = drive?.invitedAlumni?.[0],
    closed = drive?.status === 'CLOSED' || drive?.driveDate < new Date().toISOString().slice(0, 10);
  async function respond(action) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await api.post('/company-connect/respond', {
        driveId: drive.id,
        action
      });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to save your response.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!drive && !error) return null;
  const accepted = invite?.status === 'ACCEPTED';
  const status = closed ? 'Drive closed' : accepted ? 'Invitation accepted' : invite?.status === 'INVITED' ? 'Awaiting your response' : 'Invitation declined';
  const date = drive?.driveDate ? new Date(`${drive.driveDate.slice(0,10)}T12:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '';
  return <section className="aci-card" aria-label="Company Connect placement invitation">
    {error && <div className="aci-error" role="alert"><span>{error}</span><button onClick={load} disabled={busy}><RefreshCw size={14}/>Retry</button></div>}
    {drive && <>
      <div className="aci-header"><span className="aci-icon"><Building2 size={24}/></span><div className="aci-title"><span className="aci-eyebrow">Company Connect · Placement guidance</span><h2>{drive.companyName}</h2></div><span className={`aci-status ${accepted?'accepted':''}`} role="status">{accepted && <CheckCircle2 size={13}/>} {status}</span></div>
      {drives.length > 1 && <select className="aci-selector" aria-label="Placement invitation" value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)}>{drives.map(d=><option key={d.id} value={d.id}>{d.companyName} · {d.driveDate}</option>)}</select>}
      <div className="aci-description"><p>{accepted?'Thank you for guiding students. Your placement community is ready for coordination and resources.':'Share your company experience and help students prepare for this placement drive.'}</p><span className="aci-date"><CalendarDays size={14}/>{date}</span></div>
      {invite?.status === 'INVITED' && !closed && <div className="aci-actions"><button className="aci-primary" disabled={busy} onClick={()=>respond('ACCEPT')}><CheckCircle2 size={16}/>{busy?'Saving…':'Accept invitation'}</button><button className="aci-secondary" disabled={busy} onClick={()=>respond('DECLINE')}><X size={15}/>Decline</button></div>}
      {accepted && <div className="aci-actions">{drive.communityId && <Link className="aci-primary" to={`/communities/placement-${drive.id}`}>Open placement community<ArrowRight size={16}/></Link>}{drive.webinarLink && <a className="aci-secondary" href={drive.webinarLink} target="_blank" rel="noopener noreferrer"><Video size={16}/>Guidance meeting</a>}</div>}
    </>}
  </section>;
}
