export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-gradient-to-r from-[#0F3D2E] to-emerald-800 p-6 text-white shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">Daily overview</p>
        <h1 className="mt-2 text-3xl font-semibold">Command dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">A modern, concise view of readiness, attendance, and recent unit activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: 'Cadets enrolled', value: '45', detail: 'Active roster', tone: 'text-slate-900' },
          { label: 'Present today', value: '42', detail: 'On track', tone: 'text-emerald-600' },
          { label: 'Late arrivals', value: '2', detail: 'Needs review', tone: 'text-amber-600' },
          { label: 'Readiness', value: '93.3%', detail: 'Healthy outlook', tone: 'text-slate-900' }
        ].map((card) => (
          <div key={card.label} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
            <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Attendance trend</h2>
              <p className="text-sm text-slate-500">Weekly overview of attendance performance.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">Stable</span>
          </div>
          <div className="flex h-44 items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
            Chart view placeholder
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">Review pending attendance updates</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">Open cadet profile records</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">Export the latest reports</div>
          </div>
        </div>
      </div>
    </div>
  );
}