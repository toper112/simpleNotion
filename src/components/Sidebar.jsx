export default function Sidebar({
  pagesSorted,
  selectedPage,
  newPageTitle,
  isCodeAuthenticated,
  onSelectPage,
  onCreatePage,
  onNewPageKeyDown,
  onRequestDeletePage,
  onShowCodeModal,
  onLock,
  onChangeNewPageTitle,
  formatPageDate,
}) {
  return (
    <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-900 p-4 flex flex-col max-h-[40vh] md:max-h-full">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Simple Notion</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={newPageTitle}
          onChange={(e) => onChangeNewPageTitle(e.target.value)}
          onKeyDown={onNewPageKeyDown}
          placeholder="New page"
          disabled={!isCodeAuthenticated}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <button
          onClick={onCreatePage}
          disabled={!isCodeAuthenticated}
          className="bg-white text-black px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      <div className="space-y-2 overflow-y-auto flex-1 pb-2">
        {pagesSorted.map((page) => (
          <div
            key={page.id}
            className={`p-3 rounded-2xl border transition ${
              selectedPage === page.id
                ? "bg-white text-black border-white"
                : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between" onClick={() => onSelectPage(page.id)}>
              <div className="flex-1 min-w-0">
                <span className="truncate font-medium block">{page.title}</span>
                <span className="text-xs text-zinc-400 block mt-1">
                  {formatPageDate(page.updatedAt || page.createdAt)}
                </span>
              </div>

              {isCodeAuthenticated && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onRequestDeletePage(page.id);
                  }}
                  className="ml-3 text-red-400 px-3 py-2 rounded-md hover:bg-red-500/10"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-zinc-800 pt-3">
        {!isCodeAuthenticated ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 uppercase tracking-widest">Preview Mode</span>
            <button
              onClick={onShowCodeModal}
              className="bg-amber-500 text-black px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90"
            >
              Verify
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-400 uppercase tracking-widest">Edit Mode</span>
            <button
              onClick={onLock}
              className="bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs hover:bg-zinc-600"
            >
              Lock
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
