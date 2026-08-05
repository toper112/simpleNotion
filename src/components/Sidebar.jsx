import { Link } from "react-router-dom";
import NotificationPanel from "./NotificationPanel";


export default function Sidebar({
  collapsed,
  onToggleCollapse,
  pagesSorted,
  selectedPage,
  newPageTitle,
  canEdit,
  isAdmin,
  profile,
  onSelectPage,
  onCreatePage,
  onNewPageKeyDown,
  onRequestDeletePage,
  onChangeNewPageTitle,
  onLogout,
  formatPageDate,
  notifications = [],
  onNotificationTaskClick,
  pagesWithUnviewedNotifications = new Set(),
  onMarkPageNotificationsAsViewed,
}) {
  const handleSelectPage = (pageId) => {
    onSelectPage(pageId);
    onMarkPageNotificationsAsViewed(pageId);
  };

  return (
    <aside
      className={`
        fixed md:relative
        top-0 left-0 z-40
        h-screen
        w-80
        bg-zinc-900
        border-r border-zinc-800
        flex flex-col
        p-4
        transition-transform duration-300

        ${
          collapsed
            ? "-translate-x-full"
            : "translate-x-0"
        }
      `}
    >
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Simple Notion</h1>
          {profile && (
            <div className="text-xs text-zinc-400 mt-1">
              {profile.name || profile.email} · {profile.role}
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="mb-4 self-end rounded-lg p-2 hover:bg-zinc-800"
        >
          {collapsed ? "☰" : "←"}
        </button>
        
      </div>
      
      {isAdmin && (
        <div className="flex gap-2 mb-4">
        <input
          value={newPageTitle}
          onChange={(e) => onChangeNewPageTitle(e.target.value)}
          onKeyDown={onNewPageKeyDown}
          placeholder="New page"
          disabled={!canEdit}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <button
          onClick={onCreatePage}
          disabled={!canEdit}
          className="bg-white text-black px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
      )}

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
            <div className="flex items-center justify-between" onClick={() => handleSelectPage(page.id)}>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <span className="truncate font-medium block">{page.title}</span>
                  <span className="text-xs text-zinc-400 block mt-1">
                    {formatPageDate(page.updatedAt || page.createdAt)}
                  </span>
                </div>
                {pagesWithUnviewedNotifications.has(page.id) && (
                  <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                )}
              </div>

              {canEdit && isAdmin && (
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

      <div className="mt-4 border-t border-zinc-800 pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className={`text-xs uppercase tracking-widest ${canEdit ? "text-green-400" : "text-amber-300"}`}>
            {canEdit ? "Admin Mode" : "Read Only"}
          </span>
        </div>

        {isAdmin && <NotificationPanel notifications={notifications} onTaskClick={onNotificationTaskClick} />}

        {isAdmin && (
          <Link
            to="/admin"
            className="inline-flex w-full justify-center rounded-2xl bg-white px-4 py-3 text-center text-black text-sm font-semibold hover:opacity-90"
          >
            Admin Dashboard
          </Link>
        )}
        {profile && (
                <button onClick={onLogout} className="text-sm rounded-xl bg-zinc-800 px-3 py-2 hover:bg-zinc-700">
                  Logout
                </button>
              )}
      </div>
    </aside>
  );
}
