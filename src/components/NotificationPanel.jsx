import { useState } from "react";

export default function NotificationPanel({ notifications = [], onTaskClick }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-2xl bg-emerald-500/10 px-4 py-3 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition"
      >
        <span>📬 Notifications ({notifications.length})</span>
        <span className="text-xs">{isOpen ? "▼" : "▶"}</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {notifications.map((task) => (
            <div
              key={task.id}
              onClick={() => {
                onTaskClick(task.pageId, task);
                setIsOpen(false);
              }}
              className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 cursor-pointer transition text-sm"
            >
              <div className="font-medium text-white truncate">{task.title}</div>
              <div className="text-xs text-zinc-400 mt-1">{task.pageName}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
