import { useEffect, useMemo, useState } from "react";

export default function SimpleNotionApp() {
  const STORAGE_KEY = "simple-notion-pages";

  const createId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  const createDefaultPage = () => ({
    id: createId(),
    title: "My First Page",
    content: "# Welcome\n\nStart writing your tasks here...",
    tasks: [
      {
        id: createId(),
        title: "Create your first task",
        note: "",
        description: "",
        done: false,
        createdAt: Date.now()
      }
    ]
  });

  const emptyTaskForm = { id: null, title: "", note: "", description: "" };
  const AUTH_KEY = "simple-notion-user";
  const HASH_SALT = "simple-notion-salt-v1";
  const ADMIN_USER = {
    username: "chris-dev",
    passwordHash: "2c0ac173a225e5862f995773bbfc886e00dc4c6e114486e51c8ddf333cdefaa1",
    role: "admin"
  };

  const ALLOWED_USERS = [
    { username: "chris-dev", role: "admin" }
  ];

  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  const [user, setUser] = useState(null);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem(AUTH_KEY);
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser?.username) setUser(parsedUser);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!user) {
      localStorage.removeItem(AUTH_KEY);
      return;
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  }, [user]);

  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + HASH_SALT);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  };

  const handleLogin = async () => {
    const username = credentials.username.trim();
    const password = credentials.password;

    if (!username || !password) {
      setLoginError("Enter both username and password.");
      return;
    }

    const allowedUser = ALLOWED_USERS.find(u => u.username === username);
    if (!allowedUser) {
      setLoginError("User not found.");
      setCredentials({ username: "", password: "" });
      return;
    }

    if (username === ADMIN_USER.username) {
      const passwordHash = await hashPassword(password);
      if (passwordHash !== ADMIN_USER.passwordHash) {
        setLoginError("Invalid admin credentials.");
        return;
      }

      setUser({ username: ADMIN_USER.username, role: ADMIN_USER.role });
      setLoginError("");
      setCredentials({ username: ADMIN_USER.username, password: "" });
      return;
    }

    if (password.length < 4) {
      setLoginError("Password must be at least 4 characters.");
      return;
    }

    setUser({ username, role: allowedUser.role });
    setLoginError("");
    setCredentials({ username, password: "" });
  };

  const handleSignOut = () => {
    setUser(null);
    setCredentials({ username: "", password: "" });
    setLoginError("");
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    try {
      if (!saved) throw new Error();
      const parsed = JSON.parse(saved);

      const pagesData = Array.isArray(parsed) ? parsed : parsed?.pages;
      const selectedId = Array.isArray(parsed) ? null : parsed?.selectedPage || null;

      if (!Array.isArray(pagesData)) throw new Error();

      const sanitized = pagesData.map(p => ({
        ...p,
        tasks: Array.isArray(p.tasks)
          ? p.tasks.map(t => ({
              id: t.id || createId(),
              title: t.title || "",
              note: t.note || "",
              description: t.description || "",
              done: Boolean(t.done),
              createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now()
            }))
          : []
      }));

      setPages(sanitized);
      setSelectedPage(selectedId && sanitized.some(p => p.id === selectedId) ? selectedId : sanitized[0]?.id || null);
    } catch {
      const starter = createDefaultPage();
      setPages([starter]);
      setSelectedPage(starter.id);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages, selectedPage }));
  }, [pages, selectedPage, isLoaded]);

  const currentPage = useMemo(() => pages.find(p => p.id === selectedPage) || null, [pages, selectedPage]);
  const sortedTasks = useMemo(
    () => (currentPage ? [...currentPage.tasks].sort((a, b) => b.createdAt - a.createdAt) : []),
    [currentPage]
  );

  const createPage = () => {
    if (!newPageTitle.trim()) return;

    const page = {
      id: createId(),
      title: newPageTitle,
      content: "",
      tasks: []
    };

    setPages(prev => [page, ...prev]);
    setSelectedPage(page.id);
    setNewPageTitle("");
  };

  const updatePage = (field, value) => {
    setPages(prev => prev.map(p => p.id === selectedPage ? { ...p, [field]: value } : p));
  };

  const addTask = () => {
    setTaskForm(emptyTaskForm);
    setIsTaskModalOpen(true);
  };

  const saveTask = () => {
    if (!taskForm.title.trim() || !selectedPage) return;

    const isEdit = Boolean(taskForm.id);

    setPages(prev =>
      prev.map(p => {
        if (p.id !== selectedPage) return p;

        if (isEdit) {
          return {
            ...p,
            tasks: p.tasks.map(t => t.id === taskForm.id ? { ...t, ...taskForm } : t)
          };
        }

        return {
          ...p,
          tasks: [
            ...p.tasks,
            {
              id: createId(),
              title: taskForm.title,
              note: taskForm.note,
              description: taskForm.description,
              done: false,
              createdAt: Date.now()
            }
          ]
        };
      })
    );

    setIsTaskModalOpen(false);
    setTaskForm(emptyTaskForm);
  };

  const updateTask = (taskId, field, value) => {
    setPages(prev => prev.map(p => p.id === selectedPage ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t) } : p));
  };

  const deleteTask = (taskId) => {
    setPages(prev => prev.map(p => p.id === selectedPage ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) } : p));
  };

  const confirmDeleteTask = (taskId) => {
    setDeleteTaskId(taskId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteTaskId) {
      deleteTask(deleteTaskId);
    }
    setDeleteTaskId(null);
    setIsDeleteModalOpen(false);
  };

  const handleCancelDelete = () => {
    setDeleteTaskId(null);
    setIsDeleteModalOpen(false);
  };

  const handleNewPageKeyDown = e => {
    if (e.key === "Enter") createPage();
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

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950 text-white p-6">
        <div className="w-full max-w-md rounded-[2rem] border border-zinc-800 bg-zinc-900 p-10 shadow-2xl">
          <h1 className="text-4xl font-bold mb-4 text-center">Simple Notion</h1>
          <p className="text-zinc-400 mb-8 text-center">Sign in to access your notes and tasks.</p>

          {loginError && (
            <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {loginError}
            </div>
          )}

          <label className="block mb-4">
            <span className="text-sm text-zinc-400">Username</span>
            <input
              type="text"
              value={credentials.username}
              onChange={e => setCredentials({ ...credentials, username: e.target.value })}
              placeholder="Enter username"
              className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none focus:border-white"
            />
          </label>

          <label className="block mb-6">
            <span className="text-sm text-zinc-400">Password</span>
            <input
              type="password"
              value={credentials.password}
              onChange={e => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="Enter password"
              className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none focus:border-white"
            />
          </label>

          <button
            onClick={handleLogin}
            className="w-full rounded-2xl bg-white py-3 text-black font-semibold transition hover:bg-zinc-200"
          >
            Log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-zinc-950 text-white overflow-hidden">
      <aside className="w-80 border-r border-zinc-800 bg-zinc-900 p-4 flex flex-col">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Simple Notion</h1>
            <p className="text-xs text-zinc-400">
              Signed in as {user?.username}
              {user?.role === "admin" && (
                <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Admin
                </span>
              )}
            </p>
          </div>
          <button onClick={handleSignOut} className="rounded-2xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
            Sign out
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            value={newPageTitle}
            onChange={e => setNewPageTitle(e.target.value)}
            onKeyDown={handleNewPageKeyDown}
            placeholder="New page"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 outline-none"
          />
          <button onClick={createPage} className="bg-white text-black px-4 rounded-xl">Add</button>
        </div>

        <div className="space-y-2 overflow-y-auto flex-1">
          {pages.map(p => (
            <div key={p.id} onClick={() => setSelectedPage(p.id)} className={`p-3 rounded-2xl border cursor-pointer ${selectedPage === p.id ? "bg-white text-black border-white" : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"}`}>
              <span className="truncate font-medium">{p.title}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        {currentPage && (
          <div className="max-w-4xl mx-auto">
            <input
              value={currentPage.title}
              onChange={e => updatePage("title", e.target.value)}
              className="text-3xl md:text-4xl font-bold bg-transparent outline-none w-full mb-6"
            />

            <textarea
              value={currentPage.content}
              onChange={e => updatePage("content", e.target.value)}
              className="w-full min-h-[220px] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none resize-none mb-6"
            />

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Tasks</h2>
              <button onClick={addTask} className="bg-white text-black px-4 py-2 rounded-xl">Add Task</button>
            </div>

            <div className="space-y-3">
              {sortedTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <input type="checkbox" checked={t.done} onChange={e => updateTask(t.id, "done", e.target.checked)} />

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      setSelectedTask(t);
                      setIsViewModalOpen(true);
                    }}
                  >
                    <div className="font-semibold truncate">{t.title}</div>
                    <div className="text-xs text-zinc-400 truncate">{t.note}</div>
                  </div>

                  <button onClick={() => confirmDeleteTask(t.id)} className="text-red-400 px-3 py-1 rounded-md hover:bg-red-500/10">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {isViewModalOpen && selectedTask && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
         onClick={() => setIsViewModalOpen(false)} 
        >
        
        <div className="bg-zinc-900 w-[70vw] h-[70vh] overflow-y-auto rounded-2xl p-6"
          onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-5xl font-bold mb-6">
            {selectedTask.title}
          </h2>

          <div className="mb-4">
            <h3 className="text-2xl uppercase tracking-widest text-zinc-500 mb-1">
              Note:
            </h3>
            <div className="text-zinc-200 whitespace-pre-wrap leading-relaxed border border-zinc-800 rounded-xl p-3">
              {renderWithLinks(selectedTask.note)}
            </div>
          </div>

          <div className="mb-2">
            <h3 className="text-2xl uppercase tracking-widest text-zinc-500 mb-2">
              Details:
            </h3>
            <div className="text-zinc-200 whitespace-pre-wrap leading-relaxed border border-zinc-800 rounded-xl p-3">
              {renderWithLinks(selectedTask.description)}
            </div>
          </div>
        </div>
    
        {/* Floating Edit Button */}
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => {
              setTaskForm(selectedTask);
              setIsViewModalOpen(false);
              setIsTaskModalOpen(true);
            }}
            className="bg-white text-black px-5 py-3 rounded-xl shadow-lg hover:scale-105 transition"
          >
            Edit
          </button>
        </div>
    
      </div>
    )}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 w-[70vw] h-[70vh] overflow-y-auto rounded-2xl p-6 space-y-3">
            <input placeholder="Title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} className="w-full p-2 bg-zinc-800 rounded" />
            <textarea placeholder="Note" value={taskForm.note} onChange={e => setTaskForm({ ...taskForm, note: e.target.value })} className="w-full h-28 p-2 bg-zinc-800 rounded resize-none" />
            <textarea placeholder="Description" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} className="w-full min-h-[320px] p-2 bg-zinc-800 rounded" />

            <div className="flex justify-end gap-2">
              <button onClick={() => setIsTaskModalOpen(false)} className="bg-zinc-700 px-3 py-1 rounded">Cancel</button>
              <button onClick={saveTask} className="bg-white text-black px-3 py-1 rounded">Save</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-zinc-800">
            <h2 className="text-2xl font-bold">Confirm delete</h2>
            <p className="text-zinc-300">
              Are you sure you want to delete this task?
              {deleteTaskId && currentPage?.tasks.some(t => t.id === deleteTaskId) && (
                <span className="font-semibold text-white"> "{currentPage.tasks.find(t => t.id === deleteTaskId)?.title}"</span>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={handleCancelDelete} className="bg-zinc-700 px-4 py-2 rounded-xl">Cancel</button>
              <button onClick={handleConfirmDelete} className="bg-red-500 text-white px-4 py-2 rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
