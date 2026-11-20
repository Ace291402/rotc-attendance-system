import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, LoaderCircle } from 'lucide-react';
import { fetchAttendanceReport, fetchAttendance } from '../attendanceService';
import type { AttendanceReport, Attendance } from '../types';

function getAttendanceDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Manila',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export default function Reports() {
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [specificDate, setSpecificDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const formatTime = (value?: string | null) => {
    if (!value) return '';

    const timeOnly = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(AM|PM)?$/i.exec(value.trim());
    if (timeOnly) {
      const hour = Number(timeOnly[1]);
      const minute = Number(timeOnly[2]);
      const second = Number(timeOnly[3] ?? 0);
      const suffix = timeOnly[4]?.toUpperCase();
      const validHour = suffix ? hour >= 1 && hour <= 12 : hour <= 23;
      if (validHour && minute <= 59 && second <= 59) {
        const hour12 = suffix ? hour : (hour % 12 || 12);
        const period = suffix ?? (hour < 12 ? 'AM' : 'PM');
        return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
      }
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone: 'Asia/Manila',
    }).format(date);
  };

  const invalidDateRange = Boolean(startDate && endDate && endDate < startDate);

  const filteredRecords = useMemo(() => {
    if (invalidDateRange) return [];

    return records
      .filter((record) => {
        const recordDate = getAttendanceDateKey(record.date);
        const statusMatches = !statusFilter || record.status?.toLowerCase() === statusFilter.toLowerCase();
        const specificDateMatches = !specificDate || recordDate === specificDate;
        const startDateMatches = !startDate || recordDate >= startDate;
        const endDateMatches = !endDate || recordDate <= endDate;
        return statusMatches && specificDateMatches && startDateMatches && endDateMatches;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, statusFilter, specificDate, startDate, endDate, invalidDateRange]);

  const resetFilters = () => {
    setStatusFilter('');
    setSpecificDate('');
    setStartDate('');
    setEndDate('');
    setMessage('');
  };

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
    setError('');
    setMessage('');

    if (invalidDateRange) {
      setMessage('End date must be on or after the start date.');
      return;
    }

    if (filteredRecords.length === 0) {
      setMessage('No matching attendance records to export.');
      return;
    }

    const headers = ['ID', 'Cadet Name', 'Attendance Date', 'Time In', 'Time Out', 'Attendance Status'];
    const recordsByDate = [...filteredRecords].sort((a, b) =>
      getAttendanceDateKey(a.date).localeCompare(getAttendanceDateKey(b.date)),
    );
    const firstDate = getAttendanceDateKey(recordsByDate[0].date);
    const lastDate = getAttendanceDateKey(recordsByDate[recordsByDate.length - 1].date);
    const formatDateKey = (dateKey: string) => {
      const date = new Date(`${dateKey}T12:00:00+08:00`);
      if (Number.isNaN(date.getTime())) return dateKey;
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila',
      }).format(date);
    };
    const reportingPeriod = firstDate === lastDate
      ? formatDateKey(firstDate)
      : `${formatDateKey(firstDate)} - ${formatDateKey(lastDate)}`;
    const generatedAt = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
      timeZoneName: 'short',
    }).format(new Date());
    const dataRows = filteredRecords.map((record) => [
      record.id,
      record.cadet?.fullName ?? `Cadet ${record.cadetId}`,
      formatDateTime(record.date).dateStr,
      formatTime(record.timeIn),
      formatTime(record.timeOut),
      record.status ?? '',
    ]);
    const csvRows: (string | number)[][] = [
      ['ROTC ATTENDANCE MANAGEMENT SYSTEM'],
      ['ATTENDANCE REPORT'],
      ['Report Generated', generatedAt],
      ['Reporting Period', reportingPeriod],
      ['Total Attendance Records', filteredRecords.length],
      [],
      headers,
      ...dataRows,
    ];
    const escapeCsvValue = (value: string | number) => {
      const text = String(value);
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = csvRows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
    let downloadUrl = '';

    try {
      const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
      downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
      setMessage('Report exported successfully.');
    } catch (exportError) {
      if (downloadUrl) window.URL.revokeObjectURL(downloadUrl);
      console.error('Unable to export attendance report.', exportError);
      setError(exportError instanceof Error ? `Unable to export CSV: ${exportError.message}` : 'Unable to export CSV.');
    }
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

          {/* Attendance filters and export */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Filter attendance records</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                Attendance status
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setMessage('');
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">All Status</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                Specific date
                <input
                  type="date"
                  value={specificDate}
                  onChange={(event) => {
                    setSpecificDate(event.target.value);
                    setMessage('');
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                Start date
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setMessage('');
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                End date
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setMessage('');
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </label>
            </div>
            {invalidDateRange && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                End date must be on or after the start date.
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                All Records
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filteredRecords.length === 0 || invalidDateRange}
                className="ml-auto flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Download size={16} /> Export as CSV
              </button>
            </div>
          </div>

          {/* Attendance Records */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Attendance records</h2>
            {records.length === 0 ? (
              <p className="text-sm text-slate-500">No attendance records available.</p>
            ) : invalidDateRange ? (
              <p className="text-sm text-slate-500">Update the date range to view attendance records.</p>
            ) : filteredRecords.length === 0 ? (
              <p className="text-sm text-slate-500">No attendance records match the selected filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-slate-700">Cadet</th>
                      <th className="px-4 py-2 font-semibold text-slate-700">Date</th>
                      <th className="px-4 py-2 font-semibold text-slate-700">Time In</th>
                      <th className="px-4 py-2 font-semibold text-slate-700">Time Out</th>
                      <th className="px-4 py-2 font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
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
                        <td className="px-4 py-2 text-slate-600">{formatTime(record.timeIn)}</td>
                        <td className="px-4 py-2 text-slate-600">{formatTime(record.timeOut)}</td>
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
