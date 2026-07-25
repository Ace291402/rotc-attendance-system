import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { fetchCadets } from '../cadetService';
import type { ApiCadet } from '../types';

export default function Cadets() {
  const [cadets, setCadets] = useState<ApiCadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadData = async () => {
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
    };

    loadData();
  }, []);

  const filteredCadets = useMemo(() => {
    if (!search.trim()) {
      return cadets;
    }

    const lower = search.toLowerCase();
    return cadets.filter((cadet) => {
      return (
        cadet.fullName?.toLowerCase().includes(lower) ||
        cadet.studentNumber?.toLowerCase().includes(lower) ||
        cadet.course?.toLowerCase().includes(lower)
      );
    });
  }, [cadets, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Cadet roster</h1>
        <p className="mt-1 text-sm text-slate-500">View all enrolled cadets.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={14} /> <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search by name, student number, or course…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Cadet List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="animate-spin text-slate-400" size={24} />
        </div>
      ) : filteredCadets.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          {cadets.length === 0 ? 'No cadets enrolled yet.' : 'No results match your search.'}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Full Name</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Student Number</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Course</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Year Level</th>
              </tr>
            </thead>
            <tbody>
              {filteredCadets.map((cadet) => (
                <tr key={cadet.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{cadet.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{cadet.studentNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{cadet.course}</td>
                  <td className="px-4 py-3 text-slate-600">{cadet.yearLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
