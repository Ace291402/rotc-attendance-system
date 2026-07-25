import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, Plus, QrCode, Trash2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createAttendance, deleteAttendance, fetchAttendance, scanAttendance } from '../attendanceService';
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
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [form, setForm] = useState<AttendanceFormState>(initialForm(session?.name ?? ''));

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [attendanceData, cadetData] = await Promise.all([fetchAttendance(), fetchCadets()]);
      setRecords(attendanceData);
      setCadets(cadetData);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleRefresh = () => {
      loadData();
    };

    window.addEventListener('rotc-data-changed', handleRefresh);
    return () => window.removeEventListener('rotc-data-changed', handleRefresh);
  }, []);

  const refreshAfterMutation = () => {
    window.dispatchEvent(new Event('rotc-data-changed'));
  };

  const filteredRecords = useMemo(() => {
    if (!search.trim()) {
      return records;
    }

    const lower = search.toLowerCase();
    return records.filter((record) => {
      const cadetName = record.cadet?.fullName ?? String(record.cadetId);
      return (
        cadetName.toLowerCase().includes(lower)
        || String(record.cadetId).includes(lower)
        || record.date.includes(lower)
      );
    });
  }, [records, search]);

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
      const result = await createAttendance(parseInt(form.cadetId), form.officerName);
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

  const handleScanQr = async () => {
    if (!scanCode.trim()) {
      setError('Please enter a QR code value.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await scanAttendance(scanCode, session?.name);
      setMessage(`✓ Attendance recorded for ${result.cadetName ?? 'cadet'}.`);
      setScanCode('');
      setScanOpen(false);
      refreshAfterMutation();
    } catch (scanError) {
      console.error(scanError);
      setError(scanError instanceof Error ? scanError.message : 'QR scan failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!session?.role || !['admin', 'officer'].includes(session.role)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        Access denied. Only admin and officer roles can manage attendance.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Attendance management</h1>
          <p className="mt-1 text-sm text-slate-500">Record and manage cadet attendance.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setScanOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <QrCode size={16} /> Scan QR
          </button>
          <button
            onClick={openCreateForm}
            className="flex items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
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

      {/* Search */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search by cadet name, ID, or date…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Attendance List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="animate-spin text-slate-400" size={24} />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          {records.length === 0 ? 'No attendance records yet.' : 'No results match your search.'}
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
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      record.status === 'Present'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
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

      {/* Create Attendance Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg max-w-md w-full">
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
                      {cadet.fullName} ({cadet.studentNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Officer Name</label>
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

      {/* Scan QR Modal */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold text-slate-900">Scan QR code</h2>
            <div className="mt-4 space-y-4">
              <p className="text-sm text-slate-600">Enter or paste the QR code value:</p>
              <input
                type="text"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                placeholder="QR code value"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleScanQr()}
              />

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setScanOpen(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScanQr}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'Scanning…' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
