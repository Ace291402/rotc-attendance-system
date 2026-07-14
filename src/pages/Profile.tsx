import { Camera, Mail, Phone, ShieldCheck } from 'lucide-react';

export default function Profile() {
  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0F3D2E] text-xl font-semibold text-white">
              MA
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Maj. Michael Angelo</h1>
              <p className="text-sm text-slate-500">Operations Officer · Command Unit</p>
            </div>
          </div>
          <button type="button" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            <Camera size={16} /> Update Photo
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Account details</h2>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Full Name</p>
                <p className="text-sm text-slate-500">Maj. Michael Angelo</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Verified</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Mail size={16} className="text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-700">Email</p>
                <p className="text-sm text-slate-500">mangelo@rotc.edu</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Phone size={16} className="text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-700">Phone</p>
                <p className="text-sm text-slate-500">+1 555 0148</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Security</h2>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">Two-factor authentication enabled</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">Password last updated 3 days ago</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">Access level: Full administrator</div>
          </div>
        </div>
      </div>
    </div>
  );
}
