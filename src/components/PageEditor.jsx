export default function PageEditor({
  currentPage,
  canEdit,
  onUpdatePage,
  onAddTask,
  children,
}) {
  if (!currentPage) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center text-zinc-400">
        <p className="text-xl font-semibold">Please select a page or create a new one.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <input
        value={currentPage.title}
        onChange={(event) => onUpdatePage("title", event.target.value)}
        disabled={!canEdit}
        className="text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none w-full mb-6 disabled:opacity-70 disabled:cursor-not-allowed"
      />

      <textarea
        value={currentPage.content}
        onChange={(event) => onUpdatePage("content", event.target.value)}
        disabled={!canEdit}
        className="w-full min-h-[220px] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none resize-none mb-6 disabled:opacity-70 disabled:cursor-not-allowed"
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between sm:items-center mb-4">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <button
          onClick={onAddTask}
          disabled={!canEdit}
          className="bg-white text-black px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          Add Task
        </button>
      </div>

      {children}
    </div>
  );
}
