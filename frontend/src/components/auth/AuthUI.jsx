import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, GraduationCap, Users, Eye, EyeOff, AlertCircle, LoaderCircle } from 'lucide-react';
import './auth.css';

const content = {
  login: { label: 'YOUR NEXT CHAPTER STARTS HERE', title: <>Meaningful connections.<br /><span>Limitless possibilities.</span></>, description: 'Reconnect with your community, find your next opportunity and grow together.', image: 'student', feature: 'A community that moves you forward', detail: 'Students, alumni and opportunities — all in one place.' },
  student: { label: 'FOR THE NEXT GENERATION', title: <>A little guidance.<br /><span>A brighter future.</span></>, description: 'Learn from alumni who have been where you are. Build connections that help you find your own path.', image: 'student', feature: 'Your future, with a head start', detail: 'Mentorship, career guidance and meaningful connections.' },
  alumni: { label: 'ONCE A STUDENT. ALWAYS CONNECTED.', title: <>Your experience.<br /><span>Their inspiration.</span></>, description: 'Stay connected to your roots. Share what you know and open doors for the next generation.', image: 'alumni', feature: 'Make your experience count', detail: 'Mentor students, share opportunities and grow your network.' },
};

export function AuthShell({ mode, children }) {
  const copy = content[mode];
  return <div className={`auth-page auth-${mode}`}>
    <header className="auth-header"><Link to="/" className="auth-brand" aria-label="AlumniConnect home"><span className="auth-logo">AC</span><span>Alumni<span>Connect</span></span></Link><Link to="/" className="auth-back"><ArrowLeft size={17} aria-hidden="true" />Back to home</Link></header>
    <main className="auth-layout">
      <aside className="auth-story" aria-label={mode === 'login' ? 'Welcome to your community' : `Why join as ${mode}`}>
        <span className="auth-eyebrow">{copy.label}</span><h2>{copy.title}</h2><p>{copy.description}</p>
        <div className="auth-story-visual"><div className="auth-orbit" aria-hidden="true" /><img src={`/images/landing-${copy.image}.jpg`} width="1086" height="1448" alt={copy.image === 'student' ? 'University student looking forward on a sunny campus' : 'Alumni professional outside a modern office'} decoding="async" /><span className="auth-image-label"><GraduationCap size={20} aria-hidden="true" />Connect. Guide. Grow Together.</span></div>
        <div className="auth-story-feature"><span><Users size={22} aria-hidden="true" /></span><div><strong>{copy.feature}</strong><p>{copy.detail}</p></div></div>
      </aside>
      <section className="auth-card" aria-labelledby="auth-title">{children}</section>
    </main>
    <footer className="auth-footer">© {new Date().getFullYear()} AlumniConnect. All rights reserved.</footer>
  </div>;
}

export function AuthField({ label, name, type = 'text', value, onChange, required = true, placeholder, autoComplete, hint }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  return <div className="auth-field"><label htmlFor={id}>{label}{!required && <span> (optional)</span>}</label><div className="auth-input-wrap"><input id={id} name={name} type={isPassword && visible ? 'text' : type} value={value} onChange={onChange} required={required} placeholder={placeholder} autoComplete={autoComplete} aria-describedby={hint ? `${id}-hint` : undefined} />{isPassword && <button type="button" className="auth-reveal" onClick={() => setVisible(!visible)} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible}>{visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>}</div>{hint && <p id={`${id}-hint`} className="auth-field-hint">{hint}</p>}</div>;
}

export function AuthError({ message }) {
  return message ? <div className="auth-error" role="alert"><AlertCircle size={19} aria-hidden="true" /><span>{message}</span></div> : null;
}

export function AuthSubmit({ busy, children, busyLabel }) {
  return <button type="submit" className="auth-submit" disabled={busy}>{busy && <LoaderCircle className="auth-spinner" size={18} aria-hidden="true" />}<span>{busy ? busyLabel : children}</span>{!busy && <ArrowRight size={18} aria-hidden="true" />}</button>;
}

export function RegistrationContent({ role, formData, handleChange, handleSubmit, isSubmitting, errorMessage }) {
  const alumni = role === 'alumni';
  return <AuthShell mode={role}>
    <div className="auth-card-heading"><span className="auth-kicker">JOIN THE COMMUNITY</span><h1 id="auth-title">Create your account</h1><p>{alumni ? 'Give back, stay connected and grow your network.' : 'Find your people. Discover your possibilities.'}</p></div>
    <nav className="auth-role-switch" aria-label="Registration role"><Link to="/student/register" aria-current={!alumni ? 'page' : undefined}><GraduationCap size={18} aria-hidden="true" />Student</Link><Link to="/alumni/register" aria-current={alumni ? 'page' : undefined}><BriefcaseBusiness size={18} aria-hidden="true" />Alumni</Link></nav>
    <AuthError message={errorMessage} />
    <form onSubmit={handleSubmit} className="auth-form" aria-busy={isSubmitting}>
      <div className="auth-name-row"><AuthField label="First name" name="firstName" value={formData.firstName} onChange={handleChange} autoComplete="given-name" placeholder="First name" /><AuthField label="Last name" name="lastName" value={formData.lastName} onChange={handleChange} autoComplete="family-name" placeholder="Last name" /></div>
      <AuthField label="Email address" name="email" type="email" value={formData.email} onChange={handleChange} autoComplete="email" placeholder={alumni ? 'you@company.com' : 'you@university.edu'} />
      <AuthField label="Phone number" name="phone" type="tel" required={false} value={formData.phone} onChange={handleChange} autoComplete="tel" placeholder="Your phone number" />
      <AuthField label="Password" name="password" type="password" value={formData.password} onChange={handleChange} autoComplete="new-password" placeholder="Create a password" hint="Use at least 8 characters." />
      <AuthField label="Confirm password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" placeholder="Re-enter your password" />
      <AuthSubmit busy={isSubmitting} busyLabel="Creating account…">Register as {alumni ? 'Alumni' : 'Student'}</AuthSubmit>
    </form>
    <p className="auth-bottom-link">Already have an account? <Link to="/login">Sign in</Link></p>
  </AuthShell>;
}
