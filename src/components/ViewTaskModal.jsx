import React, { useState } from "react";

export default function ViewTaskModal({ selectedTask, onClose, onEdit, canEdit }) {
  if (!selectedTask) return null;

  const [copied, setCopied] = useState(false);

  const titleToClipboard = async (title) => {
    try {
      await navigator.clipboard.writeText(title);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const renderWithLinks = (text) => {
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.split(urlRegex).map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50" onClick={onClose}>
      <div
        className="bg-zinc-900 w-full max-w-[95vw] h-[95vh] overflow-y-auto rounded-2xl p-4 sm:p-6 lg:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold break-words flex-1">
            {selectedTask.title}
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => titleToClipboard(selectedTask.title)}
              className="rounded-full border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition"
            >
              {copied ? "Copied!" : "Copy"}
            </button>

            <button
              onClick={onClose}
              className="rounded-full border border-zinc-700 w-10 h-10 text-zinc-300 hover:bg-zinc-800 transition text-xl"
              aria-label="Close modal"
            >
              ❌
            </button>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300">
            Category: {selectedTask.category || "Uncategorize"}
          </span>
          {selectedTask.assignedTo && (
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300">
              Assigned
            </span>
          )}
        </div>

        <div className="mb-4">
          <h3 className="mb-2 text-xl sm:text-2xl uppercase tracking-widest text-zinc-500">
            Notes
          </h3>

          <div className="space-y-4 rounded-xl border border-zinc-800 p-4 text-zinc-200">
            {selectedTask.note_inspo ||
            selectedTask.note_setting ||
            selectedTask.note_cp ? (
              <>
                <div>
                  <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                    Inspiration
                  </h4>
                  <p className="whitespace-pre-wrap break-words">
                    {renderWithLinks(selectedTask.note_inspo) || "—"}
                  </p>
                </div>

                <div>
                  <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                    Settings
                  </h4>
                  <p className="whitespace-pre-wrap break-words">
                    {renderWithLinks(selectedTask.note_setting) || "—"}
                  </p>
                </div>

                <div>
                  <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                    Crucial Points / Notes
                  </h4>
                  <p className="whitespace-pre-wrap break-words">
                    {renderWithLinks(selectedTask.note_cp) || "—"}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <p className="whitespace-pre-wrap break-words">
                  {renderWithLinks(selectedTask.note) || "No notes available"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-2">
          <h3 className="text-xl sm:text-2xl uppercase tracking-widest text-zinc-500 mb-2">Details:</h3>
          <div className="text-zinc-200 whitespace-pre-wrap leading-relaxed border border-zinc-800 rounded-xl p-3 break-words">
            {renderWithLinks(selectedTask.description)}
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6">
          <button
            onClick={() => onEdit(selectedTask)}
            className="bg-white text-black px-4 sm:px-5 py-3 rounded-xl shadow-lg active:scale-95 transition"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
