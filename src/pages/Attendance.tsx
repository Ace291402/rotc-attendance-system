import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, Pencil, Plus, QrCode, Trash2 } from 'lucide-react';

import { useAuth } from '../AuthContext';
import { ApiError } from '../api';
import {
  createAttendance,
  deleteAttendance,
  fetchAttendance,
  fetchAttendanceHistory,
  fetchAttendancePercentage,
  fetchAttendanceReport,
  fetchAttendanceSummary,
  filterAttendance,
  scanAttendance,
  searchAttendance,
  updateAttendance,
} from '../attendanceService';
import { fetchCadets } from '../cadetService';
import type { ApiCadet, Attendance, AttendanceSummary } from '../types';
import { Html5Qrcode } from 'html5-qrcode';


interface AttendanceFormState {
  cadetId: string;
  date: string;
  timeIn: string;
  timeOut: string;
  status: string;
}

const initialForm = (): AttendanceFormState => ({
  cadetId: '',
  date: new Date().toISOString().slice(0, 16),
  timeIn: '',
  timeOut: '',
  status: 'Present',
});

export default function Attendance() {
  const { session } = useAuth();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [cadets, setCadets] = useState<ApiCadet[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [form, setForm] = useState<AttendanceFormState>(initialForm());
  const [editTarget, setEditTarget] = useState<Attendance | null>(null);
  const [historyCadetId, setHistoryCadetId] = useState('');
  const [cadetHistory, setCadetHistory] = useState<Attendance[]>([]);
  const [cadetPercentage, setCadetPercentage] = useState<number | null>(null);
  const [reportSummary, setReportSummary] = useState('');

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return { dateStr: '—', timeStr: '—' };
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()) || date.getFullYear() === 1) {
      return { dateStr: '—', timeStr: '—' };
    }
    return {
      dateStr: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(date),
      timeStr: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'Asia/Manila' }).format(date),
    };
  };

  const formatToInputDateTime = (iso?: string | null) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()) || date.getFullYear() === 1) {
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [records],
  );

  const sortedCadetHistory = useMemo(
    () => [...cadetHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [cadetHistory],
  );

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const scanHandledRef = useRef(false);
  const lastDecodedQrRef = useRef<string | null>(null);
  const isInitializingRef = useRef(false);

  const refreshAfterMutation = () => {
    window.dispatchEvent(new Event('rotc-data-changed'));
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [attendanceData, cadetData, summaryData] = await Promise.all([
        fetchAttendance(),
        fetchCadets(),
        fetchAttendanceSummary(),
      ]);
      setRecords(attendanceData ?? []);
      setCadets(cadetData ?? []);
      setSummary(summaryData);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load attendance records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cleanupScanner = async () => {
      const scanner = scannerRef.current;
      if (!scanner) return;

      try {
        if (typeof scanner.stop === 'function') {
          await scanner.stop();
        }
      } catch (stopErr) {
        console.warn('[Scanner] stop() error during cleanup (ignored):', stopErr);
      }

      try {
        if (typeof scanner.clear === 'function') {
          await scanner.clear();
        }
      } catch (clearErr) {
        console.warn('[Scanner] clear() error during cleanup (ignored):', clearErr);
      }

      scannerRef.current = null;
    };

    if (!scanOpen) {
      void cleanupScanner();
      return;
    }

    scanHandledRef.current = false;
    lastDecodedQrRef.current = null;
    setCameraError('');
    setError('');
    setMessage('');

    const initScanner = async () => {
      if (isInitializingRef.current) {
        console.log('[Scanner] init already running, skipping');
        return;
      }

      isInitializingRef.current = true;
      try {
        await cleanupScanner();

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          console.error('[Scanner] No cameras found');
          setCameraError('No camera found.');
          return;
        }

        console.log('[Scanner] Initializing with camera:', cameras[0].id);
        const html5QrCode = new Html5Qrcode('attendance-qr-scanner');
        scannerRef.current = html5QrCode;
        const cameraId = cameras[0].id;

        await html5QrCode.start(
          { deviceId: { exact: cameraId } },
          { fps: 10, qrbox: 250 },
          async (decodedText: string) => {
            const value = decodedText?.trim();
            if (!value) {
              console.warn('[Scanner] Empty scan frame, ignoring');
              return;
            }

            if (scanHandledRef.current) {
              console.log('[Scanner] Scan already handled for this scanner session. Ignoring duplicate.');
              return;
            }

            if (lastDecodedQrRef.current === value) {
              console.log('[Scanner] Duplicate QR blocked:', value);
              return;
            }

            scanHandledRef.current = true;
            lastDecodedQrRef.current = value;

            try {
              await processScannedQr(value);
            } catch (scanProcessError) {
              console.error('[Scanner] QR processing error:', scanProcessError);
              scanHandledRef.current = false;
            }
          },
          (errorMessage: string) => {
            console.warn('[Scanner] QR error:', errorMessage);
          }
        );

        console.log('[Scanner] Scanner started successfully');
      } catch (scanError) {
        console.error('[Scanner] Initialization error:', scanError);
        setCameraError(scanError instanceof Error ? scanError.message : 'Unable to start the camera.');
      } finally {
        isInitializingRef.current = false;
      }
    };

    void initScanner();

    return () => {
      void cleanupScanner();
    };
  }, [scanOpen]);

        const resetForm = () => {
          setForm(initialForm());
        };

        const openCreateForm = () => {
          resetForm();
          setFormOpen(true);
          setMessage('');
          setError('');
        };

        const closeCreateForm = () => {
          setFormOpen(false);
          resetForm();
        };

        const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
          const { name, value } = e.target;
          setForm((prev) => ({ ...prev, [name]: value }));
        };

        const handleSubmitCreate = async (e: React.FormEvent) => {
          e.preventDefault();

          if (!form.cadetId) {
            setError('Cadet is required.');
            return;
          }

          setSaving(true);
          setError('');
          setMessage('');

          try {
            await createAttendance(parseInt(form.cadetId, 10), {
              timeIn: form.timeIn || undefined,
              timeOut: form.timeOut || undefined,
              status: form.status,
            });
            const cadetName = cadets.find((cadet) => Number(cadet.id) === parseInt(form.cadetId, 10))?.fullName ?? 'cadet';
            setMessage(`Attendance recorded for ${cadetName}.`);
            resetForm();
            setFormOpen(false);
            await loadData();
            refreshAfterMutation();
          } catch (submitError) {
            console.error(submitError);
            setError(submitError instanceof Error ? submitError.message : 'Unable to save attendance.');
          } finally {
            setSaving(false);
          }
        };

  const openEdit = (record: Attendance) => {
    setEditTarget(record);
    setForm({
      cadetId: String(record.cadetId),
      date: record.date ? record.date.slice(0, 16) : new Date().toISOString().slice(0, 16),
      timeIn: formatToInputDateTime(record.timeIn ?? null),
      timeOut: formatToInputDateTime(record.timeOut ?? null),
      status: record.status ?? 'Present',
    });
    setEditOpen(true);
    setError('');
    setMessage('');
  };

  const handleSubmitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editTarget) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateAttendance(editTarget.id, {
        cadetId: parseInt(form.cadetId, 10),
        date: new Date(form.date).toISOString(),
        timeIn: form.timeIn || undefined,
        timeOut: form.timeOut || undefined,
        status: form.status,
      });
      setMessage('Attendance updated successfully.');
      setEditOpen(false);
      setEditTarget(null);
      await loadData();
      refreshAfterMutation();
    } catch (updateError) {
      console.error(updateError);
      setError(updateError instanceof Error ? updateError.message : 'Unable to update attendance.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this attendance record?')) {
      return;
    }

    setError('');
    setMessage('');

    try {
      await deleteAttendance(id);
      setMessage('Attendance record deleted.');
      await loadData();
      refreshAfterMutation();
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete attendance.');
    }
  };

  const processScannedQr = async (decodedText: string) => {
    if (!decodedText?.trim()) {
      console.error('[Scanner] Empty QR code');
      setError('Scanned QR code is empty.');
      return;
    }

    if (processingRef.current) {
      console.log('[Scanner] Scan already processing, ignoring duplicate');
      return;
    }

    processingRef.current = true;
    setSaving(true);
    setError('');
    setMessage('');
    const normalizedQrCode = decodedText.trim();
    setScanCode(normalizedQrCode);

    try {
      console.log('[Scanner] decoded QR:', normalizedQrCode);
      console.log('[Scanner] calling scanAttendance with:', { qrCodeId: normalizedQrCode });
      console.log('[Scanner] Stopping scanner before API call...');

      const scanner = scannerRef.current;
      if (scanner) {
        try {
          if (typeof scanner.stop === 'function') {
            await scanner.stop();
          }
        } catch (stopErr) {
          console.warn('[Scanner] stop error (ignored):', stopErr);
        }

        try {
          if (typeof scanner.clear === 'function') {
            await scanner.clear();
          }
        } catch (clearErr) {
          console.warn('[Scanner] clear error (ignored):', clearErr);
        }

        scannerRef.current = null;
      }

      const payload = { qrCodeId: normalizedQrCode };
      console.log('[Scanner] POST payload:', JSON.stringify(payload));

      const result = await scanAttendance(normalizedQrCode);
      console.log('[Scanner] API response status:', result ? 'success' : 'unknown');
      console.log('[Scanner] API response data:', result);

      // Show appropriate message based on backend response (backend controls TimeIn/TimeOut)
      const name = result?.cadet?.fullName ?? 'cadet';
      if (result?.timeOut == null) {
        setMessage(`Time In recorded successfully for ${name}.`);
      } else {
        setMessage(`Time Out recorded successfully for ${name}.`);
      }

      // Close scanner modal and refresh data
      setScanOpen(false);

      console.log('[Scanner] Refreshing attendance data...');
      await loadData();
      refreshAfterMutation();
    } catch (scanError) {
      console.error('[Scanner] Error:', scanError);
      if (scanError instanceof ApiError) {
        console.error('[Scanner] API error status:', scanError.status);
        if (scanError.status === 401) {
          setError('Unauthorized. Please login again.');
        } else if (scanError.status === 404) {
          setError('QR not found or attendance already recorded for today.');
        } else if (scanError.status === 400) {
          setError('Invalid QR code.');
        } else if (scanError.status === 409) {
          // Backend may provide a helpful message in 409
          setError(scanError.message || 'Conflict: attendance could not be processed.');
        } else if (scanError.status === 500) {
          setError('Server error while processing the QR. Please try again later.');
          console.error(scanError);
        } else {
          setError(scanError.message);
        }
      } else {
        setError(scanError instanceof Error ? scanError.message : 'QR scan failed. Please try again.');
      }
    } finally {
      setSaving(false);
      processingRef.current = false;
    }
  };

  const handleScanQr = async () => {
    if (!scanCode.trim()) {
      setError('Please enter a QR code value.');
      return;
    }

    await processScannedQr(scanCode);
  };

  const handleRunSearch = async () => {
    if (!search.trim()) {
      await loadData();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const trimmed = search.trim();
      const normalized = trimmed.toLowerCase();
      const params: { cadetId?: number; date?: string; status?: string } = {};
      if (/^\d+$/.test(trimmed)) {
        params.cadetId = Number(trimmed);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        params.date = trimmed;
      } else if (['present', 'absent', 'late'].includes(normalized)) {
        params.status = trimmed;
      }
      if (Object.keys(params).length > 0) {
        const results = await searchAttendance(params);
        setRecords(results);
      } else {
        const attendanceData = await fetchAttendance();
        const filtered = attendanceData.filter((record) => {
          const cadet = record.cadet;
          return [
            cadet?.fullName,
            cadet?.studentNumber,
            cadet?.course,
            cadet?.yearLevel,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalized));
        });
        setRecords(filtered);
      }
    } catch (searchError) {
      console.error(searchError);
      setError(searchError instanceof Error ? searchError.message : 'Unable to search attendance.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = async () => {
    if (!startDateFilter && !endDateFilter && !statusFilter) {
      await loadData();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await filterAttendance({
        startDate: startDateFilter ? new Date(startDateFilter).toISOString() : undefined,
        endDate: endDateFilter ? new Date(endDateFilter).toISOString() : undefined,
        status: statusFilter || undefined,
      });
      setRecords(data);
    } catch (filterError) {
      console.error(filterError);
      setError(filterError instanceof Error ? filterError.message : 'Unable to filter attendance.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadHistory = async () => {
    if (!historyCadetId) {
      setError('Select a cadet to view history.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const cadetId = parseInt(historyCadetId, 10);
      const [historyData, percentageData] = await Promise.all([
        fetchAttendanceHistory(cadetId),
        fetchAttendancePercentage(cadetId),
      ]);
      setCadetHistory(historyData);
      setCadetPercentage(percentageData.attendancePercentage ?? percentageData.percentage ?? 0);
    } catch (historyError) {
      console.error(historyError);
      setError(historyError instanceof Error ? historyError.message : 'Unable to load attendance history.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setError('');
    try {
      const report = await fetchAttendanceReport();
      setReportSummary(report.weeklySummary);
    } catch (reportError) {
      console.error(reportError);
      setError(reportError instanceof Error ? reportError.message : 'Unable to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = sortedRecords;

  if (!session?.role || !['admin', 'officer'].includes(session.role)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        Access denied. Only admin and officer roles can manage attendance.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Attendance management</h1>
          <p className="mt-1 text-sm text-slate-500">Record and manage cadet attendance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setScanOpen(true);
              setMessage('');
              setError('');
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <QrCode size={16} /> Scan QR
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus size={16} /> Record Attendance
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={14} /> <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={14} /> <span>{message}</span>
        </div>
      )}

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Cadet ID, date (YYYY-MM-DD), or status"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleRunSearch()}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Search
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter</label>
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleApplyFilter()}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Apply Filter
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Total Attendance</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.totalAttendance ?? records.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Present Today</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{summary?.presentToday ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Absent Today</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{summary?.absentToday ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Attendance Rate</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.attendancePercentage ?? 0}%</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Report</h2>
          <button
            type="button"
            onClick={() => void handleGenerateReport()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Generate Report
          </button>
        </div>
        {reportSummary && <p className="mt-3 text-sm text-slate-700">{reportSummary}</p>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="animate-spin text-slate-400" size={24} />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          {records.length === 0 ? 'No attendance records yet.' : 'No search results found.'}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Cadet</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Time In</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Time Out</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{record.cadet?.fullName ?? `Cadet ${record.cadetId}`}</p>
                    <p className="text-xs text-slate-500">{record.cadet?.course ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
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
                  <td className="px-4 py-3 text-slate-600">
                    {record.timeIn ? formatDateTime(record.timeIn).timeStr : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {record.timeOut ? formatDateTime(record.timeOut).timeStr : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${record.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {record.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openEdit(record)} className="text-emerald-600 hover:text-emerald-800">
                        <Pencil size={14} />
                      </button>
                      <button type="button" onClick={() => void handleDelete(record.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Attendance History & Percentage</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <select
            value={historyCadetId}
            onChange={(e) => setHistoryCadetId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Select cadet</option>
            {cadets.map((cadet) => (
              <option key={cadet.id} value={cadet.id}>
                {cadet.fullName ?? `Cadet ${cadet.id}`}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleLoadHistory()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            View History
          </button>
        </div>
        {cadetPercentage !== null && <p className="mt-3 text-sm text-slate-700">Attendance Percentage: {cadetPercentage}%</p>}
        {cadetHistory.length > 0 && (
          <div className="mt-3 max-h-44 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Date</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedCadetHistory.map((item) => {
                  const fmt = formatDateTime(item.date);
                  return (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">
                        <div>{fmt.dateStr}</div>
                        <div className="text-xs text-slate-500">{fmt.timeStr}</div>
                      </td>
                      <td className="px-3 py-2">{item.status ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Record attendance</h2>
            <form onSubmit={handleSubmitCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cadet</label>
                <select
                  name="cadetId"
                  value={form.cadetId}
                  onChange={handleFormChange}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">Select a cadet...</option>
                  {cadets.map((cadet) => (
                    <option key={cadet.id} value={cadet.id}>
                      {cadet.fullName ?? 'Unknown cadet'} ({cadet.studentNumber ?? 'No number'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date and time</label>
                <input
                  type="datetime-local"
                  name="date"
                  value={form.date}
                  onChange={handleFormChange}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time In</label>
                <input
                  type="datetime-local"
                  name="timeIn"
                  value={form.timeIn}
                  onChange={handleFormChange}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time Out</label>
                <input
                  type="datetime-local"
                  name="timeOut"
                  value={form.timeOut}
                  onChange={handleFormChange}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Update attendance</h2>
            <form onSubmit={handleSubmitEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cadet</label>
                <select
                  name="cadetId"
                  value={form.cadetId}
                  onChange={handleFormChange}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  required
                >
                  {cadets.map((cadet) => (
                    <option key={cadet.id} value={cadet.id}>
                      {cadet.fullName ?? `Cadet ${cadet.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date and time</label>
                <input
                  type="datetime-local"
                  name="date"
                  value={form.date}
                  onChange={handleFormChange}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time In</label>
                <input
                  type="datetime-local"
                  name="timeIn"
                  value={form.timeIn}
                  onChange={handleFormChange}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time Out</label>
                <input
                  type="datetime-local"
                  name="timeOut"
                  value={form.timeOut}
                  onChange={handleFormChange}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditOpen(false);
                    setEditTarget(null);
                  }}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Scan QR code</h2>
                <p className="text-sm text-slate-500">Use your camera to scan the cadet QR code or paste the value below.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setScanOpen(false);
                }}
                className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <div id="attendance-qr-scanner" className="h-72 w-full bg-black" />
                </div>
                {cameraError && <p className="mt-3 text-sm text-red-600">{cameraError}</p>}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">QR code value</label>
                  <input
                    type="text"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    placeholder="Paste cadet qrCodeId"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && void handleScanQr()}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleScanQr}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? 'Scanning…' : 'Submit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScanOpen(false);
                    }}
                    className="flex-1 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
