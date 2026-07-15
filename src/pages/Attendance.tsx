import { useEffect, useState } from 'react';
import { Search, Plus, Trash2, AlertCircle } from 'lucide-react';
import type { Role, AttendanceRecord } from '../types';
import { fetchAttendance, deleteAttendance } from '../api';

interface AttendanceProps {
  role: Role;
}

export default function Attendance({ role }: AttendanceProps) {
  const [search, setSearch] = useState('');
  const [warn, setWarn] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const attendance = await fetchAttendance();
        setRecords(attendance.map((item) => ({
          id: String(item.id),
          cadetId: String(item.cadetId),
          cadetName: item.cadet?.fullName ?? `Cadet ${item.cadetId}`,
          date: item.date,
          status: item.status ?? 'Unknown',
          company: item.cadet?.course ?? '',
        })));
      } catch (error) {
        console.error(error);
      }
    };

    load();
  }, []);

  const handleSimulateAdd = () => {
    if (warn) return;
    setWarn(true);
    setTimeout(() => setWarn(false), 4000);
  };

  const handleDelete = async (id: string) => {
    if (role !== 'admin') {
      alert('Security Exception: Only Administrators possess clearance to purge log metrics.');
      return;
    }

    if (!confirm('Purge selected attendance marker?')) {
      return;
    }

    try {
      await deleteAttendance(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error(error);
      alert('Could not delete attendance record.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Attendance management</h1>
          <p className="text-sm text-slate-500">Monitor daily presence and update records quickly.</p>
        </div>
        <button type="button" onClick={handleSimulateAdd} className="flex items-center justify-center gap-2 rounded-xl bg-[#0F3D2E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b2f24]">
          <Plus size={15} /> Quick log
        </button>
      </div>

      {warn && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertCircle size={14} /> <span>That entry was already finalized for the selected date.</span>
        </div>
      )}

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search className="text-slate-400" size={16} />
            <input type="text" placeholder="Search attendance records" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <select className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none">
              <option>All statuses</option>
              <option>Present</option>
              <option>Late</option>
              <option>Absent</option>
            </select>
            <button type="button" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">Filter</button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="p-4">Cadet</th>
                <th className="p-4">Date</th>
                <th className="p-4">Company</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map(rec => (
                <tr key={rec.id} className="hover:bg-slate-50/60">
                  <td className="p-4 font-medium text-slate-900">{rec.cadetName || rec.cadetId}</td>
                  <td className="p-4 text-slate-500">{rec.date}</td>
                  <td className="p-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{rec.company || '—'}</span></td>
                  <td className="p-4 text-center">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rec.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{rec.status}</span>
                  </td>
                  <td className="p-4 text-right">
                    <button type="button" onClick={() => handleDelete(String(rec.id))} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}