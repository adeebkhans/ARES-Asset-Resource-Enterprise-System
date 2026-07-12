import type { PropsWithChildren } from 'react';

const FEATURES = [
  { icon: 'puzzle-piece', text: 'Model any entity your business needs — not just Assets' },
  { icon: 'arrows-clockwise', text: 'Full lifecycle tracking, from registration to disposal' },
  { icon: 'check-circle', text: 'Approval workflows that escalate themselves' },
];

/** Shared chrome for the three unauthenticated auth screens — a brand panel plus the form. */
export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-svh">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-ink-900 px-10 py-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 font-display text-base font-bold">A</span>
          <span className="font-display text-xl font-semibold">ARES</span>
        </div>

        <div className="relative">
          <h2 className="font-display text-3xl font-semibold leading-tight text-balance">
            One platform for every asset your organization owns.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-brand-100/80">
            Offices, schools, hospitals, factories — the same engine, configured to how you actually work.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-3 text-sm text-brand-50/90">
                <i className={`ph-bold ph-${f.icon}`} />
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200/60">Enterprise Asset &amp; Resource Management</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
