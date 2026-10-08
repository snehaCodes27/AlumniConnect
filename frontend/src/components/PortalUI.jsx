import React, { useEffect, useRef } from 'react';
import { Briefcase, CalendarDays, Clock, Sparkles, X, Search } from 'lucide-react';
import './network-pages.css';
import './portal-pages.css';

export function PortalHero({ events = false }) {
  const Icon = events ? CalendarDays : Briefcase;
  return <section className="network-hero portal-hero">
    <div className="network-hero-copy">
      <span className="network-hero-label"><Icon size={16} />{events ? 'Events & Live Webinars' : 'Career & Jobs Hub'}</span>
      <h1>{events ? 'Learn, Network & Grow' : 'Discover Opportunities'}</h1>
      <p>{events ? 'Join webinars, workshops, and interactive sessions with our alumni. Gain insights, build connections, and enhance your skills.' : 'Explore job openings, internships and career opportunities shared by our alumni network. Get referred and grow your career.'}</p>
    </div>
    <div className={`network-illustration portal-art ${events ? 'portal-art-events' : ''}`} aria-hidden="true">
      <Sparkles className="network-spark" size={23} />
      <div className="network-art-back"><Icon size={78} strokeWidth={1.5} /></div>
      <div className="network-art-front">{events ? <Clock size={44} /> : <Briefcase size={32} />}</div>
    </div>
  </section>;
}

export function PortalEmpty({ title, children, onReset }) {
  return <div className="portal-empty"><span><Search size={32} /></span><h2>{title}</h2><p>{children}</p>{onReset && <button className="portal-secondary" onClick={onReset}>Clear Filters</button>}</div>;
}

export function PortalDialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.querySelector('button')?.focus();
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')].filter(el => el.offsetParent !== null);
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    dialog?.addEventListener('keydown', onKey);
    return () => { dialog?.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="portal-overlay"><section ref={ref} role="dialog" aria-modal="true" aria-label={title} className="portal-dialog"><div className="portal-dialog-heading"><h2>{title}</h2><button aria-label={`Close ${title}`} onClick={onClose}><X size={21} /></button></div>{children}</section></div>;
}
