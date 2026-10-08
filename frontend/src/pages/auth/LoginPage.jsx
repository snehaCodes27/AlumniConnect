import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Users } from 'lucide-react';
import { AuthShell, AuthField, AuthError, AuthSubmit } from '../../components/auth/AuthUI';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const res = await login(formData.email, formData.password);
    setIsSubmitting(false);

    if (res?.success) {
      const role = res.user.role;
      if (role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (role === 'ALUMNI') {
        if (res.user.needsOnboarding) {
          navigate('/alumni/onboarding');
        } else {
          navigate('/alumni/dashboard');
        }
      } else {
        navigate('/student/dashboard');
      }
    } else {
      setErrorMessage(res?.message || 'Invalid email or password.');
    }
  };

  return <AuthShell mode="login">
    <div className="auth-card-heading"><span className="auth-kicker">WELCOME BACK</span><h1 id="auth-title">Sign in to AlumniConnect</h1><p>Your community. Your opportunities. Your next chapter.</p></div>
    <AuthError message={errorMessage} />
    <form onSubmit={handleSubmit} className="auth-form" aria-busy={isSubmitting}>
      <AuthField label="Email address" name="email" type="email" value={formData.email} onChange={handleChange} autoComplete="username" placeholder="you@example.com" />
      <AuthField label="Password" name="password" type="password" value={formData.password} onChange={handleChange} autoComplete="current-password" placeholder="Enter your password" />
      <AuthSubmit busy={isSubmitting} busyLabel="Signing in…">Sign In</AuthSubmit>
    </form>
    <div className="auth-register-options"><p>New to AlumniConnect? Find your place.</p><div className="auth-register-links"><Link to="/student/register"><GraduationCap size={18} aria-hidden="true" />Register as Student</Link><Link to="/alumni/register"><Users size={18} aria-hidden="true" />Register as Alumni</Link></div></div>
  </AuthShell>;
}
