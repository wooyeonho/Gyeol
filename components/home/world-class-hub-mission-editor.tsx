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
          className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-0 placeholder:text-white/35 focus:bg-white/10"
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg bg-white/10 px-3 text-sm text-white/85 hover:bg-white/20"
        >
          {addLabel}
        </button>
      </div>
      <ul className="mt-2 space-y-1.5">
        {missions.length === 0 && (
          <li className="text-xs text-white/45">{emptyState}</li>
        )}
        {missions.map((mission) => (
          <li key={mission.id} className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => onToggle(mission.id)}
              className={`h-4 w-4 rounded border ${mission.done ? "bg-cyan-300 border-cyan-200" : "border-white/40"}`}
              aria-label={toggleAriaLabel}
            />
            <span className={`flex-1 ${mission.done ? "line-through text-white/45" : "text-white/85"}`}>{mission.title}</span>
            <button
              type="button"
              onClick={() => onRemove(mission.id)}
              className="text-xs text-white/40 hover:text-white/70"
            >
              {removeLabel}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
