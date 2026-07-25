import { useEffect, useState } from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { getCadetQr } from '../cadetService';
import { fetchAttendance } from '../attendanceService';
import type { Attendance } from '../types';

export default function Profile() {
  const { session } = useAuth();
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!session?.cadetId) {
        setError('Cadet ID not available.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [qrData, attendanceData] = await Promise.all([
          getCadetQr(session.cadetId!),
          fetchAttendance(),
        ]);

        if (qrData.qrCodeImageBase64) {
          setQrImage(`data:image/png;base64,${qrData.qrCodeImageBase64}`);
        }

        // Filter attendance for this cadet
        const cadetAttendance = attendanceData.filter((r) => r.cadetId === session.cadetId);
        setAttendance(cadetAttendance);
      } catch (loadError) {
        console.error(loadError);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load profile data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [session?.cadetId]);

  if (!session) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const attendanceRate =
    attendance.length > 0
      ? Math.round(
          (attendance.filter((r) => r.status === 'Present').length / attendance.length) * 100
        )
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">View your information and QR code.</p>
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
          {/* Profile Info Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="text-lg font-semibold text-slate-900">{session.name}</p>

                <p className="mt-4 text-sm text-slate-500">Username</p>
                <p className="text-lg font-semibold text-slate-900">{session.username}</p>

                <p className="mt-4 text-sm text-slate-500">Role</p>
                <p className="text-lg font-semibold text-slate-900 capitalize">{session.role}</p>

                {session.platoon && (
                  <>
                    <p className="mt-4 text-sm text-slate-500">Platoon</p>
                    <p className="text-lg font-semibold text-slate-900">{session.platoon}</p>
                  </>
                )}
              </div>

              {/* QR Code */}
              {qrImage && (
                <div className="flex flex-col items-center">
                  <p className="mb-2 text-sm font-semibold text-slate-600">Your QR Code</p>
                  <img
                    src={qrImage}
                    alt="Cadet QR Code"
                    className="h-48 w-48 border border-slate-200 rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Attendance History */}
          {session.role === 'cadet' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Attendance history</h2>

              <div className="mb-4 flex gap-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Attendance rate</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{attendanceRate}%</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Total records</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{attendance.length}</p>
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
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                record.status === 'Present'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
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
          )}
        </>
      )}
    </div>
  );
}
