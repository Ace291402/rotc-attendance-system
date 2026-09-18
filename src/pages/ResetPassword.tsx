import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword, validateResetToken } from '../authService';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const [isValidating, setIsValidating] = useState(Boolean(token));
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setError('Invalid or missing password reset link.');
      return;
    }

    let active = true;
    setIsValidating(true);
    setError('');

    validateResetToken(token)
      .then((response) => {
        if (!active) return;
        if (response.valid === false) {
          setError('This password reset link is invalid or has expired.');
          setIsTokenValid(false);
          return;
        }
        setIsTokenValid(true);
      })
      .catch(() => {
        if (active) {
          setIsTokenValid(false);
          setError('This password reset link is invalid or has expired.');
        }
      })
      .finally(() => {
        if (active) setIsValidating(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token || !isTokenValid) {
      setError('This password reset link is invalid or has expired.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess('Password has been reset successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setIsTokenValid(false);
    } catch {
      setError('Unable to reset your password. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-50">
      <div className="hidden lg:flex w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative">
        <div className="flex items-center gap-3 relative z-10">
          <Shield className="h-8 w-8 text-emerald-400" />
          <span className="font-bold tracking-widest text-lg">Rotc Attendance Management System</span>
        </div>
        <div className="max-w-md relative z-10 my-auto space-y-4">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Simple and Secure</p>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white">Keep attendance organized in one clear workspace.</h1>
          <p className="text-slate-400 text-sm leading-relaxed">Track cadet attendance, review reports, and manage team activity with a calm and intuitive flow.</p>
        </div>
        <div className="text-xs text-slate-500 relative z-10">© 2026 ROTC Attendance System.</div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200/80 shadow-lg space-y-6">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-emerald-600 uppercase">ACCOUNT ACCESS</span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Reset Password</h2>
            <p className="text-xs text-slate-500 mt-1">Create a new password for your account.</p>
          </div>

          {isValidating && <p className="text-xs text-slate-500">Checking your reset link...</p>}
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2"><AlertCircle size={14} className="flex-shrink-0" /> <span>{error}</span></div>}
          {success && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2"><CheckCircle2 size={14} className="flex-shrink-0" /> <span>{success}</span></div>}

          {isTokenValid && !success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white text-slate-900" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md active:scale-[0.99] cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="text-center pt-2 border-t border-slate-100">
            <Link to="/login" className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer">Back to <span className="font-bold text-slate-800 underline">Login</span></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
