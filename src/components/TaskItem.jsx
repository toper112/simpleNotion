export default function TaskItem({
  task,
  canEdit,
  onViewTask,
  onToggleDone,
  onStatusChange,
  onConfirmDelete,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <input
        type="checkbox"
        checked={Boolean(task.done)}
        onChange={(event) => onToggleDone(task.id, event.target.checked)}
        disabled={!canEdit}
        className="h-5 w-5 rounded border-zinc-700 bg-zinc-900 text-white disabled:opacity-80 disabled:cursor-not-allowed"
        style={{ accentColor: task.done ? "#34D399" : undefined }}
      />

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onViewTask(task)}>
        <div className="font-semibold break-words">{task.title}</div>
        <div className="text-xs text-zinc-400 break-words">
          {task.note?.length > 80 ? `${task.note.slice(0, 80)}...` : task.note}
        </div>
      </div>

      <select
        value={task.status || "NOT STARTED"}
        onChange={(event) => onStatusChange(task.id, event.target.value)}
        disabled={!canEdit}
        className={`ml-2 px-3 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-sm ${
          task.status === "EDITING"
            ? "text-blue-400"
            : task.status === "DONE"
            ? "text-green-400"
            : "text-zinc-300"
        }`}
      >
        <option value="EDITING">EDITING</option>
        <option value="NOT STARTED">NOT STARTED</option>
        <option value="DONE">DONE</option>
      </select>

      <button
        onClick={() => onConfirmDelete(task.id)}
        disabled={!canEdit}
        className="text-red-400 px-3 py-2 rounded-md hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
      >
        Delete
      </button>
    </div>
  );
}
