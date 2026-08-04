import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { fetchAttendance, fetchAttendanceReport, fetchAttendanceSummary } from '../attendanceService';
import { fetchCadets } from '../cadetService';
import type { ApiCadet, Attendance, AttendanceReport, AttendanceSummary } from '../types';

export default function Dashboard() {
  const { session } = useAuth();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [cadets, setCadets] = useState<ApiCadet[]>([]);
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [attendanceData, cadetData, reportData, summaryData] = await Promise.all([
        fetchAttendance(),
        fetchCadets(),
        fetchAttendanceReport(),
        fetchAttendanceSummary(),
      ]);

      setRecords(attendanceData.slice(0, 5));
      setCadets(cadetData);
      setReport(reportData);
      setSummary(summaryData);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();

    const handleRefresh = () => {
      void loadData();
    };

    window.addEventListener('rotc-data-changed', handleRefresh);
    return () => window.removeEventListener('rotc-data-changed', handleRefresh);
  }, [loadData]);

  const totalCadets = summary?.totalCadets ?? cadets.length;
  const presentToday = summary?.presentToday ?? 0;
  const absentToday = summary?.absentToday ?? 0;
  const lateToday = summary?.lateToday ?? 0;
  const attendanceToday = presentToday;
  const totalAttendance = summary?.totalAttendance ?? records.length;
  const attendanceRate = summary?.attendancePercentage ?? (totalCadets > 0 ? Math.round((presentToday / totalCadets) * 100) : 0);

  if (!session?.role) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back, {session.name || session.username}. Role: {session.role}</p>
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
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total cadets</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalCadets}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Present today</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">{presentToday}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Absent today</p>
              <p className="mt-2 text-2xl font-semibold text-rose-600">{absentToday}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Late today</p>
              <p className="mt-2 text-2xl font-semibold text-amber-600">{lateToday}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attendance today</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{attendanceToday}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attendance rate</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{attendanceRate}%</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total attendance</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalAttendance}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Recent attendance</h2>
              <button
                type="button"
                onClick={() => void loadData()}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Refresh
              </button>
            </div>

            {records.length === 0 ? (
              <p className="text-sm text-slate-500">No attendance records available.</p>
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

          {report && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Report summary</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase text-slate-500">Weekly summary</p>
                  <p className="mt-2 text-sm text-slate-900">{report.weeklySummary}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase text-slate-500">Pending review</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{report.pendingReview}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase text-slate-500">Export ready</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{report.exportReady}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
