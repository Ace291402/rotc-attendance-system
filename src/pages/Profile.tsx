import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useAuth } from '../AuthContext';
import { fetchAttendanceHistory, fetchAttendancePercentage } from '../attendanceService';
import { getCadetProfile } from '../cadetService';
import type { Attendance, AttendanceSummary, CadetProfileResponse } from '../types';

export default function Profile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<CadetProfileResponse | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!session?.cadetId) {
      setError('Cadet ID not available.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [profileData, attendanceData, percentageData] = await Promise.all([
        getCadetProfile(session.cadetId),
        fetchAttendanceHistory(session.cadetId),
        fetchAttendancePercentage(session.cadetId),
      ]);

      setProfile(profileData);
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      setAttendanceSummary(percentageData);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load profile data.');
    } finally {
      setLoading(false);
    }
  }, [session?.cadetId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (!session) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const attendanceRate =
    attendanceSummary?.attendancePercentage ?? attendanceSummary?.percentage ??
    (attendance.length > 0 ? Math.round((attendance.filter((r) => r.status === 'Present').length / attendance.length) * 100) : 0);

  const downloadQr = () => {
    if (!profile?.qrCodeId) return;

    const svg = document.getElementById('cadet-qr-svg') as SVGElement | null;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.fullName || 'cadet'}-qr.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">View your information and generated QR code.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={14} /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="animate-spin text-slate-400" size={24} />
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div>
                  <p className="text-sm text-slate-500">Full name</p>
                  <p className="text-lg font-semibold text-slate-900">{profile?.fullName ?? session.name}</p>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-slate-500">Username</p>
                  <p className="text-lg font-semibold text-slate-900">{session.username}</p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Student Number</p>
                    <p className="text-lg font-semibold text-slate-900">{profile?.studentNumber ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Year Level</p>
                    <p className="text-lg font-semibold text-slate-900">{profile?.yearLevel ?? '—'}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Course</p>
                    <p className="text-lg font-semibold text-slate-900">{profile?.course ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Role</p>
                    <p className="text-lg font-semibold text-slate-900 capitalize">{session.role}</p>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">My QR Code</p>
                {profile?.qrCodeId ? (
                  <div className="inline-flex items-center justify-center rounded-2xl bg-white p-4">
                    <QRCode id="cadet-qr-svg" value={profile.qrCodeId} size={160} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">QR Code not available.</p>
                )}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={downloadQr}
                    disabled={!profile?.qrCodeId}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Download QR
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadData()}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Attendance history</h2>
            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">Attendance rate</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{attendanceRate}%</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">Total records</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{attendance.length}</p>
              </div>
            </div>

            {attendance.length === 0 ? (
              <p className="text-sm text-slate-500">No attendance records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-slate-700">Date</th>
                      <th className="px-4 py-2 font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => (
                      <tr key={record.id} className="border-b border-slate-100">
                        <td className="px-4 py-2 text-slate-900">{record.date}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${record.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {record.status || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
