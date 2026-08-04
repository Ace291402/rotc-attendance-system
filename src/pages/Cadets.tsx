import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Eye, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createCadet, deleteCadet, fetchCadets, getCadetById, updateCadet } from '../cadetService';
import type { ApiCadet } from '../types';

interface CadetFormState {
  studentNumber: string;
  fullName: string;
  course: string;
  yearLevel: string;
}

const EMPTY_FORM: CadetFormState = {
  studentNumber: '',
  fullName: '',
  course: '',
  yearLevel: '',
};

function toPayload(form: CadetFormState) {
  return {
    studentNumber: form.studentNumber.trim(),
    fullName: form.fullName.trim(),
    course: form.course.trim(),
    yearLevel: form.yearLevel.trim(),
  };
}

export default function Cadets() {
  const { session } = useAuth();
  const [cadets, setCadets] = useState<ApiCadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingCadetId, setEditingCadetId] = useState<number | null>(null);
  const [selectedCadet, setSelectedCadet] = useState<ApiCadet | null>(null);
  const [form, setForm] = useState<CadetFormState>(EMPTY_FORM);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCadets();
      setCadets(data);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load cadets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const courses = useMemo(() => {
    return Array.from(new Set(cadets.map((cadet) => cadet.course).filter((item): item is string => Boolean(item))));
  }, [cadets]);

  const yearLevels = useMemo(() => {
    return Array.from(new Set(cadets.map((cadet) => cadet.yearLevel).filter((item): item is string => Boolean(item))));
  }, [cadets]);

  const filteredCadets = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return cadets.filter((cadet) => {
      const matchesSearch =
        !searchLower ||
        cadet.fullName?.toLowerCase().includes(searchLower) ||
        cadet.studentNumber?.toLowerCase().includes(searchLower) ||
        cadet.course?.toLowerCase().includes(searchLower) ||
        cadet.yearLevel?.toLowerCase().includes(searchLower);
      const matchesCourse = !courseFilter || cadet.course === courseFilter;
      const matchesYear = !yearFilter || cadet.yearLevel === yearFilter;
      return Boolean(matchesSearch && matchesCourse && matchesYear);
    });
  }, [cadets, courseFilter, search, yearFilter]);

  const openCreate = () => {
    setEditingCadetId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setError('');
    setMessage('');
  };

  const openEdit = (cadet: ApiCadet) => {
    setEditingCadetId(Number(cadet.id));
    setForm({
      studentNumber: cadet.studentNumber ?? '',
      fullName: cadet.fullName ?? '',
      course: cadet.course ?? '',
      yearLevel: cadet.yearLevel ?? '',
    });
    setFormOpen(true);
    setError('');
    setMessage('');
  };

  const handleView = async (id: number) => {
    setError('');
    setMessage('');
    try {
      const cadet = await getCadetById(id);
      setSelectedCadet(cadet);
      setViewOpen(true);
    } catch (viewError) {
      console.error(viewError);
      setError(viewError instanceof Error ? viewError.message : 'Unable to load cadet details.');
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.studentNumber.trim() || !form.fullName.trim() || !form.course.trim() || !form.yearLevel.trim()) {
      setError('All fields are required.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editingCadetId) {
        await updateCadet(editingCadetId, toPayload(form));
        setMessage('Cadet updated successfully.');
      } else {
        await createCadet(toPayload(form));
        setMessage('Cadet created successfully.');
      }
      setFormOpen(false);
      await loadData();
      window.dispatchEvent(new Event('rotc-data-changed'));
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : 'Unable to save cadet.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this cadet?')) {
      return;
    }

    setError('');
    setMessage('');
    try {
      await deleteCadet(id);
      setMessage('Cadet deleted successfully.');
      await loadData();
      window.dispatchEvent(new Event('rotc-data-changed'));
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete cadet.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cadet roster</h1>
          <p className="mt-1 text-sm text-slate-500">Manage enrolled cadets.</p>
        </div>
        {session?.role === 'admin' && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus size={16} /> Create
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={14} /> <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>
      )}

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          type="text"
          placeholder="Search by name, student number, or course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
        />
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All courses</option>
          {courses.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All year levels</option>
          {yearLevels.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="animate-spin text-slate-400" size={24} />
        </div>
      ) : filteredCadets.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          {cadets.length === 0 ? 'No cadets enrolled yet.' : 'No results match your filters.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Full Name</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Student Number</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Course</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Year Level</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCadets.map((cadet) => (
                <tr key={cadet.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{cadet.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{cadet.studentNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{cadet.course ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{cadet.yearLevel ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleView(Number(cadet.id))}
                        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Eye size={15} />
                      </button>
                      {session?.role === 'admin' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(cadet)}
                            className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(Number(cadet.id))}
                            className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-800"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">{editingCadetId ? 'Edit cadet' : 'Create cadet'}</h2>
            <form onSubmit={handleSave} className="mt-4 space-y-3">
              <input
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Full Name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                required
              />
              <input
                value={form.studentNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, studentNumber: e.target.value }))}
                placeholder="Student Number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                required
              />
              <input
                value={form.course}
                onChange={(e) => setForm((prev) => ({ ...prev, course: e.target.value }))}
                placeholder="Course"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                required
              />
              <input
                value={form.yearLevel}
                onChange={(e) => setForm((prev) => ({ ...prev, yearLevel: e.target.value }))}
                placeholder="Year Level"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                required
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCadetId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewOpen && selectedCadet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Cadet profile</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Full Name:</span> {selectedCadet.fullName ?? '—'}
              </p>
              <p>
                <span className="font-semibold">Student Number:</span> {selectedCadet.studentNumber ?? '—'}
              </p>
              <p>
                <span className="font-semibold">Course:</span> {selectedCadet.course ?? '—'}
              </p>
              <p>
                <span className="font-semibold">Year Level:</span> {selectedCadet.yearLevel ?? '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewOpen(false)}
              className="mt-5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
