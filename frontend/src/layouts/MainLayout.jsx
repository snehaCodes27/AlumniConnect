import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import '../pages/landing.css';

/** Public landing layout. Authentication pages use their existing layouts. */
export default function MainLayout() {
  return <div className="landing-shell">
    <a className="landing-skip" href="#main-content">Skip to content</a>
    <header className="landing-header">
      <Link to="/" className="landing-brand" aria-label="AlumniConnect home">
        <span className="landing-logo">AC</span>
        <span>Alumni<span className="landing-gradient-text">Connect</span></span>
      </Link>
      <nav aria-label="Main navigation"><Link to="/login" className="landing-header-signin"><LogIn size={20} aria-hidden="true" /><span>Sign In</span></Link></nav>
    </header>
    <main id="main-content" className="landing-main" tabIndex={-1}><Outlet /></main>
    <footer className="landing-footer">© {new Date().getFullYear()} AlumniConnect. All rights reserved.</footer>
  </div>;
}
