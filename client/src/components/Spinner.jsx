export default function Spinner({ fullPage = false, label = 'Loading…' }) {
  const spinner = (
    <div role="status" className="flex items-center justify-center gap-3 py-10 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
  if (!fullPage) return spinner;
  return <div className="flex min-h-[60vh] items-center justify-center">{spinner}</div>;
}
