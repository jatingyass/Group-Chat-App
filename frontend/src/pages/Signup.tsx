import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { extractError } from '../api/axios';

export default function Signup() {
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await signup(form);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 p-4">
      <div className="card w-full max-w-md p-8 animate-slide-up">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Create account</h1>
        <p className="mb-6 text-sm text-slate-600">Join the conversation.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" required minLength={2} maxLength={50}
              className="input" value={form.name} onChange={update('name')} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email"
              className="input" value={form.email} onChange={update('email')} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" required pattern="[0-9]{10,15}" placeholder="10-15 digits"
              className="input" value={form.phone} onChange={update('phone')} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={8} autoComplete="new-password"
              className="input" value={form.password} onChange={update('password')} />
            <p className="mt-1 text-xs text-slate-500">
              Min 8 chars, with upper, lower, and a number.
            </p>
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
