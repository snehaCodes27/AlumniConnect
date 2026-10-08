import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { eventService } from '../../services/eventService';
import { studentProfileService } from '../../services/studentProfileService';
import CreateEventModal from '../../components/CreateEventModal';
import { PortalHero, PortalEmpty, PortalDialog } from '../../components/PortalUI';
import { collectPortalPages, eventHasEnded, eventRegistrationClosed, safeExternalUrl } from './portalUtils';
import { CalendarDays, Clock, MapPin, Users, Search, Plus, RefreshCw, ExternalLink, Edit3, Megaphone } from 'lucide-react';

const TYPES=['WEBINAR','WORKSHOP','NETWORKING','SEMINAR','PANEL_DISCUSSION'];
const fmt=value=>value ? new Date(value).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}) : '';

export default function EventsHubPage() {
  const {user}=useAuth(), {socket}=useSocket(), navigate=useNavigate();
  const [params]=useSearchParams(), routeQuery=params.get('q') || '';
  const canHost=['ALUMNI','ADMIN'].includes(user?.role), isStudent=user?.role==='STUDENT';
  const [tab,setTab]=useState('browse'), [events,setEvents]=useState([]), [registrations,setRegistrations]=useState([]), [created,setCreated]=useState([]);
  const [loading,setLoading]=useState(true), [refreshing,setRefreshing]=useState(false), [error,setError]=useState(''), [notice,setNotice]=useState('');
  const [search,setSearch]=useState(routeQuery), [query,setQuery]=useState(routeQuery), [type,setType]=useState(''), [category,setCategory]=useState(''), [date,setDate]=useState('');
  const [create,setCreate]=useState(false), [editing,setEditing]=useState(null), [detail,setDetail]=useState(null);
  const [registerTarget,setRegisterTarget]=useState(null), [profile,setProfile]=useState(null), [profileLoading,setProfileLoading]=useState(false), [registrationError,setRegistrationError]=useState('');
  const [registrantTarget,setRegistrantTarget]=useState(null), [registrants,setRegistrants]=useState([]), [registrantsLoading,setRegistrantsLoading]=useState(false), [registrantsError,setRegistrantsError]=useState('');
  const [notify,setNotify]=useState(null), [notifyTitle,setNotifyTitle]=useState(''), [notifyMessage,setNotifyMessage]=useState(''), [notifyFeedback,setNotifyFeedback]=useState('');
  const [busy,setBusy]=useState('');
  const pending=useRef(new Set()), version=useRef(0), profileVersion=useRef(0), registryVersion=useRef(0);
  useEffect(()=>{setSearch(routeQuery);setQuery(routeQuery);setTab('browse');},[routeQuery]);
  useEffect(()=>{const timer=setTimeout(()=>setQuery(search),300);return()=>clearTimeout(timer);},[search]);
  const fetchData=useCallback(async()=>{
    const id=++version.current;setRefreshing(true);setError('');
    try {
      const [published,completed,regs,mine]=await Promise.all([
        collectPortalPages(eventService.getEvents,'events',{search:query,type,status:'PUBLISHED'}),
        collectPortalPages(eventService.getEvents,'events',{search:query,type,status:'COMPLETED'}),
        eventService.getUserRegistrations(),
        canHost ? collectPortalPages(eventService.getEvents,'events',{filterScope:'my'}) : Promise.resolve([]),
      ]);
      if(id!==version.current)return;
      setEvents([...new Map([...published,...completed].map(e=>[e.id,e])).values()]);
      setRegistrations(regs.data || []);setCreated(mine);
    }catch(err){if(id===version.current)setError(err.response?.data?.message || err.message || 'Could not load events.');}
    finally{if(id===version.current){setLoading(false);setRefreshing(false);}}
  },[query,type,canHost]);
  useEffect(()=>{fetchData();return()=>{version.current++;};},[fetchData]);
  useEffect(()=>{
    if(!socket)return;
    const names=['event:registration:new','event:cancelled','community:post-created','community:meeting-link-updated','community:recording-updated'];
    names.forEach(name=>socket.on(name,fetchData));socket.on('connect',fetchData);
    return()=>{names.forEach(name=>socket.off(name,fetchData));socket.off('connect',fetchData);};
  },[socket,fetchData]);
  const reset=()=>{setSearch('');setQuery('');setType('');setCategory('');setDate('');};
  const own=e=>e.creatorId===user?.id || user?.role==='ADMIN';
  const registered=e=>e.isRegistered || registrations.some(r=>r.eventId===e.id && r.status==='REGISTERED');
  const community=e=>navigate(`/events/${e.id}/community`);
  const matches=e=>(!category || e.tags?.includes(category)) && (!date || [new Date(e.startDate).getFullYear(),String(new Date(e.startDate).getMonth()+1).padStart(2,'0'),String(new Date(e.startDate).getDate()).padStart(2,'0')].join('-')===date);
  const upcoming=events.filter(e=>!eventHasEnded(e) && matches(e));
  const past=events.filter(e=>eventHasEnded(e) && matches(e));
  const categories=[...new Set(events.flatMap(e=>e.tags || []))].sort();
  const source=tab==='registered' ? registrations.map(r=>r.event).filter(Boolean).map(e=>({...e,isRegistered:true,registeredCount:e._count?.registrations})) : tab==='my-events' ? created : tab==='past' ? past : upcoming;
  const openCreate=()=>{setEditing(null);setCreate(true);};
  const mutate=async(key,action,question)=>{
    if(pending.current.has(key) || (question && !window.confirm(question)))return;
    pending.current.add(key);setBusy(key);setError('');
    try{await action();await fetchData();}catch(err){setError(err.response?.data?.message || 'Could not update this event.');}
    finally{pending.current.delete(key);setBusy('');}
  };
  const openRegister=async e=>{
    setRegisterTarget(e);setRegistrationError('');setProfile(null);
    if(!isStudent)return;
    const id=++profileVersion.current;setProfileLoading(true);
    try{const result=await studentProfileService.getProfile();if(id===profileVersion.current)setProfile(result.data);}
    catch(err){if(id===profileVersion.current)setRegistrationError(err.response?.data?.message || 'Could not load your student profile. Retry before registering.');}
    finally{if(id===profileVersion.current)setProfileLoading(false);}
  };
  const submitRegistration=async e=>{
    e.preventDefault();const event=registerTarget;
    if(!event || pending.current.has(event.id))return;
    pending.current.add(event.id);setBusy(event.id);setRegistrationError('');
    try{await eventService.registerForEvent(event.id);setRegisterTarget(null);setNotice('Registration confirmed. Your Event Community is now available.');await fetchData();setTab('registered');}
    catch(err){setRegistrationError(err.response?.data?.message || 'Registration failed. Please retry.');}
    finally{pending.current.delete(event.id);setBusy('');}
  };
  const openRegistrants=async e=>{
    const id=++registryVersion.current;setRegistrantTarget(e);setRegistrants([]);setRegistrantsLoading(true);setRegistrantsError('');
    try{const result=await eventService.getEventRegistrants(e.id);if(id===registryVersion.current)setRegistrants(result.data || []);}
    catch(err){if(id===registryVersion.current)setRegistrantsError(err.response?.data?.message || 'Could not load registrations.');}
    finally{if(id===registryVersion.current)setRegistrantsLoading(false);}
  };
  const openNotify=e=>{setNotify(e);setNotifyTitle(`Reminder: ${e.title}`);setNotifyMessage('');setNotifyFeedback('');};
  const sendNotify=async e=>{
    e.preventDefault();if(!notify || !notifyMessage.trim() || pending.current.has('notify'))return;
    pending.current.add('notify');setBusy('notify');setNotifyFeedback('');
    try{const result=await eventService.sendEventNotification(notify.id,{title:notifyTitle.trim() || `Update: ${notify.title}`,message:notifyMessage.trim()});setNotifyFeedback(`Notification delivered to ${result.data?.delivered ?? 0} registered participants.`);}
    catch(err){setNotifyFeedback(err.response?.data?.message || 'Failed to send notification.');}
    finally{pending.current.delete('notify');setBusy('');}
  };
  const registrationLabel=e=>e.status==='CANCELLED' ? 'Cancelled' : eventHasEnded(e) ? 'Completed' : e.isSpotsFull ? 'Capacity reached' : eventRegistrationClosed(e) ? 'Registration closed' : 'Register Now';
  const renderEvent=e=>{
    const host=own(e), isRegistered=registered(e), meeting=safeExternalUrl(e.meetingUrl);
    return <article key={e.id} className="portal-event-card">
      <div className="portal-event-cover">{safeExternalUrl(e.bannerUrl) ? <img src={e.bannerUrl} alt=""/> : <CalendarDays size={64} strokeWidth={1.3}/>}<span>{e.type?.replaceAll('_',' ')}</span>{e.registeredCount!=null && <span>{e.registeredCount} Registered</span>}</div>
      <h2>{e.title}</h2><p className="portal-event-description">{e.description}</p>
      <div className="portal-speaker"><span>{e.speakerName?.trim()[0]?.toUpperCase() || '?'}</span><div><strong>{e.speakerName}</strong><small>{[e.speakerRole,e.speakerCompany].filter(Boolean).join(' at ')}</small></div></div>
      <div className="portal-metadata"><span><CalendarDays size={15}/>{fmt(e.startDate)}</span>{e.endDate && <span><Clock size={15}/>Ends {fmt(e.endDate)}</span>}<span><MapPin size={15}/>{e.location}</span>{e.maxCapacity!=null && <span><Users size={15}/>Capacity: {e.maxCapacity}</span>}{e.registrationDeadline && <span>Register by {fmt(e.registrationDeadline)}</span>}</div>
      <div className="portal-skills">{e.tags?.map(tag=><span key={tag}>{tag}</span>)}</div>
      <div className="portal-actions">{host || isRegistered ? <button className="portal-primary" onClick={()=>community(e)}>{host ? 'Manage Community' : 'Enter Event Community'}</button> : <button className="portal-primary" disabled={eventRegistrationClosed(e)} onClick={()=>openRegister(e)}>{registrationLabel(e)}</button>}<button className="portal-secondary" onClick={()=>setDetail(e)}>View Details</button>
        {isRegistered && <span className="portal-status">Registered</span>}{(eventHasEnded(e) || e.status==='CANCELLED' || e.status==='DRAFT') && <span className="portal-status neutral">{e.status==='CANCELLED' ? 'Cancelled' : e.status==='DRAFT' ? 'Draft' : 'Completed'}</span>}
        {(host || isRegistered) && meeting && !eventHasEnded(e) && e.status==='PUBLISHED' && <a className="portal-secondary" href={meeting} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>Join Webinar</a>}
        {host && <div className="portal-owner-actions"><button className="portal-secondary" onClick={()=>{setEditing(e);setCreate(true);}}><Edit3 size={14}/>Edit</button><button className="portal-secondary" onClick={()=>openRegistrants(e)}>Manage Registrations</button><button className="portal-secondary" onClick={()=>openNotify(e)}><Megaphone size={14}/>Send Update</button>{e.status==='PUBLISHED' && <button className="portal-secondary" disabled={busy===e.id} onClick={()=>mutate(e.id,()=>eventService.cancelEvent(e.id),'Cancel this event? Registered participants will be notified.')}>Cancel Session</button>}<button className="portal-danger" disabled={busy===e.id} onClick={()=>mutate(e.id,()=>eventService.deleteEvent(e.id),'Permanently delete this event and its registrations?')}>Delete</button></div>}
        {isRegistered && !host && <button className="portal-danger" disabled={busy===e.id} onClick={()=>mutate(e.id,()=>eventService.cancelRegistration(e.id),'Cancel your registration for this event?')}>Cancel Registration</button>}
      </div>
    </article>;
  };
  return <div className="portal-page events-page"><PortalHero events/>
    <div className="portal-toolbar"><div className="portal-tabs">{[['browse',`Upcoming Events (${upcoming.length})`],['registered',`My Registered Sessions (${registrations.length})`],...(canHost ? [['my-events',`My Created Sessions (${created.length})`]] : []),['past',`Past Events (${past.length})`]].map(([value,label])=><button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{label}</button>)}</div><button className="portal-secondary" aria-label="Refresh events" disabled={refreshing} onClick={fetchData}><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/></button></div>
    {['browse','past'].includes(tab) && <div className="portal-filters"><div className="portal-search"><Search size={16}/><input aria-label="Search events" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search event title or speaker…"/></div><select aria-label="Event format" value={type} onChange={e=>setType(e.target.value)}><option value="">All Formats</option>{TYPES.map(t=><option key={t}>{t}</option>)}</select><select aria-label="Event category" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All Categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select><input aria-label="Event date" type="date" value={date} onChange={e=>setDate(e.target.value)}/><button className="portal-secondary" onClick={reset}>Reset</button></div>}
    {error && <div className="portal-error" role="alert">{error}<button className="portal-secondary" onClick={fetchData}>Retry</button></div>}{notice && <div className="portal-success" role="status">{notice}</div>}
    {loading ? <div className="portal-loading" role="status">Loading events and sessions…</div> : error && !source.length ? null : source.length ? <div className="portal-events-grid">{source.map(renderEvent)}</div> : <PortalEmpty title={tab==='registered' ? 'No registered sessions yet' : tab==='my-events' ? 'No created sessions yet' : tab==='past' ? 'No past events found' : 'No upcoming events found'} onReset={['browse','past'].includes(tab) ? reset : undefined}>{tab==='registered' ? 'Explore upcoming events and register to join the conversation.' : tab==='my-events' ? 'Host a webinar or workshop and share your experience with the community.' : 'Try a different search or check back for new alumni sessions.'}</PortalEmpty>}
    {canHost && <section className="portal-host-cta"><div><h2>Create Your Own Session</h2><p>Host a webinar, workshop or live session and share your knowledge with the community.</p></div><button className="portal-primary" onClick={openCreate}><Plus size={16}/>Host Webinar / Event</button></section>}
    {create && <CreateEventModal eventToEdit={editing} onClose={()=>{setCreate(false);setEditing(null);}} onSuccess={fetchData}/>}
    {detail && <PortalDialog title={detail.title} onClose={()=>setDetail(null)}><p>{detail.type?.replaceAll('_',' ')} · {detail.speakerName}</p><p className="portal-details-description">{detail.description}</p><div className="portal-metadata"><span>{fmt(detail.startDate)} — {fmt(detail.endDate)}</span><span>{detail.location}</span>{detail.registrationDeadline && <span>Registration deadline: {fmt(detail.registrationDeadline)}</span>}{detail.maxCapacity!=null && <span>Capacity: {detail.maxCapacity}</span>}</div><div className="portal-skills">{detail.tags?.map(t=><span key={t}>{t}</span>)}</div><p className="portal-recording-note">Registered participants and hosts can access meeting links, announcements, resources, and available recordings in the Event Community.</p><div className="portal-actions">{own(detail) || registered(detail) ? <button className="portal-primary" onClick={()=>community(detail)}>Enter Event Community</button> : <button className="portal-primary" disabled={eventRegistrationClosed(detail)} onClick={()=>{openRegister(detail);setDetail(null);}}>{registrationLabel(detail)}</button>}<button className="portal-secondary" onClick={()=>setDetail(null)}>Close</button></div></PortalDialog>}
    {registerTarget && <PortalDialog title="Register for Event" onClose={()=>{profileVersion.current++;setRegisterTarget(null);}}><p><strong>{registerTarget.title}</strong></p>{profileLoading ? <p role="status">Loading profile details…</p> : <form onSubmit={submitRegistration}>{isStudent ? <><div className="portal-review-fields">{[['Full Name',`${profile?.user?.firstName || user?.firstName || ''} ${profile?.user?.lastName || user?.lastName || ''}`.trim()],['College Email',profile?.user?.email || user?.email],['Branch / Department',profile?.studentProfile?.branch],['Graduation Year / Batch',profile?.studentProfile?.graduationYear || profile?.studentProfile?.batch],['Current Year',profile?.studentProfile?.currentYear]].map(([label,value])=><label key={label}>{label}<input readOnly value={value || 'Not added to profile'}/></label>)}</div><p>Verify your profile details before registering. <button type="button" className="underline" onClick={()=>navigate('/student/profile')}>Update your profile</button> if needed.</p></> : <p>Register as {user?.firstName} {user?.lastName} ({user?.email}).</p>}{registrationError && <div role="alert" className="portal-error">{registrationError}<button type="button" className="portal-secondary" onClick={()=>openRegister(registerTarget)}>Retry</button></div>}<div className="portal-actions"><button className="portal-primary" type="submit" disabled={busy===registerTarget.id || (isStudent && !profile)}>{busy===registerTarget.id ? 'Registering…' : 'Confirm Registration'}</button><button type="button" className="portal-secondary" onClick={()=>setRegisterTarget(null)}>Cancel</button></div></form>}</PortalDialog>}
    {registrantTarget && <PortalDialog title="Manage Registrations" onClose={()=>{registryVersion.current++;setRegistrantTarget(null);}}><p>{registrantTarget.title}</p>{registrantsLoading ? <p role="status">Loading participants…</p> : registrantsError ? <div className="portal-error" role="alert">{registrantsError}<button onClick={()=>openRegistrants(registrantTarget)}>Retry</button></div> : registrants.length ? registrants.map(r=><article key={r.id} className="portal-registrant"><h3>{r.user?.firstName} {r.user?.lastName}</h3><p>{r.user?.email}</p><p>{[r.user?.studentProfile?.branch,r.user?.studentProfile?.graduationYear,r.user?.studentProfile?.currentYear && `Year ${r.user.studentProfile.currentYear}`].filter(Boolean).join(' · ')}</p><p>Registered {fmt(r.createdAt)}</p></article>) : <p>No registered participants yet.</p>}</PortalDialog>}
    {notify && <PortalDialog title="Notify Registered Participants" onClose={()=>setNotify(null)}><p>{notify.title}</p><form onSubmit={sendNotify}><label>Title<input value={notifyTitle} onChange={e=>setNotifyTitle(e.target.value)} maxLength={100}/></label><label>Message<textarea required rows={4} maxLength={500} value={notifyMessage} onChange={e=>setNotifyMessage(e.target.value)}/></label><p>{notifyMessage.length}/500</p>{notifyFeedback && <p role="status">{notifyFeedback}</p>}<div className="portal-actions"><button type="submit" className="portal-primary" disabled={busy==='notify' || !notifyMessage.trim()}>{busy==='notify' ? 'Sending…' : 'Send Notification'}</button><button type="button" className="portal-secondary" onClick={()=>setNotify(null)}>Cancel</button></div></form></PortalDialog>}
  </div>;
}
