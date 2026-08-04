import type { ReactNode } from 'react';
import { Shield, LogOut, BarChart2, CheckCircle, Users, FileText, User, Bell, Search, ChevronDown, Settings, UserCircle2 } from 'lucide-react';
import type { Role } from '../types';

interface LayoutProps {
  children: ReactNode;
  username: string;
  role: Role;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Layout({ children, username, role, currentTab, setCurrentTab, onLogout }: LayoutProps) {
  const initials = username
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'RO';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col justify-between bg-[#0F3D2E] p-6 text-white lg:flex">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-2.5">
                <Shield className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-lg font-semibold">ROTC</p>
                <p className="text-xs text-emerald-100/80">Attendance management</p>
              </div>
            </div>

            <nav className="space-y-2">
              {role === 'admin' || role === 'officer' ? (
                <>
                  <button type="button" onClick={() => setCurrentTab('dashboard')} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${currentTab === 'dashboard' ? 'bg-white text-[#0F3D2E] shadow-sm' : 'text-emerald-50/90 hover:bg-white/10'}`}>
                    <BarChart2 size={17} /> Dashboard
                  </button>
                  <button type="button" onClick={() => setCurrentTab('attendance')} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${currentTab === 'attendance' ? 'bg-white text-[#0F3D2E] shadow-sm' : 'text-emerald-50/90 hover:bg-white/10'}`}>
                    <CheckCircle size={17} /> Attendance
                  </button>
                  {role === 'admin' && (
                    <button type="button" onClick={() => setCurrentTab('cadets')} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${currentTab === 'cadets' ? 'bg-white text-[#0F3D2E] shadow-sm' : 'text-emerald-50/90 hover:bg-white/10'}`}>
                      <Users size={17} /> Cadets
                    </button>
                  )}
                  <button type="button" onClick={() => setCurrentTab('reports')} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${currentTab === 'reports' ? 'bg-white text-[#0F3D2E] shadow-sm' : 'text-emerald-50/90 hover:bg-white/10'}`}>
                    <FileText size={17} /> Reports
                  </button>
                  <button type="button" onClick={() => setCurrentTab('profile')} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${currentTab === 'profile' ? 'bg-white text-[#0F3D2E] shadow-sm' : 'text-emerald-50/90 hover:bg-white/10'}`}>
                    <UserCircle2 size={17} /> Profile
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setCurrentTab('my-attendance')} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${currentTab === 'my-attendance' ? 'bg-white text-[#0F3D2E] shadow-sm' : 'text-emerald-50/90 hover:bg-white/10'}`}>
                  <User size={17} /> My Attendance
                </button>
              )}
            </nav>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{username}</p>
                <p className="text-xs capitalize text-emerald-100/80">{role} access</p>
              </div>
              <button type="button" onClick={onLogout} className="rounded-xl bg-white/10 p-2 text-emerald-100 transition hover:bg-red-500/20 hover:text-red-200">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-4 rounded-[20px] border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Operations</p>
                <h2 className="text-xl font-semibold text-slate-900">ROTC Attendance Workspace</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <Search size={15} />
                  <span>Search</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600">
                  <Bell size={16} />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600">
                  <Settings size={16} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F3D2E] text-xs font-semibold text-white">{initials}</span>
                  <span>{username}</span>
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}