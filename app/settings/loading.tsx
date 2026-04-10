export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse" role="status" aria-label="Loading settings">
      <div className="h-8 w-32 rounded bg-white/8" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03]">
          <div className="space-y-2 flex-1">
            <div className="h-3 w-1/3 rounded bg-white/8" />
            <div className="h-2 w-2/3 rounded bg-white/5" />
          </div>
          <div className="h-6 w-12 rounded-full bg-white/8 shrink-0" />
        </div>
      ))}
      <span className="sr-only">Loading settings</span>
    </div>
  );
}
