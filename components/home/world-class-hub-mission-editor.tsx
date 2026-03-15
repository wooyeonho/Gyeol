"use client";

type Mission = {
  id: string;
  title: string;
  done: boolean;
};

export function WorldClassHubMissionEditor({
  addLabel,
  draftMission,
  emptyState,
  inputAriaLabel,
  missions,
  onAdd,
  onChangeDraft,
  onRemove,
  onToggle,
  placeholder,
  removeLabel,
  toggleAriaLabel,
}: {
  addLabel: string;
  draftMission: string;
  emptyState: string;
  inputAriaLabel: string;
  missions: Mission[];
  onAdd: () => void;
  onChangeDraft: (value: string) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  placeholder: string;
  removeLabel: string;
  toggleAriaLabel: string;
}) {
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/35 p-3">
      <div className="flex gap-2">
        <label htmlFor="mission-input" className="sr-only">
          {inputAriaLabel}
        </label>
        <input
          id="mission-input"
          value={draftMission}
          onChange={(event) => onChangeDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          className="min-h-12 flex-1 rounded-xl bg-white/5 px-4 py-3 text-base outline-none ring-0 placeholder:text-white/60 focus:bg-white/10"
        />
        <button
          type="button"
          onClick={onAdd}
          className="min-h-12 rounded-xl bg-white/10 px-4 text-base text-white/88 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {addLabel}
        </button>
      </div>
      <ul className="mt-2 space-y-1.5">
        {missions.length === 0 && (
          <li className="text-sm text-white/70">{emptyState}</li>
        )}
        {missions.map((mission) => (
          <li key={mission.id} className="flex items-center gap-2 text-base">
            <button
              type="button"
              onClick={() => onToggle(mission.id)}
              className={`h-6 w-6 rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${mission.done ? "bg-cyan-300 border-cyan-200" : "border-white/60 bg-transparent"}`}
              aria-label={toggleAriaLabel}
            />
            <span className={`flex-1 ${mission.done ? "line-through text-white/45" : "text-white/85"}`}>{mission.title}</span>
            <button
              type="button"
              onClick={() => onRemove(mission.id)}
              className="min-h-10 rounded-xl px-3 text-sm text-white/75 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {removeLabel}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
