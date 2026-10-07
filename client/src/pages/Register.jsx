import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth';
import { getErrorMessage } from '../api/client';
import SocialLoginButtons from '../components/SocialLoginButtons';
import ErrorMessage from '../components/ErrorMessage';
import { AuthCard, Divider, Field } from './Login';

function validate({ name, password, confirmPassword }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (password.length < 8) errors.password = 'At least 8 characters';
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    errors.password = 'Must include a letter and a number';
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSubmitting(true);
    setError(null);
    try {
      const { name, email, password } = form;
      const user = await register({ name, email, password });
      toast.success(`Welcome, ${user.name}!`);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Create your account" subtitle="Start publishing in seconds.">
      <SocialLoginButtons />
      <Divider />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <ErrorMessage message={error} />
        <Field label="Name" name="name" value={form.name} onChange={setForm} error={errors.name} />
        <Field label="Email" type="email" name="email" value={form.email} onChange={setForm} />
        <Field
          label="Password"
          type="password"
          name="password"
          value={form.password}
          onChange={setForm}
          error={errors.password}
        />
        <Field
          label="Confirm password"
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={setForm}
          error={errors.confirmPassword}
        />
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
