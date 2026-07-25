import { useEffect, useState } from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { fetchAttendance, fetchAttendanceReport } from '../attendanceService';
import { fetchCadets } from '../cadetService';
import type { ApiCadet, Attendance, AttendanceReport } from '../types';

export default function Dashboard() {
  const { session } = useAuth();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [cadets, setCadets] = useState<ApiCadet[]>([]);
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const [attendanceData, cadetData, reportData] = await Promise.all([
          fetchAttendance(),
          fetchCadets(),
          fetchAttendanceReport(),
        ]);

        setRecords(attendanceData.slice(0, 5)); // Last 5 records
        setCadets(cadetData);
        setReport(reportData);
      } catch (loadError) {
        console.error(loadError);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const cadetCount = cadets.length;
  const todayCount = records.filter((r) => r.date === new Date().toISOString().slice(0, 10)).length;
  const attendanceRate = cadetCount > 0 ? Math.round((todayCount / cadetCount) * 100) : 0;

  if (!session?.role) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back, {session.name}. Role: {session.role}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={14} /> <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="animate-spin text-slate-400" size={24} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cadets enrolled</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{cadetCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Present today</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">{todayCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attendance rate</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{attendanceRate}%</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reports ready</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{report?.exportReady ?? 0}</p>
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent attendance</h2>
            {records.length === 0 ? (
              <p className="text-sm text-slate-500">No attendance records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-slate-700">Cadet</th>
                      <th className="px-4 py-2 font-semibold text-slate-700">Date</th>
                      <th className="px-4 py-2 font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-b border-slate-100">
                        <td className="px-4 py-2 font-medium text-slate-900">
                          {record.cadet?.fullName ?? `Cadet ${record.cadetId}`}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{record.date}</td>
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

          {/* Report Summary */}
          {report && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Report summary</h2>
              <div className="space-y-2 text-sm text-slate-700">
                <p>
                  <strong>Weekly summary:</strong> {report.weeklySummary}
                </p>
                <p>
                  <strong>Pending review:</strong> {report.pendingReview} records
                </p>
                <p>
                  <strong>Export ready:</strong> {report.exportReady} reports
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
