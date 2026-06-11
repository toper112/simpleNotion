import { db } from "./firebase";

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

export default function SimpleNotionApp() {
  const createId = () => {
    if (
      typeof crypto !== "undefined" &&
      crypto.randomUUID
    ) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  };
  const pagesCollection = collection(
    db,
    "notionPages"
  );

  const createDefaultPage = () => ({
    id: createId(),
    title: "My First Page",
    content:
      "# Welcome\n\nStart writing your tasks here...",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tasks: [
      {
        id: createId(),
        title: "Create your first task",
        note: "",
        description: "",
        done: false,
        createdAt: Date.now(),
        status: "NOT STARTED",
      },
    ],
  });

  const emptyTaskForm = {
    id: null,
    title: "",
    note: "",
    description: "",
  };

  const CORRECT_CODE = "1126";
  const CODE_AUTH_KEY =
    "simple-notion-code-auth";

  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] =
    useState(null);
  const [newPageTitle, setNewPageTitle] =
    useState("");
  const [isLoaded, setIsLoaded] =
    useState(false);

  const [
    isCodeAuthenticated,
    setIsCodeAuthenticated,
  ] = useState(false);

  const [showCodeModal, setShowCodeModal] =
    useState(false);

  const [codeInput, setCodeInput] =
    useState("");

  const [codeError, setCodeError] =
    useState("");

  const [
    isTaskModalOpen,
    setIsTaskModalOpen,
  ] = useState(false);

  const [
    isViewModalOpen,
    setIsViewModalOpen,
  ] = useState(false);

  const [
    isDeleteModalOpen,
    setIsDeleteModalOpen,
  ] = useState(false);

  const [deleteTaskId, setDeleteTaskId] =
    useState(null);

  const [taskForm, setTaskForm] =
    useState(emptyTaskForm);

  const [selectedTask, setSelectedTask] =
    useState(null);

  const [showPageDeleteModal, setShowPageDeleteModal] = useState(false);
  const [pageToDeleteId, setPageToDeleteId] = useState(null);
  const [pageDeleteConfirmInput, setPageDeleteConfirmInput] = useState("");

  // AUTH
  useEffect(() => {
    const savedAuth = sessionStorage.getItem(
      CODE_AUTH_KEY
    );

    if (savedAuth === "true") {
      setIsCodeAuthenticated(true);
    }
  }, []);

  const verifyCode = () => {
    if (codeInput.trim() === CORRECT_CODE) {
      sessionStorage.setItem(
        CODE_AUTH_KEY,
        "true"
      );

      setIsCodeAuthenticated(true);
      setCodeError("");
      setCodeInput("");
      setShowCodeModal(false);
    } else {
      setCodeError(
        "Invalid code. Preview only."
      );

      setCodeInput("");
    }
  };

  const checkCodeBeforeCRUD = () => {
    if (!isCodeAuthenticated) {
      setShowCodeModal(true);
      return false;
    }

    return true;
  };

  const canEdit = isCodeAuthenticated;
  const DOC_REF = doc(db, "notion", "main");

// CREATE / UPDATE ENTIRE DOCUMENT
const saveToFirestore = async (
  updatedPages,
  updatedSelectedPage
) => {
  try {
    await setDoc(DOC_REF, {
      pages: updatedPages,
      selectedPage: updatedSelectedPage,
      updatedAt: Date.now(),
    });

    console.log("Saved to Firestore");
  } catch (err) {
    console.error(
      "Firestore Save Error:",
      err
    );
  }
};

// READ DOCUMENT
const loadFromFirestore = async () => {
  try {
    const docSnap = await getDoc(DOC_REF);

    if (docSnap.exists()) {
      const data = docSnap.data();

      setPages(data.pages || []);
      setSelectedPage(null);
    } else {
      const starter =
        createDefaultPage();

      setPages([starter]);
      setSelectedPage(null);
    }
  } catch (err) {
    console.error(
      "Firestore Load Error:",
      err
    );

    const starter =
      createDefaultPage();

    setPages([starter]);
    setSelectedPage(starter.id);
  } finally {
    setIsLoaded(true);
  }
};
const savePageToFirestore = async (
  page
) => {
  try {
    await setDoc(
      doc(
        db,
        "notionPages",
        page.id
      ),
      page
    );

    console.log("Page saved");
  } catch (err) {
    console.error(err);
  }
};
const deletePageFromFirestore =
  async (pageId) => {
    try {
      await deleteDoc(
        doc(
          db,
          "notionPages",
          pageId
        )
      );

      console.log("Page deleted");
    } catch (err) {
      console.error(err);
    }
  };

// DELETE ENTIRE DATABASE DOCUMENT
const clearFirestore = async () => {
  try {
    await deleteDoc(DOC_REF);

    console.log(
      "Firestore document deleted"
    );
  } catch (err) {
    console.error(
      "Firestore Delete Error:",
      err
    );
  }
};

  useEffect(() => {
    let firstSnapshot = true;

    const unsubscribe = onSnapshot(
      pagesCollection,
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedPages = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setPages(loadedPages);
        } else {
          const starter = createDefaultPage();

          setDoc(
            doc(db, "notionPages", starter.id),
            starter
          ).catch((err) => console.error(err));

          setPages([starter]);
        }

        if (firstSnapshot) {
          setSelectedPage(null);
          setIsLoaded(true);
          firstSnapshot = false;
        }
      },
      (err) => {
        console.error(err);
        if (firstSnapshot) {
          setSelectedPage(null);
          setIsLoaded(true);
          firstSnapshot = false;
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const currentPage = useMemo(
    () =>
      pages.find(
        (p) => p.id === selectedPage
      ) || null,
    [pages, selectedPage]
  );

  const sortedTasks = useMemo(
    () =>
      currentPage
        ? [...currentPage.tasks].sort(
            (a, b) =>
              b.createdAt - a.createdAt
          )
        : [],
    [currentPage]
  );

  const pagesSorted = useMemo(
    () =>
      [...pages].sort(
        (a, b) =>
          (b.updatedAt || b.createdAt || 0) -
          (a.updatedAt || a.createdAt || 0)
      ),
    [pages]
  );

  const formatPageDate = (timestamp) =>
    timestamp
      ? new Date(timestamp).toLocaleString()
      : "";

  const createPage = () => {
    if (!checkCodeBeforeCRUD()) return;

    if (!newPageTitle.trim()) return;

    const page = {
      id: createId(),
      title: newPageTitle,
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tasks: [],
    };

    setPages((prev) => [page, ...prev]);
    savePageToFirestore(page);

    setSelectedPage(page.id);
    setNewPageTitle("");
  };

  const updatePage = (field, value) => {
    if (!checkCodeBeforeCRUD()) return;

    setPages((prev) => {
      const next = prev.map((p) =>
        p.id === selectedPage
          ? { ...p, [field]: value, updatedAt: Date.now() }
          : p
      );
      const updatedPage = next.find(
        (p) => p.id === selectedPage
      );
      if (updatedPage) savePageToFirestore(updatedPage);
      return next;
    });
  };

  const addTask = () => {
    if (!checkCodeBeforeCRUD()) return;

    setTaskForm(emptyTaskForm);

    setIsTaskModalOpen(true);
  };

  const saveTask = () => {
    if (!checkCodeBeforeCRUD()) return;

    if (
      !taskForm.title.trim() ||
      !selectedPage
    )
      return;

    const isEdit = Boolean(taskForm.id);

    setPages((prev) => {
      const next = prev.map((p) => {
        if (p.id !== selectedPage) return p;

        if (isEdit) {
          return {
            ...p,
            updatedAt: Date.now(),
            tasks: p.tasks.map((t) =>
              t.id === taskForm.id
                ? { ...t, ...taskForm }
                : t
            ),
          };
        }

        return {
          ...p,
          updatedAt: Date.now(),
          tasks: [
            ...p.tasks,
            {
              id: createId(),
              title: taskForm.title,
              note: taskForm.note,
              description:
                taskForm.description,
              done: false,
              createdAt: Date.now(),
            },
          ],
        };
      });

      const updatedPage = next.find(
        (p) => p.id === selectedPage
      );
      if (updatedPage) savePageToFirestore(updatedPage);
      return next;
    });

    setIsTaskModalOpen(false);

    setTaskForm(emptyTaskForm);
  };

  const handleStatusChange = (taskId, value) => {
    if (!checkCodeBeforeCRUD()) return;

    // Update status without changing page.updatedAt
    setPages((prev) => {
      const original = prev.find((p) => p.id === selectedPage);

      const next = prev.map((p) =>
        p.id === selectedPage
          ? {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      status: value,
                      // keep checkbox in sync: DONE -> checked, others -> unchecked
                      done: value === "DONE",
                    }
                  : t
              ),
            }
          : p
      );

      const updatedPage = next.find((p) => p.id === selectedPage);
      if (updatedPage) {
        const toSave = { ...updatedPage, updatedAt: original?.updatedAt };
        savePageToFirestore(toSave);
      }

      return next;
    });
  };

  const handleCheckboxChange = (taskId, checked) => {
    if (!checkCodeBeforeCRUD()) return;
    setPages((prev) => {
      const original = prev.find((p) => p.id === selectedPage);

      const next = prev.map((p) =>
        p.id === selectedPage
          ? {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      done: checked,
                      status: checked ? "DONE" : "NOT STARTED",
                    }
                  : t
              ),
            }
          : p
      );

      const updatedPage = next.find((p) => p.id === selectedPage);
      if (updatedPage) {
        // preserve original updatedAt when toggling done
        const toSave = { ...updatedPage, updatedAt: original?.updatedAt };
        savePageToFirestore(toSave);
      }

      return next;
    });
  };

  const updateTask = (
    taskId,
    field,
    value
  ) => {
    if (!checkCodeBeforeCRUD()) return;

    setPages((prev) => {
      const next = prev.map((p) =>
        p.id === selectedPage
          ? {
              ...p,
              updatedAt: Date.now(),
              tasks: p.tasks.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      [field]: value,
                    }
                  : t
              ),
            }
          : p
      );
      const updatedPage = next.find(
        (p) => p.id === selectedPage
      );
      if (updatedPage) savePageToFirestore(updatedPage);
      return next;
    });
  };

  const deleteTask = (taskId) => {
    if (!checkCodeBeforeCRUD()) return;

    setPages((prev) => {
      const next = prev.map((p) =>
        p.id === selectedPage
          ? {
              ...p,
              updatedAt: Date.now(),
              tasks: p.tasks.filter(
                (t) => t.id !== taskId
              ),
            }
          : p
      );
      const updatedPage = next.find(
        (p) => p.id === selectedPage
      );
      if (updatedPage) savePageToFirestore(updatedPage);
      return next;
    });
  };

  const confirmDeleteTask = (
    taskId
  ) => {
    if (!checkCodeBeforeCRUD()) return;

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

  const handleNewPageKeyDown = (e) => {
    if (e.key === "Enter") {
      createPage();
    }
  };

  const renderWithLinks = (text) => {
    if (!text) return null;

    const urlRegex =
      /(https?:\/\/[^\s]+)/g;

    return text
      .split(urlRegex)
      .map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline break-all"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              {part}
            </a>
          );
        }

        return (
          <span key={index}>{part}</span>
        );
      });
  };

  if (!isLoaded) return null;

  return (
    <div className="h-screen flex flex-col md:flex-row bg-zinc-950 text-white overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-900 p-4 flex flex-col max-h-[40vh] md:max-h-full">

        <div className="mb-6 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">
            Simple Notion
          </h1>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            value={newPageTitle}
            onChange={(e) =>
              setNewPageTitle(e.target.value)
            }
            onKeyDown={handleNewPageKeyDown}
            placeholder="New page"
            disabled={!isCodeAuthenticated}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <button
            onClick={createPage}
            disabled={!isCodeAuthenticated}
            className="bg-white text-black px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto flex-1 pb-2">
          {pagesSorted.map((p) => (
            <div
              key={p.id}
              className={`p-3 rounded-2xl border transition ${
                selectedPage === p.id
                  ? "bg-white text-black border-white"
                  : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between" onClick={() => setSelectedPage(p.id)}>
                <div className="flex-1 min-w-0">
                  <span className="truncate font-medium block">
                    {p.title}
                  </span>
                  <span className="text-xs text-zinc-400 block mt-1">
                    {formatPageDate(p.updatedAt || p.createdAt)}
                  </span>
                </div>

                {isCodeAuthenticated && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPageToDeleteId(p.id);
                      setPageDeleteConfirmInput("");
                      setShowPageDeleteModal(true);
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
              <span className="text-xs text-amber-300 uppercase tracking-widest">
                Preview Mode
              </span>

              <button
                onClick={() => setShowCodeModal(true)}
                className="bg-amber-500 text-black px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90"
              >
                Verify
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-400 uppercase tracking-widest">
                Edit Mode
              </span>

              <button
                onClick={() => {
                  sessionStorage.removeItem(
                    CODE_AUTH_KEY
                  );
                  setIsCodeAuthenticated(false);
                }}
                className="bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs hover:bg-zinc-600"
              >
                Lock
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10">
        {currentPage ? (
          <div className="max-w-4xl mx-auto">

            <input
              value={currentPage.title}
              onChange={(e) =>
                updatePage("title", e.target.value)
              }
              disabled={!isCodeAuthenticated}
              className="text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent outline-none w-full mb-6 disabled:opacity-70 disabled:cursor-not-allowed"
            />

            <textarea
              value={currentPage.content}
              onChange={(e) =>
                updatePage("content", e.target.value)
              }
              disabled={!isCodeAuthenticated}
              className="w-full min-h-[220px] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none resize-none mb-6 disabled:opacity-70 disabled:cursor-not-allowed"
            />

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between sm:items-center mb-4">

              <h2 className="text-xl font-semibold">
                Tasks
              </h2>

              <button
                onClick={addTask}
                disabled={!isCodeAuthenticated}
                className="bg-white text-black px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                Add Task
              </button>
            </div>

            <div className="space-y-3">
              {sortedTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
                >
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={(e) =>
                      handleCheckboxChange(t.id, e.target.checked)
                    }
                    disabled={!isCodeAuthenticated}
                    className="h-5 w-5 rounded border-zinc-700 bg-zinc-900 text-white disabled:opacity-80 disabled:cursor-not-allowed"
                    style={{
                      accentColor: t.done ? "#34D399" : undefined,
                      opacity: !isCodeAuthenticated && t.done ? 1 : undefined,
                    }}
                  />

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      setSelectedTask(t);
                      setIsViewModalOpen(true);
                    }}
                  >
                    <div className="font-semibold break-words">
                      {t.title}
                    </div>

                    <div className="text-xs text-zinc-400 break-words">
                      {t.note?.length > 80
                        ? t.note.slice(0, 80) + "..."
                        : t.note}
                    </div>
                  </div>

                  <select
                    value={t.status || "NOT STARTED"}
                    onChange={(e) =>
                      handleStatusChange(t.id, e.target.value)
                    }
                    disabled={!isCodeAuthenticated}
                    className={`ml-2 px-3 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-sm ${
                      t.status === "EDITING"
                        ? "text-blue-400"
                        : t.status === "DONE"
                        ? "text-green-400"
                        : "text-zinc-300"
                    }`}
                  >
                    <option value="EDITING">EDITING</option>
                    <option value="NOT STARTED">NOT STARTED</option>
                    <option value="DONE">DONE</option>
                  </select>

                  <button
                    onClick={() =>
                      confirmDeleteTask(t.id)
                    }
                    disabled={!isCodeAuthenticated}
                    className="text-red-400 px-3 py-2 rounded-md hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-20 text-center text-zinc-400">
            <p className="text-xl font-semibold">
              Please select a page or create a new one.
            </p>
          </div>
        )}
      </main>

      {/* VIEW TASK MODAL */}
      {isViewModalOpen && selectedTask && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50"
          onClick={() => setIsViewModalOpen(false)}
        >
          <div
            className="bg-zinc-900 w-full sm:w-[90vw] md:w-[70vw] h-[90vh] md:h-[70vh] overflow-y-auto rounded-2xl p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 break-words">
              {selectedTask.title}
            </h2>

            <div className="mb-4">
              <h3 className="text-xl sm:text-2xl uppercase tracking-widest text-zinc-500 mb-1">
                Note:
              </h3>

              <div className="text-zinc-200 whitespace-pre-wrap leading-relaxed border border-zinc-800 rounded-xl p-3 break-words">
                {renderWithLinks(selectedTask.note)}
              </div>
            </div>

            <div className="mb-2">
              <h3 className="text-xl sm:text-2xl uppercase tracking-widest text-zinc-500 mb-2">
                Details:
              </h3>

              <div className="text-zinc-200 whitespace-pre-wrap leading-relaxed border border-zinc-800 rounded-xl p-3 break-words">
                {renderWithLinks(
                  selectedTask.description
                )}
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6">
              <button
                onClick={() => {
                  setTaskForm(selectedTask);
                  setIsViewModalOpen(false);
                  setIsTaskModalOpen(true);
                }}
                className="bg-white text-black px-4 sm:px-5 py-3 rounded-xl shadow-lg active:scale-95 transition"
              >
                Edit
              </button>
            </div>
          )}

          {!canEdit && (
            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6">
              <button
                onClick={() =>
                  setShowCodeModal(true)
                }
                className="bg-amber-500 text-black px-4 sm:px-5 py-3 rounded-xl shadow-lg active:scale-95 transition"
              >
                Verify to Edit
              </button>
            </div>
          )}
        </div>
      )}

      {/* TASK MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50">

          <div className="bg-zinc-900 w-full sm:w-[90vw] md:w-[70vw] h-[95vh] md:h-[70vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-3">

            <input
              placeholder="Title"
              value={taskForm.title}
              onChange={(e) =>
                setTaskForm({
                  ...taskForm,
                  title: e.target.value,
                })
              }
              className="w-full p-3 bg-zinc-800 rounded-xl"
            />

            <textarea
              placeholder="Note"
              value={taskForm.note}
              onChange={(e) =>
                setTaskForm({
                  ...taskForm,
                  note: e.target.value,
                })
              }
              className="w-full h-32 p-3 bg-zinc-800 rounded-xl resize-none text-sm sm:text-base"
            />

            <textarea
              placeholder="Description"
              value={taskForm.description}
              onChange={(e) =>
                setTaskForm({
                  ...taskForm,
                  description: e.target.value,
                })
              }
              className="w-full min-h-[250px] md:min-h-[320px] p-3 bg-zinc-800 rounded-xl text-sm sm:text-base"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() =>
                  setIsTaskModalOpen(false)
                }
                className="bg-zinc-700 px-4 py-3 rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={saveTask}
                className="bg-white text-black px-4 py-3 rounded-xl"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50">

          <div className="bg-zinc-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-zinc-800">

            <h2 className="text-2xl font-bold">
              Confirm delete
            </h2>

            <p className="text-zinc-300">
              Are you sure you want to delete this task?

              {deleteTaskId &&
                currentPage?.tasks.some(
                  (t) => t.id === deleteTaskId
                ) && (
                  <span className="font-semibold text-white">
                    {" "}
                    "
                    {
                      currentPage.tasks.find(
                        (t) => t.id === deleteTaskId
                      )?.title
                    }
                    "
                  </span>
                )}
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelDelete}
                className="bg-zinc-700 px-4 py-3 rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmDelete}
                className="bg-red-500 text-white px-4 py-3 rounded-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showPageDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-zinc-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-zinc-800">
            <h2 className="text-2xl font-bold">Delete Page</h2>

            <p className="text-zinc-300">Type "DELETE" to confirm deletion of this page.</p>

            <input
              value={pageDeleteConfirmInput}
              onChange={(e) => setPageDeleteConfirmInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-center outline-none focus:border-white"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPageDeleteModal(false);
                  setPageToDeleteId(null);
                  setPageDeleteConfirmInput("");
                }}
                className="bg-zinc-700 px-4 py-3 rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (!pageToDeleteId) return;
                  try {
                    await deletePageFromFirestore(pageToDeleteId);
                  } catch (err) {
                    console.error(err);
                  }

                  setPages((prev) => prev.filter((pp) => pp.id !== pageToDeleteId));
                  if (selectedPage === pageToDeleteId) setSelectedPage(null);

                  setShowPageDeleteModal(false);
                  setPageToDeleteId(null);
                  setPageDeleteConfirmInput("");
                }}
                disabled={pageDeleteConfirmInput !== "DELETE"}
                className="bg-red-500 text-white px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CODE MODAL */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50">

          <div className="bg-zinc-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-zinc-800">

            <h2 className="text-2xl font-bold">
              Enter Code
            </h2>

            <p className="text-zinc-400">
              Code required to modify content
            </p>

            {codeError && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {codeError}
              </div>
            )}

            <input
              type="password"
              value={codeInput}
              onChange={(e) =>
                setCodeInput(e.target.value)
              }
              onKeyDown={(e) =>
                e.key === "Enter" && verifyCode()
              }
              placeholder="Enter code"
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-center outline-none focus:border-white"
              autoFocus
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() =>
                  setShowCodeModal(false)
                }
                className="bg-zinc-700 px-4 py-3 rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={verifyCode}
                className="bg-white text-black px-4 py-3 rounded-xl font-semibold"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}