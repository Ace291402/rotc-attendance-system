import { useState } from 'react';
import { Download } from 'lucide-react';

export default function Reports() {
  const [gen, setGen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Attendance reports</h1>
        <p className="mt-1 text-sm text-slate-500">Generate clear reports for review and sharing.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Weekly summary', value: '96%', detail: 'Attendance reliability' },
          { label: 'Pending review', value: '4', detail: 'Late arrivals' },
          { label: 'Export ready', value: '2', detail: 'Reports prepared' }
        ].map((item) => (
          <div key={item.label} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
            <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Report range</label>
          <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
            <option>Current training cycle</option>
            <option>Full semester archive</option>
          </select>
        </div>
        <button type="button" onClick={() => setGen(true)} className="rounded-xl bg-[#0F3D2E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b2f24]">
          Generate report
        </button>

        {gen && (
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-semibold text-slate-900">Report is ready</h4>
              <p className="text-sm text-slate-600">The latest attendance summary has been prepared for export.</p>
            </div>
            <button type="button" onClick={() => alert('Downloading sheet package...')} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
              <Download size={14} /> Export Excel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}