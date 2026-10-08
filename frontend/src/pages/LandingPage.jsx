import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, ChartNoAxesCombined, GraduationCap, LogIn, Settings, Users } from 'lucide-react';
import { checkBackendHealth } from '../services/healthService';
import './landing.css';

const roles = [
  { title: 'Students', icon: GraduationCap, tone: 'blue', description: 'Access mentorship, career guidance, alumni connections and opportunities.' },
  { title: 'Alumni', icon: Users, tone: 'purple', description: 'Guide students, share career opportunities and build meaningful connections.' },
  { title: 'Admins', icon: Settings, tone: 'teal', description: 'Manage the platform, coordinate placement activities and oversee community engagement.' },
];

function FloatingFeatureCard({ icon: Icon, title, detail, position, tone }) {
  return <div className={`landing-feature ${position}`}>
    <span className={`landing-icon ${tone}`}><Icon size={23} aria-hidden="true" /></span>
    <span><strong>{title}</strong><span>{detail}</span></span>
  </div>;
}

function HeroVisual({ alumni = false }) {
  return <div className={`landing-visual ${alumni ? 'alumni' : 'student'}`}>
    <div className="landing-orbit" aria-hidden="true"><i /><i /><i /></div>
    <div className="landing-portrait">
      <img src={`/images/landing-${alumni ? 'alumni' : 'student'}.jpg`} width="1086" height="1448" decoding="async" alt={alumni ? 'Young alumni professional holding a laptop outside an office building' : 'University student holding a laptop on a sunny campus'} />
    </div>
    <FloatingFeatureCard icon={alumni ? BriefcaseBusiness : GraduationCap} title={alumni ? 'Share' : 'Learn'} detail={alumni ? 'Opportunities' : 'From Alumni'} position="feature-top" tone={alumni ? 'amber' : 'blue'} />
    <FloatingFeatureCard icon={alumni ? ChartNoAxesCombined : Users} title={alumni ? 'Build' : 'Find'} detail={alumni ? 'Stronger Network' : 'Mentorship'} position="feature-bottom" tone="teal" />
  </div>;
}

function RoleCard({ role, index }) {
  const Icon = role.icon;
  return <Link to="/login" className={`landing-role ${role.tone}`} aria-label={`Sign in to AlumniConnect as ${role.title}`}>
    <span className={`landing-role-icon landing-icon ${role.tone}`}><Icon size={31} strokeWidth={2.3} aria-hidden="true" /></span>
    <div className="landing-role-copy"><span className="landing-eyebrow">Role {index + 1}</span><h3>{role.title}</h3><p>{role.description}</p></div>
    <span className="landing-role-arrow"><ArrowRight size={19} aria-hidden="true" /></span>
  </Link>;
}

export default function LandingPage() {
  const [backendStatus, setBackendStatus] = useState({ loading: true, connected: false, message: '' });
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const data = await checkBackendHealth();
        if (active) setBackendStatus({ loading: false, connected: data.success === true, message: data.message || 'Backend health check unsuccessful' });
      } catch {
        if (active) setBackendStatus({ loading: false, connected: false, message: 'Backend offline or unreachable' });
      }
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const state = backendStatus.loading ? 'checking' : backendStatus.connected ? 'connected' : 'disconnected';
  const authLabel = backendStatus.loading ? 'Checking Authentication System' : backendStatus.connected ? 'Authentication System Active' : 'Authentication System Unavailable';

  return <div className="landing-page">
    <div className="landing-decoration dots" aria-hidden="true" />
    <section className="landing-hero" aria-labelledby="landing-title">
      <HeroVisual />
      <div className="landing-hero-copy">
        <div className={`landing-auth-badge ${state}`}><GraduationCap size={19} aria-hidden="true" /><span>{authLabel}</span><span className="landing-status-dot" /></div>
        <h1 id="landing-title">Alumni<span className="landing-gradient-text">Connect</span></h1>
        <p className="landing-tagline">“Connect. Guide. Grow Together.”</p>
        <p className="landing-description">A unified platform for students, alumni and administrators to build meaningful connections, share opportunities and grow together.</p>
        <Link to="/login" className="landing-cta"><LogIn size={21} aria-hidden="true" />Sign In to Platform<ArrowRight size={19} aria-hidden="true" /></Link>
      </div>
      <HeroVisual alumni />
    </section>
    <section className="landing-roles" aria-labelledby="landing-roles-title">
      <h2 id="landing-roles-title" className="sr-only">A place for every role</h2>
      {roles.map((role, index) => <RoleCard key={role.title} role={role} index={index} />)}
    </section>
    <div className="landing-health-row">
      <div className={`landing-health ${state}`} role="status" aria-live="polite" title={backendStatus.message}>
        <span className="landing-status-dot" /><span>Backend Status:</span><strong>{backendStatus.loading ? 'Checking…' : backendStatus.connected ? 'Connected' : 'Disconnected'}</strong>
      </div>
      <span className="landing-signature" aria-hidden="true">Stronger<br /><span>Together</span></span>
    </div>
  </div>;
}
