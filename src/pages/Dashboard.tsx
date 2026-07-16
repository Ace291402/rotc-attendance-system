import { useEffect, useState } from 'react';
import { fetchAttendance, fetchCadets, fetchReport } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({ cadetCount: 0, presentToday: 0, pendingReview: 0, exportReady: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [cadets, attendance, report] = await Promise.all([fetchCadets(), fetchAttendance(), fetchReport()]);
        const today = new Date().toISOString().slice(0, 10);
        const presentToday = attendance.filter((item) => item.date === today).length;

        setStats({
          cadetCount: cadets.length,
          presentToday,
          pendingReview: report.pendingReview,
          exportReady: report.exportReady,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const cards = [
    { label: 'Cadets enrolled', value: loading ? '…' : String(stats.cadetCount), detail: 'Active roster', tone: 'text-slate-900' },
    { label: 'Present today', value: loading ? '…' : String(stats.presentToday), detail: 'Recorded from the API', tone: 'text-emerald-600' },
    { label: 'Pending review', value: loading ? '…' : String(stats.pendingReview), detail: 'Needs follow-up', tone: 'text-amber-600' },
    { label: 'Reports ready', value: loading ? '…' : String(stats.exportReady), detail: 'Ready for export', tone: 'text-slate-900' }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-gradient-to-r from-[#0F3D2E] to-emerald-800 p-6 text-white shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">Daily overview</p>
        <h1 className="mt-2 text-3xl font-semibold">Command dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">A modern, concise view of readiness, attendance, and recent unit activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {cards.map((card) => (
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
            {loading ? 'Loading attendance data…' : `${stats.presentToday} records marked today`}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">Review the latest API-backed attendance updates</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">Open cadet profile data from the backend roster</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">Export the latest generated report</div>
          </div>
        </div>
      </div>
    </div>
  );
}