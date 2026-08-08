import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, LoaderCircle } from 'lucide-react';
import { fetchAttendanceReport, fetchAttendance } from '../attendanceService';
import type { AttendanceReport, Attendance } from '../types';

export default function Reports() {
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const formatDateTime = (iso?: string) => {
    if (!iso) return { dateStr: '', timeStr: '' };
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return { dateStr: iso, timeStr: '' };
    }
    return {
      dateStr: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(date),
      timeStr: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'Asia/Manila' }).format(date),
    };
  };

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [records],
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const [reportData, attendanceData] = await Promise.all([
          fetchAttendanceReport(),
          fetchAttendance(),
        ]);

        setReport(reportData);
        setRecords(attendanceData);
      } catch (loadError) {
        console.error(loadError);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load reports.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
    const handleRefresh = () => {
      void loadData();
    };
    window.addEventListener('rotc-data-changed', handleRefresh);
    return () => window.removeEventListener('rotc-data-changed', handleRefresh);
  }, []);

  const handleExportCsv = () => {
    if (records.length === 0) {
      setMessage('No attendance records to export.');
      return;
    }

    const headers = ['ID', 'Cadet', 'Date', 'Status'];
    const rows = records.map((r) => [r.id, r.cadet?.fullName ?? `Cadet ${r.cadetId}`, r.date, r.status]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setMessage('Report exported successfully.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">View attendance reports and export data.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={14} /> <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="animate-spin text-slate-400" size={24} />
        </div>
      ) : (
        <>
          {/* Report Summary */}
          {report && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Weekly summary</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{report.weeklySummary}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pending review</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{report.pendingReview}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Export ready</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{report.exportReady}</p>
              </div>
            </div>
          )}

          {/* Export Button */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <button
              onClick={handleExportCsv}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Download size={16} /> Export as CSV
            </button>
          </div>

          {/* Attendance Records */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Attendance records</h2>
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
                    {sortedRecords.map((record) => (
                      <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-900">
                          {record.cadet?.fullName ?? `Cadet ${record.cadetId}`}
                        </td>
                        <td className="px-4 py-2 text-slate-600">
                          {(() => {
                            const fmt = formatDateTime(record.date);
                            return (
                              <>
                                <div>{fmt.dateStr}</div>
                                <div className="text-xs text-slate-500">{fmt.timeStr}</div>
                              </>
                            );
                          })()}
                        </td>
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
        </>
      )}
    </div>
  );
}
