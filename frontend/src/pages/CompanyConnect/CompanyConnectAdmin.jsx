import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Building2, Plus, RefreshCw, Search, Send, Users, CalendarDays } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { AdminDialog, AdminEmpty, AdminError, AdminLoading, AdminPager } from '../../components/AdminUI';
import './company-connect-v2.css';
import CompanyConnectWorkflow from './CompanyConnectWorkflow';
const initial = {
  companyName: '',
  driveDate: '',
  minCgpa: '0',
  eligibleBranches: '',
  eligibleYears: '',
  webinarLink: ''
};
const err = e => e.response?.data?.message || e.response?.data?.error || e.message;
function LocalPager({
  items,
  page,
  onPage,
  size = 6
}) {
  return items.length > size && <AdminPager pagination={{
    page,
    total: items.length,
    totalPages: Math.ceil(items.length / size)
  }} onPage={onPage} />;
}
export default function CompanyConnectAdmin() {
  const {
      socket
    } = useSocket(),
    location = useLocation();
  const [drives, setDrives] = useState([]),
    [driveId, setDriveId] = useState(''),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [tab, setTab] = useState('overview'),
    [search, setSearch] = useState(''),
    [matches, setMatches] = useState([]),
    [selected, setSelected] = useState([]),
    [searched, setSearched] = useState(false),
    [searchContext, setSearchContext] = useState(null),
    [searching, setSearching] = useState(false),
    [page, setPage] = useState(1),
    [dialog, setDialog] = useState(null),
    [form, setForm] = useState(initial),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(''),
    [notice, setNotice] = useState(''),
    [emailConfigured, setEmailConfigured] = useState(null);
  const seq = useRef(0),
    searchSeq = useRef(0),
    lock = useRef(false);
  const drive = drives.find(d => d.id === driveId);
  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/company-connect/drives');
      if (id === seq.current) {
        setDrives(res.data.drives || []);
        setEmailConfigured(res.data.emailConfigured);
        setDriveId(current => res.data.drives.some(d => d.id === current) ? current : res.data.drives[0]?.id || '');
      }
    } catch (e) {
      if (id === seq.current) setError(err(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return () => {
      seq.current++;
      searchSeq.current++;
    };
  }, [load]);
  useEffect(() => {
    if (!socket) return;
    const events = ['company_connect:alumni_accepted', 'company_connect:students_notified', 'company_connect:student_registered', 'company_connect:invites_sent', 'connect'];
    events.forEach(e => socket.on(e, load));
    return () => events.forEach(e => socket.off(e, load));
  }, [socket, load]);
  useEffect(() => {
    searchSeq.current++;
    setSearching(false);
    setPage(1);
    setMatches([]);
    setSelected([]);
    setSearched(false);
    setSearch(drive?.companyName || new URLSearchParams(location.search).get('company') || '');
  }, [driveId, location.search]);
  const runSearch = async (company = search) => {
    if (!company.trim()) return;
    setSearch(company);setTab('alumni');
    const id = ++searchSeq.current;
    setSearching(true);
    setActionError('');
    try {
      const res = await api.post('/company-connect/search-alumni', {
        companyName: company.trim()
      });
      if (id === searchSeq.current) {
        setMatches(res.data.alumni || []);
        setSearchContext(res.data.context);
        setSelected([]);
        setSearched(true);
        setPage(1);
      }
    } catch (e) {
      if (id === searchSeq.current) setActionError(err(e));
    } finally {
      if (id === searchSeq.current) setSearching(false);
    }
  };
  const perform = async kind => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError('');
    try {
      let response;
      if (kind === 'create') {
        const body = {
          ...form,
          minCgpa: Number(form.minCgpa),
          eligibleBranches: form.eligibleBranches.split(',').map(s => s.trim()).filter(Boolean),
          eligibleYears: form.eligibleYears.split(',').map(s => s.trim()).filter(Boolean).map(Number)
        };
        response = await api.post('/company-connect/drives', body);
        setDriveId(response.data.drive.id);
        setNotice('Drive saved to PostgreSQL.');
      } else if (kind === 'invite' || kind === 'retry') {
        response = await api.post(kind === 'retry' ? '/company-connect/retry-invite-emails' : '/company-connect/send-invites', {
          driveId,
          alumniIds: selected
        });
        const sent = response.data.invited || [];
        setNotice(`${sent.length} new in-app invitations saved; ${response.data.skipped} already invited. Email sent: ${sent.filter(i => i.delivery?.email === 'sent').length}. Delivery details appear in invitation records.`);
        setSelected([]);
      } else if (kind === 'broadcast') {
        response = await api.post('/company-connect/broadcast-students', {
          driveId
        });
        setNotice(response.data.alreadyNotified ? 'Students have already been notified. No duplicate notifications sent.' : `${response.data.notifiedCount} student in-app announcements saved. Email sent: ${response.data.delivery?.filter(d => d.email === 'sent').length || 0}.`);
      } else {
        await api.patch(`/company-connect/drives/${driveId}/close`);
        setNotice('Drive closed. Existing registrations remain available.');
      }
      setDialog(null);
      await load();
    } catch (e) {
      setActionError(err(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const closeDialog = () => {
    if (lock.current) return;
    setDialog(null);
    setActionError('');
  };
  const invitations = drive?.invitedAlumni || [],
    students = drive?.registeredStudents || [],
    accepted = drive?.acceptedAlumni || [];
  const open = drive && drive.status !== 'CLOSED' && drive.driveDate >= new Date().toISOString().slice(0, 10);
  return <main className="admin-page cc-v2"><div className="admin-page-heading"><div><h1>Company Connect</h1><p>Find experienced alumni, invite mentors and prepare students for placement drives.</p></div><div className="cc-button-row"><button className="admin-secondary" onClick={load} disabled={loading} aria-label="Refresh placement drives"><RefreshCw size={16} /></button><button className="admin-action" onClick={() => {
          setForm({
            ...initial,
            companyName: new URLSearchParams(location.search).get('company') || ''
          });
          setDialog('create');
          setActionError('');
        }}><Plus size={16} />Create Drive</button></div></div><AdminError error={error} retry={load} />{emailConfigured === false && <p className="cc-notice" role="status">Email sending is not configured. Configure your email provider before sending invitations. Failed emails can be retried from invitation records.</p>}{notice && <div className="cc-notice" role="status"><span>{notice}</span><button aria-label="Dismiss status" onClick={() => setNotice('')}>×</button></div>}
    <CompanyConnectWorkflow drive={drive} searched={searched} matches={matches} searching={searching} onSearch={runSearch}/>{loading && !drives.length ? <AdminLoading /> : !drives.length ? <section className="admin-panel cc-flex-panel"><AdminEmpty><Building2 size={36} /><strong>No placement drives yet</strong><p>Create a drive with a real date and criteria. Alumni search uses current and previous company records, not an AI model.</p><button className="admin-action" onClick={() => setDialog('create')}>Create your first drive</button></AdminEmpty></section> : <><div className="admin-toolbar"><select aria-label="Select placement drive" value={driveId} onChange={e => {
          setDriveId(e.target.value);
          setTab('overview');
        }}>{drives.map(d => <option key={d.id} value={d.id}>{d.companyName} · {d.driveDate} · {d.status.replaceAll('_', ' ')}</option>)}</select><span className="admin-status">{drive?.status.replaceAll('_', ' ')}</span><div className="cc-tabs">{['overview', 'alumni', 'students'].map(t => <button key={t} aria-pressed={tab === t} onClick={() => {
            setTab(t);
            setPage(1);
            setActionError('');
          }}>{t === 'overview' ? 'Drive Details' : t === 'alumni' ? `Alumni (${invitations.length})` : `Students (${students.length})`}</button>)}</div></div><AdminError error={!dialog ? actionError : ''} />
      <section className="admin-panel cc-flex-panel">{tab === 'overview' ? <div className="cc-overview"><div><h2>{drive?.companyName} placement preparation</h2><dl className="admin-detail-grid">{[['Drive date', drive?.driveDate], ['CGPA cutoff', drive?.minCgpa], ['Eligible branches', drive?.eligibleBranches?.join(', ') || 'All branches'], ['Study years', drive?.eligibleYears?.join(', ') || 'All years'], ['Meeting link', drive?.webinarLink || 'Not added'], ['Storage', 'PostgreSQL']].map(([label, val]) => <div key={label}><dt>{label}</dt><dd>{val}</dd></div>)}</dl><div className="cc-button-row"><button className="admin-action" disabled={!open} onClick={() => {
                setTab('alumni');
                setPage(1);
              }}>Find alumni</button><button className="admin-secondary" disabled={!open || !accepted.length || !!drive?.broadcastAt || drive?.eligibleStudentCount===0} onClick={() => setDialog('broadcast')}>Announce to Students</button><button className="admin-secondary" disabled={drive?.status === 'CLOSED'} onClick={() => setDialog('close')}>Close Drive</button>{drive?.communityId && <Link className="admin-secondary" to={`/communities/placement-${drive.id}`}>Open Community</Link>}</div><p className="cc-caption" role="status">{!open ? 'This drive is closed or past its date.' : drive?.broadcastAt ? 'Students have already been notified.' : !accepted.length ? 'Student announcement unlocks after at least one invited alumnus accepts.' : drive?.eligibleStudentCount===0?'No saved student profiles meet the criteria. Complete student profiles or review the drive requirements.':`${drive?.eligibleStudentCount??0} eligible student profiles. You can announce this drive now.`}</p></div><aside><h3>How this works</h3><ol><li>Create a drive and set the criteria.</li><li>Search current and previous company experience.</li><li>Review recipients and send invitations.</li><li>Alumni accept directly from their email. A private community is created and an availability email follows.</li><li>Announce to students after a mentor accepts.</li><li>Saved student profiles determine eligibility. Eligible students enter a private community.</li></ol><p>{accepted.length} mentors accepted · {students.filter(s => s.isEligible).length} eligible registrations.</p></aside></div> : tab === 'alumni' ? <><form className="admin-toolbar" onSubmit={e => {
            e.preventDefault();
            runSearch();
          }}><input aria-label="Company name to search alumni" placeholder="Company name" value={search} onChange={e => setSearch(e.target.value)} /><button className="admin-secondary" disabled={searching || !search.trim()}><Search size={15} />{searching ? 'Searching…' : 'Search alumni'}</button><button type="button" className="admin-action" disabled={!open || !selected.length || busy} onClick={() => setDialog('invite')}><Send size={14} />Invite Selected ({selected.length})</button></form><p className="cc-caption">Company keyword matching · Invitations are sent only after you review recipients.</p><div className="admin-table-scroll">{searched ? <>{!matches.length ? <AdminEmpty><strong>No alumni profiles match “{search}”.</strong><p>{searchContext?.totalAlumni ?? 0} alumni accounts exist. Recorded current companies: {searchContext?.recordedCompanies?.join(', ') || 'None provided'}.</p><p>Add the hiring company to the alumnus’s current or previous experience, or search a company actually recorded in their profile.</p><Link to="/admin/alumni">Review alumni profiles</Link></AdminEmpty> : <table className="admin-table"><thead><tr><th>Select</th><th>Alumni</th><th>Match</th><th>Invitation</th></tr></thead><tbody>{matches.slice((page - 1) * 6, page * 6).map(a => {
                    const inv = invitations.find(i => i.alumniId === a.id);
                    return <tr key={a.id}><td><input type="checkbox" aria-label={`Select ${a.name}`} disabled={!!inv || !open} checked={selected.includes(a.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id))} /></td><td><strong>{a.name}</strong><small>{[a.role, a.company].filter(Boolean).join(' · ') || 'Professional details not recorded'}</small></td><td>{a.matchReason}</td><td>{inv?.status || 'Not invited'}</td></tr>;
                  })}</tbody></table>}</> : !invitations.length ? <AdminEmpty>Search a company to select alumni for this drive.</AdminEmpty> : <table className="admin-table"><thead><tr><th>Invited alumni</th><th>Response</th><th>Email</th><th>Acceptance follow-up</th></tr></thead><tbody>{invitations.slice((page - 1) * 6, page * 6).map(i => <tr key={i.id}><td><strong>{i.name}</strong><small>{i.email}</small></td><td><span className="admin-status">{i.status}</span></td><td>{i.delivery?.email || 'Pending'}{i.status === 'INVITED' && i.delivery?.email !== 'sent' && open && <button className="admin-secondary" onClick={() => {
                      setSelected([i.alumniId]);
                      setDialog('retry');
                    }}>Retry email</button>}</td><td>{i.delivery?.availabilityEmail ? `Availability: ${i.delivery.availabilityEmail} · Admin: ${i.delivery.adminEmail}` : 'After acceptance'}</td></tr>)}</tbody></table>}</div><div className="cc-button-row"><button className="admin-secondary" onClick={() => {
              setSearched(false);
              setPage(1);
            }}>View invitation records</button></div><LocalPager items={searched ? matches : invitations} page={page} onPage={setPage} /></> : <><h2>Student registrations</h2><p className="cc-caption">Eligibility uses saved CGPA, branch and study year. Registration is stored once per student and drive.</p><div className="admin-table-scroll">{!students.length ? <AdminEmpty>{drive?.broadcastAt ? 'No students have registered yet.' : 'Students can register after the announcement.'}</AdminEmpty> : <table className="admin-table"><thead><tr><th>Student</th><th>Branch / Year</th><th>CGPA</th><th>Outcome</th></tr></thead><tbody>{students.slice((page - 1) * 6, page * 6).map(s => <tr key={s.id}><td><strong>{s.name}</strong><small>{s.rollNumber}</small></td><td>{s.branch || 'Missing'} · {s.currentYear ?? 'Missing'}</td><td>{s.cgpa ?? 'Missing'}</td><td><span className="admin-status">{s.status}</span><small>{s.eligibilityReasons.join('; ')}</small></td></tr>)}</tbody></table>}</div><LocalPager items={students} page={page} onPage={setPage} /></>}</section></>}
    {dialog && <AdminDialog title={dialog === 'create' ? 'Create Placement Drive' : dialog === 'invite' || dialog === 'retry' ? 'Review Alumni Invitations' : dialog === 'broadcast' ? 'Review Student Announcement' : 'Close Placement Drive'} onClose={closeDialog}><AdminError error={actionError} />{dialog === 'create' ? <form className="cc-create-form" onSubmit={e => {
        e.preventDefault();
        perform('create');
      }}>{[['companyName', 'Company name', 'text'], ['driveDate', 'Drive date', 'date'], ['minCgpa', 'Minimum CGPA (0–10)', 'number'], ['eligibleBranches', 'Eligible branches (comma-separated; blank = all)', 'text'], ['eligibleYears', 'Eligible study years (comma-separated; blank = all)', 'text'], ['webinarLink', 'Meeting link (optional HTTP/S URL)', 'url']].map(([key, label, type]) => <label key={key}>{label}<input type={type} required={['companyName', 'driveDate', 'minCgpa'].includes(key)} min={key === 'minCgpa' ? 0 : key === 'driveDate' ? new Date().toISOString().slice(0, 10) : undefined} max={key === 'minCgpa' ? 10 : undefined} step={key === 'minCgpa' ? '.01' : undefined} value={form[key]} onChange={e => setForm(f => ({
            ...f,
            [key]: e.target.value
          }))} /></label>)}<button className="admin-action" disabled={busy}>{busy ? 'Saving…' : 'Save Drive'}</button></form> : <div className="cc-confirm"><p>{dialog === 'invite' || dialog === 'retry' ? `Send in-app invitations, and attempt configured email delivery, to ${selected.length} selected alumni for ${drive?.companyName}. Already invited alumni will be skipped.` : dialog === 'broadcast' ? `Announce ${drive?.companyName} to students whose saved profiles meet this drive’s criteria. In-app notifications are saved; configured email delivery is reported separately.` : 'Close this drive to new responses and registrations. Existing data is retained.'}</p>{dialog === 'invite' && <ul>{matches.filter(a => selected.includes(a.id)).map(a => <li key={a.id}>{a.name} · {a.email}</li>)}</ul>}<button className="admin-action" disabled={busy} onClick={() => perform(dialog)}>{busy ? 'Working…' : 'Confirm'}</button><button className="admin-secondary" disabled={busy} onClick={closeDialog}>Cancel</button></div>}</AdminDialog>}
  </main>;
}
