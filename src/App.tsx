import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Cadets from './pages/Cadets';
import Reports from './pages/Reports';
import { UserCheck, QrCode, FileText, AlertTriangle, User } from 'lucide-react';
import { loginUser, registerUser, fetchCadets, fetchAttendance, setToken, clearToken, scanAttendanceQr, getCadetQr } from './api.ts';
import type { ApiCadet, Cadet, Role } from './types';

interface AuditLog {
  id: string;
  timestamp: string;
  officerName: string;
  platoon: string;
  cadetName: string;
  action: string;
  isSuspicious: boolean; 
}

export default function App() {
  const [session, setSession] = useState<{ username: string; role: Role; name: string; platoon?: string; cadetId?: number } | null>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isScanning, setIsScanning] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [cadetQr, setCadetQr] = useState<{ qrCodeValue?: string; qrCodeImageBase64?: string } | null>(null);
  
  // State para sa pag-view sa profile (para sa Admin)
  const [selectedCadetProfile, setSelectedCadetProfile] = useState<Cadet | null>(null);

  // Gipadak-an nga Data Registry nga naay Profile ug Attendance Analytics
  const [cadetRoster, setCadetRoster] = useState<Cadet[]>([]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: '1', timestamp: '2026-07-11 06:15H', officerName: 'Cdt/Lt. Fletcher', platoon: 'Platoon Alpha', cadetName: 'Cadet Juan Dela Cruz', action: 'Standard QR Scan Validation', isSuspicious: false },
  ]);

  const loadCadets = async () => {
    try {
      const [cadets, attendance] = await Promise.all([fetchCadets(), fetchAttendance()]);
      const today = new Date().toISOString().slice(0, 10);
      const presentByCadet = new Map<number, number>();

      attendance.forEach((record) => {
        if (record.date === today) {
          const cadetId = Number(record.cadetId);
          presentByCadet.set(cadetId, (presentByCadet.get(cadetId) ?? 0) + 1);
        }
      });

      setCadetRoster(cadets.map((cadet: ApiCadet) => {
        const presentCount = presentByCadet.get(cadet.id) ?? 0;

        return {
          id: String(cadet.id),
          name: cadet.fullName ?? 'Unknown Cadet',
          serialNumber: cadet.studentNumber ?? 'N/A',
          sn: cadet.studentNumber ?? 'N/A',
          platoon: 'Platoon Alpha',
          status: presentCount > 0 ? 'Present' : 'Unaccounted',
          company: undefined,
          attendanceRate: presentCount > 0 ? 100 : 0,
          rank: 'Cadet Private',
          courseYear: `${cadet.course ?? 'Unknown'} • ${cadet.yearLevel ?? 'N/A'}`,
          totalPresent: presentCount,
          totalAbsent: presentCount > 0 ? 0 : 1,
          requirements: { birthCertificate: false, medicalClearance: false, rotcForm1: false }
        };
      }));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (session) {
      loadCadets();
    }
  }, [session]);

  const handleRegister = async (username: string, password: string, role: Role) => {
    try {
      const result = await registerUser(username, password, role);
      return result.success;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const handleLogin = async (username: string, password: string, role: Role) => {
    try {
      const auth = await loginUser(username, password, role);
      if (auth?.token && auth.user) {
        setToken(auth.token);
        setSession({
          username: auth.user.username,
          role: auth.user.role,
          name: auth.user.name ?? auth.user.username,
          platoon: auth.user.platoon ?? 'Platoon Alpha',
          cadetId: auth.cadet?.id,
        });

        if (auth.cadet?.id) {
          const qr = await getCadetQr(auth.cadet.id);
          setCadetQr(qr);
        }

        setCurrentTab(auth.user.role === 'cadet' ? 'my-attendance' : 'dashboard');
        return true;
      }

      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const handleLogout = () => {
    clearToken();
    setSession(null);
    setCurrentTab('dashboard');
  };

  const triggerSuccessfulQRScan = async () => {
    if (!session) {
      return;
    }

    try {
      const response = await scanAttendanceQr(qrInput.trim() || 'demo-qr-code', session.name);
      setIsScanning(false);

      if (response.success) {
        const newLog: AuditLog = {
          id: String(auditLogs.length + 1),
          timestamp: new Date().toLocaleString(),
          officerName: session.name,
          platoon: session.platoon || 'Field Command',
          cadetName: response.cadetName || 'Cadet',
          action: 'QR Scan Recorded via Backend',
          isSuspicious: false
        };
        setAuditLogs(prev => [newLog, ...prev]);
        await loadCadets();
        alert(`⚡ ${response.message}`);
      } else {
        alert(`⚠️ ${response.message}`);
      }
    } catch (error) {
      console.error(error);
      alert('Could not process QR scan.');
    }
  };

  if (!session) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} />;
  }

  // Pagkuha sa Profile sa kasamtangang naka-login nga Cadet
  const currentCadetProfile = cadetRoster.find(c => Number(c.id) === (session.cadetId ?? -1)) ?? cadetRoster.find(c => c.name === session.name) ?? null;

  return (
    <Layout username={session.username} role={session.role} currentTab={currentTab} setCurrentTab={setCurrentTab} onLogout={handleLogout}>
      {currentTab === 'dashboard' && <Dashboard />}
      
      {currentTab === 'attendance' && (
        <div className="space-y-4 md:space-y-6 px-2 md:px-0">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              {session.role === 'officer' ? 'FIELD ATTENDANCE' : 'COMMAND OVERLAY'}
            </h1>
          </div>

          {/* ========================================================= */}
          {/* INTERFACE SA OFFICER                                      */}
          {/* ========================================================= */}
          {session.role === 'officer' && (
            <div className="space-y-3">
              <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase block">{session.platoon}</span>
                  <span className="text-sm font-bold">QR Attendance Terminal</span>
                </div>
                <button onClick={() => setIsScanning(true)} className="px-3 py-2 bg-emerald-600 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer">
                  📷 Open QR Scanner
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {cadetRoster.filter(c => c.platoon === session.platoon).map(cadet => (
                  <div key={cadet.id} className="bg-white p-4 rounded-xl border flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{cadet.name}</h4>
                      <span className="text-[10px] text-slate-400 block">SN: {cadet.sn}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${cadet.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{cadet.status}</span>
                  </div>
                ))}
              </div>

              {/* CAMERA INTERACTIVE MOCK MODAL */}
              {isScanning && (
                <div className="fixed inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-between p-6 text-white">
                  <div className="text-center pt-8">
                    <h3 className="text-sm font-bold tracking-widest text-emerald-400">ROTC LENS SCANNER</h3>
                  </div>
                  <div className="relative w-64 h-64 border-2 border-dashed border-slate-500 rounded-2xl flex items-center justify-center bg-slate-900/50 my-auto">
                    <QrCode size={80} className="text-slate-600 animate-pulse" />
                    <div className="absolute w-full h-0.5 bg-emerald-400 top-1/2 left-0 animate-bounce"></div>
                  </div>
                  <div className="w-full max-w-xs space-y-3 pb-8">
                    <input
                      value={qrInput}
                      onChange={(event) => setQrInput(event.target.value)}
                      placeholder="Paste or type QR value"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none"
                    />
                    <button onClick={triggerSuccessfulQRScan} className="w-full py-3 bg-emerald-600 rounded-xl text-xs font-bold">Submit QR Scan</button>
                    <button onClick={() => setIsScanning(false)} className="w-full py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* INTERFACE SA ADMIN (ROSTER MATRIX + REQUIREMENT CHECK)     */}
          {/* ========================================================= */}
          {session.role === 'admin' && (
            <div className="space-y-4 md:space-y-6">
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                  <UserCheck size={14} className="text-emerald-500" /> Live Cadet Registry & File Status
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[600px]">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Cadet Name / SN</th>
                        <th className="p-3">Platoon</th>
                        <th className="p-3">Attendance Stats</th>
                        <th className="p-3">Requirements Status</th>
                        <th className="p-3 text-right">File Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {cadetRoster.map(c => {
                        // Pag-check kung naay kulang nga requirement
                        const hasMissing = !c.requirements.birthCertificate || !c.requirements.medicalClearance || !c.requirements.rotcForm1;
                        
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/60">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{c.name}</div>
                              <div className="text-[10px] text-slate-400">{c.sn} • {c.courseYear}</div>
                            </td>
                            <td className="p-3 font-semibold text-slate-600">{c.platoon}</td>
                            <td className="p-3">
                              <span className="text-emerald-600 font-bold">✓ {c.totalPresent} Pres.</span>
                              <span className="mx-1.5 text-slate-300">|</span>
                              <span className={c.totalAbsent > 1 ? 'text-red-600 font-bold' : 'text-slate-400'}>✕ {c.totalAbsent} Abs.</span>
                            </td>
                            <td className="p-3">
                              {hasMissing ? (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px] border border-amber-200">
                                  <AlertTriangle size={10} className="text-amber-600" /> Incomplete Docs
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold text-[10px]">
                                  ✓ All Cleared
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button 
                                onClick={() => setSelectedCadetProfile(c)}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold tracking-wide transition-all cursor-pointer">
                                🔍 Inspect Profile
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ADMIN PROFILE INSPECTOR OVERLAY MODAL */}
              {selectedCadetProfile && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-start border-b pb-3">
                      <div>
                        <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">{selectedCadetProfile.rank}</span>
                        <h3 className="text-base font-black text-slate-900 mt-1">{selectedCadetProfile.name}</h3>
                        <p className="text-xs text-slate-400">{selectedCadetProfile.sn}</p>
                      </div>
                      <button onClick={() => setSelectedCadetProfile(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
                    </div>

                    {/* Requirements Checkbox Matrix */}
                    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border">
                      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1"><FileText size={13} /> Official Enlistment Dossier</h4>
                      <div className="space-y-2 pt-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">PSA Birth Certificate:</span>
                          <span className={selectedCadetProfile.requirements.birthCertificate ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                            {selectedCadetProfile.requirements.birthCertificate ? "✓ Submitted" : "✕ MISSING"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Command Medical Clearance:</span>
                          <span className={selectedCadetProfile.requirements.medicalClearance ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                            {selectedCadetProfile.requirements.medicalClearance ? "✓ Submitted" : "✕ MISSING"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">HQ ROTC Form 1:</span>
                          <span className={selectedCadetProfile.requirements.rotcForm1 ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                            {selectedCadetProfile.requirements.rotcForm1 ? "✓ Submitted" : "✕ MISSING"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-slate-900 text-white p-4 rounded-xl text-center">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Total Present Days</span>
                        <span className="text-2xl font-black text-emerald-400">{selectedCadetProfile.totalPresent}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Total Absences</span>
                        <span className="text-2xl font-black text-red-400">{selectedCadetProfile.totalAbsent}</span>
                      </div>
                    </div>

                    <button onClick={() => setSelectedCadetProfile(null)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                      Dismiss Record Overlay
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {currentTab === 'cadets' && <Cadets role={session.role} cadets={cadetRoster} />}
      {currentTab === 'reports' && <Reports />}
      
      {/* ========================================================= */}
      {/* CADET EXCLUSIVE CONSOLE (PROFILE & ATTENDANCE CARD)        */}
      {/* ========================================================= */}
      {currentTab === 'my-attendance' && currentCadetProfile && (
        <div className="space-y-6 px-2 md:px-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">CADET SELF-SERVICE TERMINAL</h1>
            <p className="text-xs text-slate-500">Real-time status tracking and identity authentication.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CARD 1: CADET BIOMETRIC / PROFILE DETAILS */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-900 text-white rounded-xl">
                  <User size={20} />
                </div>
                <div>
                  <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-600 uppercase tracking-wide">{currentCadetProfile.rank}</span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">{currentCadetProfile.name}</h3>
                  <p className="text-[10px] text-slate-400">{currentCadetProfile.courseYear}</p>
                </div>
              </div>
              <div className="border-t pt-2 text-[11px] space-y-1.5 text-slate-600">
                <div><strong>Serial Number:</strong> <span className="font-mono">{currentCadetProfile.sn}</span></div>
                <div><strong>Sector Assignment:</strong> {currentCadetProfile.platoon}</div>
              </div>
            </div>

            {/* CARD 2: REAL-TIME ATTENDANCE METER */}
            <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Attendance Ledger Tracker</span>
                <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">Semester 1</span>
              </div>
              <div className="flex items-baseline gap-2 my-2">
                <span className="text-3xl font-black text-emerald-400">{currentCadetProfile.totalPresent}</span>
                <span className="text-xs text-slate-400">Duties Attended</span>
              </div>
              <p className="text-[10px] text-slate-400 border-t border-slate-800 pt-2">
                Current Absences Recorded: <span className="text-red-400 font-bold">{currentCadetProfile.totalAbsent}</span> (Limit: Max 3 Absences)
              </p>
            </div>

            {/* CARD 3: REQUIREMENTS CHECKLIST (PARA MAKITA SA CADETE) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Requirement Verification</span>
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between items-center">
                  <span>PSA Birth Certificate</span>
                  <span className={currentCadetProfile.requirements.birthCertificate ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                    {currentCadetProfile.requirements.birthCertificate ? "✓ Verified" : "✕ Missing"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Medical Clearance</span>
                  <span className={currentCadetProfile.requirements.medicalClearance ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                    {currentCadetProfile.requirements.medicalClearance ? "✓ Verified" : "✕ Missing"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>ROTC Form 1</span>
                  <span className={currentCadetProfile.requirements.rotcForm1 ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                    {currentCadetProfile.requirements.rotcForm1 ? "✓ Verified" : "✕ Missing"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC QR AUTHENTICATION TERMINAL */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center gap-4 text-center max-w-sm mx-auto">
            <div className="text-center">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-center gap-1">
                <QrCode size={14} className="text-emerald-500" /> Digital Duty Token
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Show this to the Platoon Inspector during formation checks.</p>
            </div>
            <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl shadow-inner">
              {cadetQr?.qrCodeImageBase64 ? (
                <img src={`data:image/png;base64,${cadetQr.qrCodeImageBase64}`} alt="Cadet QR Code" className="h-40 w-40 object-contain" />
              ) : (
                <QrCode size={160} className="text-slate-800" />
              )}
            </div>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{cadetQr?.qrCodeValue ? `TOKEN_ID::${cadetQr.qrCodeValue}` : `TOKEN_ID::${currentCadetProfile.sn}`}</span>
          </div>
        </div>
      )}
    </Layout>
  );
}