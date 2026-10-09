import React, { useEffect, useRef, useState } from 'react';
import { HeartHandshake, RefreshCw, Search, ChevronDown, ChevronUp, Info, Activity } from 'lucide-react';
import api from '../../services/api';
import './donation-prediction.css';

const FEATURES = { completedMentorships:'Completed mentorships', communityContributions:'Community posts & replies', hostedEvents:'Events created', postedJobs:'Published opportunities', attendedEvents:'Events attended', daysSinceLogin:'Days since last login' };
const value = (key, number) => number == null ? 'Not recorded' : key === 'daysSinceLogin' ? Math.floor(number) : number;
export default function DonationPredictionPage() {
  const [data,setData] = useState(null), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [query,setQuery] = useState(''), [band,setBand] = useState(''), [page,setPage] = useState(1), [refresh,setRefresh] = useState(0), [expanded,setExpanded] = useState(null), [exporting,setExporting] = useState(false), [exportError,setExportError] = useState('');
  const sequence = useRef(0);
  useEffect(() => {
    const seq = ++sequence.current;
    setLoading(true); setError(''); setExpanded(null);
    const timer = setTimeout(async () => {
      try { const res = await api.get('/admin/donations/predictions',{params:{q:query,band,page,limit:20}});
        if (!res.data.success) throw new Error(res.data.message || 'Prediction data is unavailable.');
        if (seq === sequence.current) setData(res.data.data);
      } catch (e) { if (seq===sequence.current) { setData(null); setError(e.response?.data?.message || e.message || 'Unable to load predictions.'); } }
      finally { if (seq===sequence.current) setLoading(false); }
    }, query ? 300 : 0);
    return () => { clearTimeout(timer); sequence.current++; };
  },[query,band,page,refresh]);
  const exportSnapshot = async () => {
    if (exporting) return;
    setExporting(true); setExportError('');
    try {
      const result = await api.get('/admin/donations/snapshots.csv',{responseType:'blob'});
      const url = URL.createObjectURL(result.data);
      const link = document.createElement('a'); link.href=url; link.download='donation-engagement-snapshots.csv';
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch { setExportError('Could not download the snapshot. Please retry.'); }
    finally { setExporting(false); }
  };
  const trained = data?.model?.mode === 'trained_model';
  return <div className="donation-view">
    <section className="donation-hero"><div><span><HeartHandshake size={17}/>Fundraising insights</span><h1>Donation Prediction</h1><p>Understand alumni engagement and plan thoughtful fundraising outreach.</p></div><button onClick={() => setRefresh(v=>v+1)} disabled={loading}><RefreshCw size={17}/>{loading ? 'Loading…' : 'Refresh'}</button></section>
    <div className="donation-notice" role="note"><Info size={20}/><div><strong>{data ? trained ? 'Historical-outcome model' : 'Preliminary engagement baseline' : 'Prediction methodology'}</strong><p>{data?.model.notice || 'Donation probabilities require real historical outcomes. Until a trained model is configured, this feature displays an engagement score only.'}</p><p>These insights support human review. They do not indicate financial capacity, consent to contact, or a promise to donate.</p></div></div>
    {error && <div className="donation-error" role="alert"><p>{error}</p><button onClick={()=>setRefresh(v=>v+1)}>Retry</button></div>}
    {exportError && <div className="donation-error" role="alert">{exportError}</div>}
    <div className="donation-stats">{[['Alumni assessed',data?.summary.total],['High score',data?.summary.High],['Medium score',data?.summary.Medium],['Low score',data?.summary.Low]].map(([label,count])=><article key={label}><Activity size={22}/><strong>{loading ? '…' : count ?? '—'}</strong><span>{label}</span></article>)}</div>
    <section className="donation-card"><div className="donation-toolbar"><label><Search size={18}/><input aria-label="Search alumni by name or company" placeholder="Search name or company…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label><select aria-label="Filter by score band" value={band} onChange={e=>{setBand(e.target.value);setPage(1);}}><option value="">All score bands</option>{['High','Medium','Low'].map(b=><option key={b}>{b}</option>)}</select>{(query || band) && <button onClick={()=>{setQuery('');setBand('');setPage(1);}}>Clear filters</button>}</div>
      <div className="donation-list-heading"><h2>{trained ? 'Estimated donation likelihood' : 'Alumni engagement scores'}</h2><p>{data?.scoreMeaning || 'Scores use activity recorded during the last 90 days.'}</p><small>High ≥60 · Medium 30–59.9 · Low &lt;30. These are score bands, not confidence ratings.</small></div>
      {loading ? <div role="status" aria-label="Loading donation predictions" className="donation-loading">{[1,2,3].map(i=><div key={i}/>)}</div> : !error && !data?.predictions.length ? <div className="donation-empty"><HeartHandshake size={35}/><h3>No alumni found</h3><p>{query || band ? 'Try another name or score band.' : 'Predictions will appear when Alumni accounts are available.'}</p></div> : !error && data.predictions.map(person=><article className="donation-person" key={person.id}><div className="donation-person-main"><span className="donation-avatar">{[person.firstName?.[0],person.lastName?.[0]].join('')}</span><div className="donation-name"><h3>{person.firstName} {person.lastName}</h3><p>{[person.jobRole,person.company].filter(Boolean).join(' at ') || 'Alumni'}</p></div><div className="donation-score"><b>{person.score}{trained ? '%' : ' / 100'}</b><span className={`donation-band ${person.band.toLowerCase()}`}>{person.band}</span></div><button aria-label={`View score details for ${person.firstName} ${person.lastName}`} aria-expanded={expanded===person.id} onClick={()=>setExpanded(expanded===person.id ? null : person.id)}>{expanded===person.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button></div>
        {expanded===person.id && <div className="donation-details"><h4>Recorded engagement · last 90 days</h4><div>{Object.entries(FEATURES).map(([key,label])=><p key={key}><span>{label}</span><b>{value(key,person.features[key])}</b></p>)}</div><h4>{trained ? 'Model contributions (log-odds)' : 'How the engagement score is formed'}</h4><p className="donation-detail-note">{trained ? 'Positive values raise the model estimate; negative values lower it. These associations are not causes of donating.' : 'Mentorships: up to 25 points; community: 20; events created: 15; jobs: 15; attendance: 10; login recency: 15. Counts are capped and recency decays over time.'}</p><div>{person.signals.map(signal=><p key={signal.feature}><span>{FEATURES[signal.feature]}</span><b>{signal.contribution>0?'+':''}{signal.contribution}{trained?'':' pts'}</b></p>)}</div></div>}
      </article>)}
      {!loading && data?.pagination.totalPages>1 && <nav aria-label="Prediction pages" className="donation-pagination"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page} of {data.pagination.totalPages}</span><button disabled={page>=data.pagination.totalPages} onClick={()=>setPage(p=>p+1)}>Next</button></nav>}
    </section>
    {data && !loading && <footer className="donation-method"><strong>Method & data</strong><button className="donation-export" disabled={exporting} onClick={exportSnapshot}>{exporting ? 'Downloading�' : 'Download training snapshot'}</button><p>Snapshot download includes engagement counts and alumni IDs only. Donation outcomes are left blank; fill them from real observations after the 90-day outcome window.</p><p>Model: {data.model.version} · Updated {new Date(data.generatedAt).toLocaleString()} · {data.pagination.total} matching alumni</p><p>Activity window: {new Date(data.featuresSince).toLocaleDateString()} to {new Date(data.generatedAt).toLocaleDateString()}. Jobs and events count published/closed or completed records created in this window. Login recency uses the last recorded login. Names and companies are displayed for identification and are not model inputs.</p>{trained && <p>Held-out test: {data.model.metrics.testRows} alumni · Brier score {data.model.metrics.brierScore.toFixed(3)} (lower is better) · constant-rate baseline {data.model.metrics.baselineBrierScore.toFixed(3)}. This evaluation does not guarantee future accuracy.</p>}</footer>}
  </div>;
}
