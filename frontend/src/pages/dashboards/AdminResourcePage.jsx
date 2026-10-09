import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RefreshCw, Eye } from 'lucide-react';
import api from '../../services/api';
import { AdminError, AdminLoading, AdminEmpty, AdminPager, AdminDialog } from '../../components/AdminUI';
const titles = {
  users: 'Users',
  alumni: 'Alumni',
  students: 'Students',
  mentorship: 'Mentorship',
  jobs: 'Jobs & Placements',
  events: 'Events',
  community: 'Community Moderation',
  companies: 'Companies'
};
const states = {
  mentorship: ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
  jobs: ['ACTIVE', 'CLOSED', 'DRAFT'],
  events: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'],
  community: ['ACTIVE', 'FLAGGED', 'HIDDEN', 'DELETED']
};
const fullName = u => [u?.firstName, u?.lastName].filter(Boolean).join(' ');
const date = d => d ? new Date(d).toLocaleDateString() : '—';
const display = value => value === null || value === undefined ? 'Not recorded' : Array.isArray(value) ? value.join(', ') || 'None' : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value);
function describe(resource, r) {
  if (['users', 'alumni', 'students'].includes(resource)) return [fullName(r), r.email, r.role, r.alumniProfile?.currentCompany || r.studentProfile?.branch || '—'];
  if (resource === 'mentorship') return [r.topic || 'Mentorship request', `${fullName(r.student)} → ${fullName(r.alumni)}`, r.status, date(r.createdAt)];
  if (resource === 'jobs') return [r.title, r.company, r.status, `${r._count?.applications || 0} applications`];
  if (resource === 'events') return [r.title, date(r.startDate), r.status, `${r._count?.registrations || 0} registrations`];
  if (resource === 'community') return [r.title, r.community?.name, r.status, fullName(r.author)];
  return [r.name, 'Current alumni employers & job postings', `${r.alumni} alumni`, `${r.jobs} jobs`];
}
function detailEntries(resource, r) {
  if (['users', 'alumni', 'students'].includes(resource)) return Object.entries({
    Name: fullName(r),
    Email: r.email,
    Role: r.role,
    'Last sign-in': r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString() : null,
    Registered: date(r.createdAt),
    ...(r.alumniProfile || r.studentProfile || {})
  });
  if (resource === 'mentorship') return Object.entries({
    Topic: r.topic,
    Student: fullName(r.student),
    Alumni: fullName(r.alumni),
    Status: r.status,
    'Student message': r.message,
    Goals: r.goals,
    'Response note': r.responseNote,
    Created: date(r.createdAt),
    Updated: date(r.updatedAt)
  });
  if (resource === 'companies') return Object.entries({
    Company: r.name,
    'Current alumni': r.alumni,
    'Posted jobs': r.jobs
  });
  return Object.entries(r).filter(([key, val]) => !['id', 'alumniId', 'creatorId', 'authorId', 'communityId', '_count'].includes(key) && typeof val !== 'object');
}
export default function AdminResourcePage({
  resource
}) {
  const location = useLocation(),
    [q, setQ] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0),
    [selected, setSelected] = useState(null),
    [confirm, setConfirm] = useState(null),
    [saving, setSaving] = useState(false),
    [actionError, setActionError] = useState(''),
    [limit, setLimit] = useState(() => Math.max(3, Math.min(8, Math.floor((window.innerHeight - 310) / 58))));
  const seq = useRef(0),
    inFlight = useRef(false);
  useEffect(() => {
    setQ(new URLSearchParams(location.search).get('q') || '');
    setStatus('');
    setPage(1);
    setSelected(null);
  }, [resource, location.search]);
  useEffect(() => {
    const resize = () => {
      setLimit(Math.max(3, Math.min(8, Math.floor((window.innerHeight - 310) / 58))));
      setPage(1);
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const endpoint = resource === 'companies' ? '/admin/companies' : `/admin/resources/${resource}`;
        const res = await api.get(endpoint, {
          params: {
            q,
            status,
            page,
            limit
          }
        });
        if (id === seq.current) setData(res.data.data);
      } catch (e) {
        if (id === seq.current) {
          setData(null);
          setError(e.response?.data?.message || 'Could not load records.');
        }
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, q ? 250 : 0);
    return () => {
      clearTimeout(timer);
      seq.current++;
    };
  }, [resource, q, status, page, limit, refresh]);
  const changeStatus = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setActionError('');
    try {
      await api.patch(`/admin/resources/${resource}/${selected.id}/status`, {
        status: confirm
      });
      setSelected(null);
      setConfirm(null);
      setRefresh(n => n + 1);
    } catch (e) {
      setActionError(e.response?.data?.message || 'Update failed.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  const close = () => {
    if (inFlight.current) return;
    setSelected(null);
    setConfirm(null);
    setActionError('');
  };
  return <main className="admin-page"><div className="admin-page-heading"><div><h1>{titles[resource]}</h1><p>{resource === 'users' || resource === 'students' || resource === 'alumni' ? 'Registered accounts · Student and Alumni approval is not required.' : resource === 'companies' ? 'Companies from real career profiles and job postings.' : 'Review and manage real platform records.'}</p></div><button className="admin-secondary" disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={16} />Refresh</button></div>
    <div className="admin-toolbar"><input aria-label={`Search ${titles[resource]}`} placeholder="Search records…" value={q} onChange={e => {
        setQ(e.target.value);
        setPage(1);
      }} />{states[resource] && <select aria-label="Filter by status" value={status} onChange={e => {
        setStatus(e.target.value);
        setPage(1);
      }}><option value="">All statuses</option>{states[resource].map(s => <option key={s}>{s}</option>)}</select>}{(q || status) && <button className="admin-secondary" onClick={() => {
        setQ('');
        setStatus('');
        setPage(1);
      }}>Reset</button>}{resource === 'jobs' && <Link className="admin-action" to="/jobs">Jobs portal</Link>}{resource === 'events' && <Link className="admin-action" to="/events">Events hub</Link>}</div><AdminError error={error} retry={() => setRefresh(n => n + 1)} />
    <section className="admin-panel admin-resource-list">{loading ? <AdminLoading /> : !data?.records.length ? <AdminEmpty>{error ? 'Records are unavailable.' : 'No matching records.'}</AdminEmpty> : <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>{resource === 'companies' ? 'Company' : 'Record'}</th><th>{resource === 'companies' ? 'Alumni' : 'Status / Role'}</th><th>Details</th><th>Action</th></tr></thead><tbody>{data.records.map(r => {
              const [title, subtitle, badge, detail] = describe(resource, r);
              return <tr key={r.id}><td><strong>{title}</strong><small>{subtitle}</small></td><td><span className="admin-status">{badge}</span></td><td>{detail}</td><td><button className="admin-secondary" aria-label={`View ${title}`} onClick={() => {
                    setSelected(r);
                    setConfirm(null);
                    setActionError('');
                  }}><Eye size={14} /><span>View</span></button></td></tr>;
            })}</tbody></table></div>}{data && <AdminPager pagination={data.pagination} loading={loading} onPage={setPage} />}</section>
    {selected && <AdminDialog title={describe(resource, selected)[0]} onClose={close}><dl className="admin-detail-grid">{detailEntries(resource, selected).map(([key, val]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{display(val)}</dd></div>)}</dl><AdminError error={actionError} /><div className="admin-detail-actions">{resource === 'jobs' && selected.status !== 'DRAFT' && <button className="admin-action" disabled={saving} onClick={() => setConfirm(selected.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE')}>{selected.status === 'ACTIVE' ? 'Close opportunity' : 'Reopen opportunity'}</button>}{resource === 'events' && !['COMPLETED', 'CANCELLED'].includes(selected.status) && <button className="admin-action" disabled={saving} onClick={() => setConfirm('CANCELLED')}>Cancel event</button>}{resource === 'community' && selected.status !== 'DELETED' && ['ACTIVE', 'HIDDEN', 'FLAGGED'].filter(s => s !== selected.status).map(s => <button key={s} className="admin-secondary" disabled={saving} onClick={() => setConfirm(s)}>Set {s.toLowerCase()}</button>)}{resource === 'community' && <Link className="admin-secondary" to={`/communities/${selected.community.slug}`}>Open community</Link>}{resource === 'companies' && <Link className="admin-action" to={`/admin/company-connect?company=${encodeURIComponent(selected.name)}`}>Find alumni for this company</Link>}</div>{confirm && <div className="admin-error" style={{
        marginTop: 15
      }}><span>Set this record to {confirm}? This updates the database.</span><button disabled={saving} onClick={changeStatus}>{saving ? 'Saving…' : 'Confirm'}</button><button disabled={saving} onClick={() => setConfirm(null)}>Cancel</button></div>}</AdminDialog>}
  </main>;
}
