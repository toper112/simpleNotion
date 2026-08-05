import Linkify from "linkify-react";
export default function PageEditor({
  currentPage,
  canEdit,
  tabs = [],
  activeTab,
  onUpdatePage,
  onCreateTab,
  onSelectTab,
  onRenameTab,
  children,
}) {
  if (!currentPage) {
    return (
      <div className="w-full py-20 text-center text-zinc-400">
        <p className="text-xl font-semibold">Please select a page or create a new one.</p>
      </div>
    );
  }

  return (
  <div className="w-full max-w-[1800px] mx-auto flex flex-col gap-6">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6 shadow-2xl shadow-black/20">
        <input
          value={currentPage.title}
          onChange={(event) => onUpdatePage("title", event.target.value)}
          disabled={!canEdit}
          className="text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none w-full mb-4 disabled:opacity-70 disabled:cursor-not-allowed"
        />

        {canEdit ? (
          <textarea
            value={currentPage.content}
            onChange={(event) => onUpdatePage("content", event.target.value)}
            className="w-full min-h-[220px] bg-zinc-950 border border-zinc-800 rounded-2xl p-4 outline-none resize-none"
          />
        ) : (
          <Linkify
            options={{
              target: "_blank",
              rel: "noopener noreferrer",
              className: "text-blue-400 underline hover:text-blue-300",
            }}
          >
            <div className="w-full min-h-[220px] whitespace-pre-wrap break-words rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              {currentPage.content}
            </div>
          </Linkify>
        )}

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Task Lists</h2>
              {canEdit && (
                <button
                  onClick={onCreateTab}
                  className="rounded-full border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  + Tab
                </button>
              )}
            </div>

            {tabs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onSelectTab(tab.id)}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                      activeTab?.id === tab.id
                        ? "bg-white text-black"
                        : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    }`}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No tabs yet. {canEdit ? "Create one to organize the work." : "The admin will add tabs here."}</p>
            )}

            {activeTab && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-zinc-500">Active tab</span>
                {canEdit ? (
                  <input
                    value={activeTab.title}
                    onChange={(event) => onRenameTab(event.target.value)}
                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none"
                  />
                ) : (
                  <span className="text-sm font-medium text-zinc-200">{activeTab.title}</span>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 min-h-[320px]">
        {children}
      </div>
    </div>
  );
}
