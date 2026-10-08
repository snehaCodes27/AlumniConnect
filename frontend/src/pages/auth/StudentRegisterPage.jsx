import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RegistrationContent } from '../../components/auth/AuthUI';

export default function StudentRegisterPage() {
  const navigate = useNavigate();
  const { registerStudent } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
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
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMessage('First and last name are required.');
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage('Valid email address is required.');
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const res = await registerStudent(formData);
    setIsSubmitting(false);

    if (res?.success) {
      navigate('/login');
    } else {
      setErrorMessage(res?.message || 'Registration failed.');
    }
  };

  return <RegistrationContent role="student" formData={formData} handleChange={handleChange} handleSubmit={handleSubmit} isSubmitting={isSubmitting} errorMessage={errorMessage} />;
}
