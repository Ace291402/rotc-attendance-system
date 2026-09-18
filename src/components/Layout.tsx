import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Shield, LogOut, BarChart2, CheckCircle, Users, FileText, User, Bell, Search, ChevronDown, Settings, UserCircle2, Menu, X, LoaderCircle } from 'lucide-react';
import type { Role } from '../types';
import { fetchAttendance } from '../attendanceService';
import { fetchCadets } from '../cadetService';
import type { ApiCadet, Attendance } from '../types';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  username: string;
  role: Role;
  cadetId?: number;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Layout({ children, username, role, cadetId, currentTab, setCurrentTab, onLogout }: LayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cadets, setCadets] = useState<ApiCadet[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const initials = username
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'RO';

  useEffect(() => {
    if (!searchOpen && !notificationOpen) return;

    let cancelled = false;
    setDataLoading(true);
    setDataError('');

    const loadHeaderData = async () => {
      try {
        const [cadetResult, attendanceResult] = await Promise.allSettled([fetchCadets(), fetchAttendance()]);
        if (cancelled) return;

        if (cadetResult.status === 'fulfilled') setCadets(cadetResult.value);
        if (attendanceResult.status === 'fulfilled') setAttendance(attendanceResult.value);
        if (cadetResult.status === 'rejected' && attendanceResult.status === 'rejected') {
          setDataError('Unable to load search and notification data.');
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };

    void loadHeaderData();
    return () => {
      cancelled = true;
    };
  }, [notificationOpen, searchOpen]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!searchRef.current?.contains(target)) setSearchOpen(false);
      if (!notificationRef.current?.contains(target)) setNotificationOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!normalizedSearch) return [];

    const results: Array<{ key: string; title: string; detail: string; path: string }> = [];
    if (username.toLowerCase().includes(normalizedSearch)) {
      results.push({ key: 'user', title: username, detail: `${role} account`, path: role === 'cadet' ? '/my-attendance' : '/profile' });
    }

    if (role !== 'cadet') {
      cadets.forEach((cadet) => {
        const values = [cadet.fullName, cadet.studentNumber, cadet.course, cadet.yearLevel]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        if (values.some((value) => value.includes(normalizedSearch))) {
          results.push({
            key: `cadet-${cadet.id}`,
            title: cadet.fullName || `Cadet ${cadet.id}`,
            detail: [cadet.studentNumber, cadet.course, cadet.yearLevel].filter(Boolean).join(' - '),
            path: '/cadets',
          });
        }
      });
    }

    attendance.forEach((record) => {
      if (role === 'cadet' && record.cadetId !== cadetId) return;
      const values = [record.cadet?.fullName, record.cadet?.studentNumber, record.cadet?.course, record.cadet?.yearLevel, record.status, record.date]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      if (values.some((value) => value.includes(normalizedSearch))) {
        results.push({
          key: `attendance-${record.id}`,
          title: record.cadet?.fullName || `Cadet ${record.cadetId}`,
          detail: `Attendance - ${record.status || 'Recorded'} - ${new Date(record.date).toLocaleDateString()}`,
          path: role === 'cadet' ? '/my-attendance' : '/attendance',
        });
      }
    });

    return results.slice(0, 8);
  }, [attendance, cadets, cadetId, normalizedSearch, role, username]);

  const notifications = useMemo(() => {
    return attendance
      .filter((record) => role !== 'cadet' || record.cadetId === cadetId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [attendance, cadetId, role]);

  const openSearchResult = (path: string) => {
    setSearchOpen(false);
    setSearchTerm('');
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 overflow-x-hidden">
      <div className="flex min-h-screen w-full max-w-full">
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

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-full">
          <div className="mx-auto w-full max-w-7xl">
            <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(true)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700"
                  >
                    <Menu size={20} />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">ROTC Dashboard</p>
                    <p className="text-xs text-slate-500 truncate">{username}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
            {mobileNavOpen && (
              <div className="fixed inset-0 z-50 flex bg-slate-900/70 lg:hidden">
                <div className="absolute inset-0" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
                <div className="relative flex w-72 flex-col justify-between bg-[#0F3D2E] p-6 text-white shadow-xl">
                  <div>
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white/10 p-2.5">
                          <Shield className="h-5 w-5 text-emerald-300" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold">ROTC</p>
                          <p className="text-xs text-emerald-100/80">Attendance management</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setMobileNavOpen(false)} className="rounded-2xl bg-white/10 p-2.5 text-white">
                        <X size={20} />
                      </button>
                    </div>
                    <nav className="space-y-2">
                      {role === 'admin' || role === 'officer' ? (
                        <>
                          <button type="button" onClick={() => { setCurrentTab('dashboard'); setMobileNavOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${currentTab === 'dashboard' ? 'bg-white text-[#0F3D2E] shadow-sm' : 'text-emerald-50/90 hover:bg-white/10'}`}>
                            <BarChart2 size={17} /> Dashboard
                          </button>
                          <button type="button" onClick={() => { setCurrentTab('attendance'); setMobileNavOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${currentTab === 'attendance' ? 'bg-white text-[#0F3D2E] shadow-sm' : 'text-emerald-50/90 hover:bg-white/10'}`}>
                            <CheckCircle size={17} /> Attendance
                          </button>
                          {role === 'admin' && (
                            <button type="button" onClick={() => { setCurrentTab('cadets'); setMobileNavOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${currentTab === 'cadets' ? 'bg-white text-[#0F3D2E] shadow-sm' : 'text-emerald-50/90 hover:bg-white/10'}`}>
                              <Users size={17} /> Cadets
                            </button>
                          )}
                          <button type="button" onClick={() => { setCurrentTab('reports'); setMobileNavOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${currentTab === 'reports' ? 'bg-white text-[#0F3D2E] shadow-sm' : 'text-emerald-50/90 hover:bg-white/10'}`}>
                            <FileText size={17} /> Reports
                          </button>
                          <button type="button" onClick={() => { setCurrentTab('profile'); setMobileNavOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${currentTab === 'profile' ? 'bg-white text-[#0F3D2E] shadow-sm' : 'text-emerald-50/90 hover:bg-white/10'}`}>
                            <UserCircle2 size={17} /> Profile
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => { setCurrentTab('my-attendance'); setMobileNavOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${currentTab === 'my-attendance' ? 'bg-white text-[#0F3D2E] shadow-sm' : 'text-emerald-50/90 hover:bg-white/10'}`}>
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
                </div>
              </div>
            )}
            <div className="mb-6 flex flex-col gap-4 rounded-[20px] border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Operations</p>
                <h2 className="text-xl font-semibold text-slate-900">ROTC Attendance Workspace</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div ref={searchRef} className="relative">
                  <button
                    type="button"
                    aria-expanded={searchOpen}
                    aria-label="Search records"
                    onClick={() => { setSearchOpen((open) => !open); setNotificationOpen(false); }}
                    className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    <Search size={15} />
                    <span className="hidden sm:inline">Search</span>
                  </button>
                  {searchOpen && (
                    <div className="absolute right-0 top-12 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <input
                        autoFocus
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search cadets or attendance"
                        aria-label="Search cadets or attendance"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500"
                      />
                      {dataLoading && <LoaderCircle className="mx-auto my-4 animate-spin text-slate-400" size={18} />}
                      {!dataLoading && dataError && <p className="px-2 py-4 text-sm text-red-600">{dataError}</p>}
                      {!dataLoading && !dataError && normalizedSearch && searchResults.length === 0 && <p className="px-2 py-4 text-sm text-slate-500">No results found</p>}
                      {!dataLoading && !dataError && searchResults.length > 0 && (
                        <div className="mt-2 max-h-72 overflow-y-auto">
                          {searchResults.map((result) => (
                            <button type="button" key={result.key} onClick={() => openSearchResult(result.path)} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50">
                              <span className="block truncate text-sm font-semibold text-slate-800">{result.title}</span>
                              <span className="block truncate text-xs text-slate-500">{result.detail}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div ref={notificationRef} className="relative">
                  <button
                    type="button"
                    aria-expanded={notificationOpen}
                    aria-label="Open attendance notifications"
                    onClick={() => { setNotificationOpen((open) => !open); setSearchOpen(false); }}
                    className="relative rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600 hover:bg-slate-100"
                  >
                    <Bell size={16} />
                  </button>
                  {notificationOpen && (
                    <div className="absolute right-0 top-12 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="flex items-center justify-between px-2 pb-2">
                        <p className="text-sm font-semibold text-slate-800">Attendance activity</p>
                        <span className="text-xs text-slate-400">Live records</span>
                      </div>
                      {dataLoading && <LoaderCircle className="mx-auto my-4 animate-spin text-slate-400" size={18} />}
                      {!dataLoading && dataError && <p className="px-2 py-4 text-sm text-red-600">{dataError}</p>}
                      {!dataLoading && !dataError && notifications.length === 0 && <p className="px-2 py-4 text-sm text-slate-500">No notifications</p>}
                      {!dataLoading && !dataError && notifications.length > 0 && (
                        <div className="max-h-72 overflow-y-auto">
                          {notifications.map((record) => (
                            <button type="button" key={record.id} onClick={() => openSearchResult(role === 'cadet' ? '/my-attendance' : '/attendance')} className="block w-full rounded-xl px-2 py-2 text-left hover:bg-slate-50">
                              <span className="block text-sm font-semibold text-slate-800">{record.cadet?.fullName || `Cadet ${record.cadetId}`}</span>
                              <span className="block text-xs text-slate-500">{record.status || 'Attendance recorded'} - {new Date(record.date).toLocaleString()}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600">
                  <Settings size={16} />
                </div>
                <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F3D2E] text-xs font-semibold text-white">{initials}</span>
                  <span className="hidden md:inline truncate">{username}</span>
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