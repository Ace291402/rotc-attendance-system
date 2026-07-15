import { Plus, Edit2 } from 'lucide-react';
import type { Role, Cadet } from '../types';

interface CadetsProps {
  role: Role;
  cadets: Cadet[];
}

export default function Cadets({ role, cadets }: CadetsProps) {
  const showCadets = cadets.length > 0;

  const handleAction = () => {
    if (role !== 'admin') {
      alert('Security Clearance Alert: Operations restricted to Administrative parameters only.');
      return;
    }
    alert('Cadet configuration dialog modal interface generated successfully.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Cadet directory</h1>
          <p className="text-sm text-slate-500">Manage cadet profiles and attendance performance.</p>
        </div>
        <button type="button" onClick={handleAction} className="flex items-center justify-center gap-2 rounded-xl bg-[#0F3D2E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b2f24]">
          <Plus size={15} /> Add cadet
        </button>
      </div>

      {showCadets ? (
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="p-4">Name</th>
                <th className="p-4">Serial</th>
                <th className="p-4">Platoon</th>
                <th className="p-4">Company</th>
                <th className="p-4 text-center">Attendance</th>
                <th className="p-4 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cadets.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="p-4 font-medium text-slate-900">{c.name}</td>
                  <td className="p-4 font-mono text-slate-600">{c.serialNumber}</td>
                  <td className="p-4 text-slate-500">{c.platoon}</td>
                  <td className="p-4 font-medium text-slate-700">{c.company}</td>
                  <td className="p-4 text-center">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{c.attendanceRate}%</span>
                  </td>
                  <td className="p-4 text-right">
                    <button type="button" onClick={handleAction} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                      <Edit2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No cadet records are loaded yet. Please log in with the backend to populate the roster.
        </div>
      )}
    </div>
  );
}