import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, Plus, QrCode, Trash2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../AuthContext';
import { createAttendance, deleteAttendance, fetchAttendance, scanAttendance, searchAttendance } from '../attendanceService';
import { fetchCadets } from '../cadetService';
import type { ApiCadet, Attendance } from '../types';

interface AttendanceFormState {
  cadetId: string;
  officerName: string;
}

const initialForm = (officerName = ''): AttendanceFormState => ({
  cadetId: '',
  officerName,
});

export default function Attendance() {
  const { session } = useAuth();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [cadets, setCadets] = useState<ApiCadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [form, setForm] = useState<AttendanceFormState>(initialForm(session?.name ?? ''));
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  const stopScanner = useCallback(async () => {
    if (!scanner) {
      return;
    }

    try {
      await scanner.stop();
    } catch {
      // ignore stop errors
    }

    try {
      await scanner.clear();
    } catch {
      // ignore clear errors
    }

    setScanner(null);
  }, [scanner]);

  const refreshAfterMutation = () => {
    window.dispatchEvent(new Event('rotc-data-changed'));
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [attendanceData, cadetData] = await Promise.all([fetchAttendance(), fetchCadets()]);
      setRecords(attendanceData ?? []);
      setCadets(cadetData ?? []);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load attendance records.');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchRecords = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        await loadData();
        return;
      }

      setLoading(true);
      setError('');

      try {
        const trimmed = query.trim();
        const params: { cadetId?: number; date?: string; status?: string } = {};
        if (/^\d+$/.test(trimmed)) {
          params.cadetId = Number(trimmed);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          params.date = trimmed;
        } else {
          params.status = trimmed;
        }

        const results = await searchAttendance(params);
        setRecords(results ?? []);
      } catch (searchError) {
        console.error(searchError);
        setError(searchError instanceof Error ? searchError.message : 'Unable to search attendance.');
      } finally {
        setLoading(false);
      }
    },
    [loadData]
  );

  useEffect(() => {
    void loadData();

    const handleRefresh = () => {
      void loadData();
    };

    window.addEventListener('rotc-data-changed', handleRefresh);
    return () => window.removeEventListener('rotc-data-changed', handleRefresh);
  }, [loadData]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void searchRecords(search);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, searchRecords]);

  useEffect(() => {
    if (!scanOpen) {
      void stopScanner();
      return;
    }

    setCameraError('');
    setError('');
    setMessage('');

    const initScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setCameraError('No camera found.');
          return;
        }

        const html5QrCode = new Html5Qrcode('attendance-qr-scanner');
        setScanner(html5QrCode);
        const cameraId = cameras[0].id;

        await html5QrCode.start(
          { deviceId: { exact: cameraId } },
          { fps: 10, qrbox: 250 },
          async (decodedText) => {
            if (saving) {
              return;
            }
            await processScannedQr(decodedText);
          },
          () => {
            // scanning progress callback intentionally ignored
          }
        );
      } catch (scanError) {
        console.error(scanError);
        setCameraError(scanError instanceof Error ? scanError.message : 'Unable to start the camera.');
      }
    };

    void initScanner();

    return () => {
      void stopScanner();
    };
  }, [scanOpen, saving, stopScanner]);

  const resetForm = () => {
    setForm(initialForm(session?.name ?? ''));
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
      const result = await createAttendance(parseInt(form.cadetId, 10), form.officerName);
      setMessage(`Attendance recorded for ${result.cadetName ?? 'cadet'}.`);
      resetForm();
      setFormOpen(false);
      refreshAfterMutation();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : 'Unable to save attendance.');
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
      refreshAfterMutation();
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete attendance.');
    }
  };

  const processScannedQr = async (decodedText: string) => {
    if (!decodedText?.trim()) {
      setError('Scanned QR code is empty.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    setScanCode(decodedText);

    await stopScanner();

    try {
      const result = await scanAttendance(decodedText, session?.name);
      setMessage(`Attendance recorded for ${result.cadetName ?? 'cadet'}.`);
      setScanOpen(false);
      refreshAfterMutation();
    } catch (scanError) {
      console.error(scanError);
      setError(scanError instanceof Error ? scanError.message : 'QR scan failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleScanQr = async () => {
    if (!scanCode.trim()) {
      setError('Please enter a QR code value.');
      return;
    }

    await processScannedQr(scanCode);
  };

  const filteredRecords = useMemo(() => {
    if (!search.trim()) {
      return records;
    }

    const lower = search.toLowerCase();
    return records.filter((record) => {
      const cadetName = record.cadet?.fullName ?? String(record.cadetId);
      return (
        cadetName.toLowerCase().includes(lower) ||
        String(record.cadetId).includes(lower) ||
        record.date.includes(lower) ||
        (record.status?.toLowerCase().includes(lower) ?? false)
      );
    });
  }, [records, search]);

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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search by cadet name, ID, status, or date…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
        />
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
                  <td className="px-4 py-3 text-slate-600">{record.date}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${record.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {record.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                <label className="block text-sm font-medium text-slate-700 mb-1">Officer name</label>
                <input
                  type="text"
                  name="officerName"
                  value={form.officerName}
                  onChange={handleFormChange}
                  placeholder="Your name"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
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
                  void stopScanner();
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
                    placeholder="ROTC-CADET-15-AB82F93D"
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
                      void stopScanner();
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
