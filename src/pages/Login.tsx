import { useState } from 'react';
import { Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string, password: string, role: 'admin' | 'officer' | 'cadet') => Promise<boolean>;
  onRegister: (username: string, password: string, role: 'admin' | 'officer' | 'cadet') => Promise<boolean>;
}

export default function Login({ onLogin, onRegister }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'officer' | 'cadet'>('cadet');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Required fields are missing.');
      return;
    }

    if (isRegistering) {
      const isSuccess = await onRegister(email, password, role);
      
      if (isSuccess) {
        setSuccess(`Account registered successfully. Please log in.`);
        setIsRegistering(false);
        setPassword('');
      } else {
        setError('Registration failed. Please try again.');
      }
    } else {
      const isSuccess = await onLogin(email, password, role);
      if (!isSuccess) {
        setError('Unable to authenticate. Check your email and password.');
      }
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-50">
      {/* LEFT SIDE PANEL - Standard Tailwind Theme Color (slate-900 / zinc-950 compatibility) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative">
        <div className="flex items-center gap-3 relative z-10">
          <Shield className="h-8 w-8 text-emerald-400" />
          <span className="font-bold tracking-widest text-lg">Rotc Attendance Management System</span>
        </div>
        
        <div className="max-w-md relative z-10 my-auto space-y-4">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Simple and Secure</p>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white">
            Keep attendance organized in one clear workspace.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Track cadet attendance, review reports, and manage team activity with a calm and intuitive flow.
          </p>
        </div>
        
        <div className="text-xs text-slate-500 relative z-10">
          © 2026 ROTC Attendance System.
        </div>
      </div>

      {/* RIGHT SIDE PANEL - Forms Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200/80 shadow-lg space-y-6">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-emerald-600 uppercase">
              {isRegistering ? 'SIGN UP' : 'SIGN IN'}
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              {isRegistering ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isRegistering ? 'Register your fields to establish a local dummy session.' : 'Use your details to open the attendance dashboard.'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0" /> <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 size={14} className="flex-shrink-0" /> <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email address</label>
              <input type="email" placeholder="officer@rotc.edu" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white text-slate-900" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'officer' | 'cadet')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white text-slate-900">
                <option value="cadet">Cadet</option>
                <option value="officer">Officer</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white text-slate-900" />
            </div>

            <button type="submit" className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md active:scale-[0.99] cursor-pointer mt-2">
              {isRegistering ? 'Create account' : 'Continue →'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccess(''); }} className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer">
              {isRegistering ? (
                <>Already have an account? <span className="font-bold text-slate-800 underline">Log in</span></>
              ) : (
                <>New personnel registration? <span className="font-bold text-slate-800 underline">Create account</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}