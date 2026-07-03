export default function TaskList({
  tasks,
  canEdit,
  profile,
  users = [],
  selectedPageId,
  viewedNotifications = new Set(),
  onViewTask,
  onToggleDone,
  onStatusChange,
  onUploadStatusChange,
  onConfirmDelete,
  onAssignTask,
}) {
  const getUserName = (userId) => {
    if (!userId) return "Unassigned";
    const user = users.find((u) => u.uid === userId);
    return user ? user.name || user.email : "Unknown";
  };

  const canUserEditTask = (task) => {
    if (canEdit) return true;
    return task.assignedTo === profile?.uid;
  };

  const hasUnviewedNotification = (task) => {
    if (profile?.role === "admin") {
      return task.uploadStatus === "Uploaded" && !task.uploadedViewedByAdmin;
    }

    return task.assignedTo === profile?.uid && !task.viewedByAssignedUser;
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-zinc-400 py-8 text-center rounded-2xl bg-zinc-950 border border-zinc-800">
        No tasks yet. Add one to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const isUploaded = task.uploadStatus === "Uploaded";
        const userCanEdit = canUserEditTask(task);
        const isAssignedViewed = canEdit && task.assignedTo && task.viewedByAssignedUser;
        const taskBorderClass = isUploaded
          ? "border-emerald-500"
          : isAssignedViewed
          ? "border-sky-400"
          : "border-zinc-800";

        return (
          <div
            key={task.id}
            className={`flex flex-col sm:flex-row sm:items-center gap-3 bg-zinc-900 rounded-2xl p-4 border ${taskBorderClass}`}
          >
            {canEdit && (
              <input
                type="checkbox"
                checked={Boolean(task.done)}
                onChange={(event) => onToggleDone(task.id, event.target.checked)}
                className="h-5 w-5 rounded border-zinc-700 bg-zinc-900 text-white disabled:opacity-80 disabled:cursor-not-allowed"
                style={{ accentColor: task.done ? "#34D399" : undefined }}
              />
            )}

            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => onViewTask(task)}
            >
              <div className="flex items-center gap-2">
                <div className="font-semibold break-words">{task.title}</div>
                {hasUnviewedNotification(task) && (
                  <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                )}
              </div>
              <div className="text-xs text-zinc-400 break-words">
                {task.note?.length > 80 ? `${task.note.slice(0, 80)}...` : task.note}
              </div>
            </div>

            {canEdit && (
              <select
                value={task.assignedTo || ""}
                onChange={(event) => onAssignTask(task.id, event.target.value)}
                className="px-3 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-sm"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            )}

            {!canEdit && (
              <div className="text-xs text-zinc-500">Assigned: {getUserName(task.assignedTo)}</div>
            )}

            <select
              value={task.status || "NOT STARTED"}
              onChange={(event) => onStatusChange(task.id, event.target.value)}
              disabled={!userCanEdit}
              className={`ml-2 px-3 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-sm disabled:opacity-80 disabled:cursor-not-allowed ${
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

            <select
              value={task.uploadStatus || "Not Uploaded"}
              onChange={(event) => onUploadStatusChange(task.id, event.target.value)}
              disabled={!userCanEdit || task.status !== "DONE"}
              className={`ml-2 px-3 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-sm disabled:opacity-80 disabled:cursor-not-allowed ${
                task.uploadStatus === "Uploaded" ? "text-emerald-400" : "text-zinc-300"
              }`}
            >
              <option value="Not Uploaded">Not Uploaded</option>
              <option value="Uploaded">Uploaded</option>
            </select>

            {canEdit && (
              <button
                onClick={() => onConfirmDelete(task.id)}
                className="text-red-400 px-3 py-2 rounded-md hover:bg-red-500/10 w-full sm:w-auto"
              >
                Delete
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
