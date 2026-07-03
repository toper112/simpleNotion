import { db } from "./firebase";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import Sidebar from "./components/Sidebar";
import PageEditor from "./components/PageEditor";
import TaskList from "./components/TaskList";
import TaskModal from "./components/TaskModal";
import ViewTaskModal from "./components/ViewTaskModal";
import TaskDeleteModal from "./components/TaskDeleteModal";
import PageDeleteModal from "./components/PageDeleteModal";
import {
  createDefaultPage,
  createId,
  emptyTaskForm,
  formatPageDate,
} from "./utils/helpers";
import {
  savePageToFirestore,
  deletePageFromFirestore,
} from "./utils/firestore";

const pagesCollection = collection(db, "notionPages");
const usersCollection = collection(db, "users");

export default function SimpleNotionApp() {
  const { profile, logout } = useAuth();
  const [pages, setPages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showPageDeleteModal, setShowPageDeleteModal] = useState(false);
  const [pageToDeleteId, setPageToDeleteId] = useState(null);
  const [pageDeleteConfirmInput, setPageDeleteConfirmInput] = useState("");
  const [viewedNotifications, setViewedNotificationsState] = useState(() => {
    // Load viewed notifications from localStorage on mount
    try {
      const stored = localStorage.getItem("viewedNotifications");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  // Persist viewed notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("viewedNotifications", JSON.stringify(Array.from(viewedNotifications)));
    } catch (e) {
      console.error("Failed to persist notifications:", e);
    }
  }, [viewedNotifications]);

  const setViewedNotifications = (updateFn) => {
    setViewedNotificationsState((prev) => {
      const next = typeof updateFn === "function" ? updateFn(prev) : updateFn;
      return next;
    });
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      usersCollection,
      (snapshot) => {
        setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      },
      (err) => console.error("Failed to load users:", err)
    );
    return () => unsubscribe();
  }, []);

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
          setDoc(doc(db, "notionPages", starter.id), starter).catch((err) =>
            console.error(err)
          );
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
    () => {
      const page = pages.find((page) => page.id === selectedPage);
      if (!page) return null;
      if (profile?.role === "admin") return page;
      // For non-admin users, allow viewing page if they have tasks assigned
      const hasAssignedTask = page.tasks?.some((task) => task.assignedTo === profile?.uid);
      return hasAssignedTask ? page : null;
    },
    [pages, selectedPage, profile]
  );

  const sortedTasks = useMemo(() => {
    if (!currentPage) return [];

    const availableTasks = profile?.role === "admin"
      ? currentPage.tasks
      : currentPage.tasks.filter((task) => task.assignedTo === profile?.uid);

    return [...availableTasks].sort((a, b) => b.createdAt - a.createdAt);
  }, [currentPage, profile]);

  const pagesSorted = useMemo(
    () => [...pages].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)),
    [pages]
  );

  const pagesFiltered = useMemo(() => {
    if (profile?.role === "admin") return pagesSorted;
    
    // For non-admin users, only show pages where they have tasks
    return pagesSorted.filter((page) =>
      page.tasks?.some((task) => task.assignedTo === profile?.uid)
    );
  }, [pagesSorted, profile]);

  const canEdit = profile?.role === "admin";

  const notifications = useMemo(() => {
    if (profile?.role === "admin") {
      // Admin sees notifications for newly uploaded tasks that have not been viewed by admin.
      const notifs = [];
      pages.forEach((page) => {
        page.tasks?.forEach((task) => {
          if (task.uploadStatus === "Uploaded" && !task.uploadedViewedByAdmin) {
            notifs.push({
              id: `${page.id}-${task.id}`,
              pageId: page.id,
              pageName: page.title,
              taskId: task.id,
              title: task.title,
              task: task,
              type: "uploaded",
            });
          }
        });
      });
      return notifs;
    } else {
      // Users see notifications for newly assigned tasks that they have not opened yet.
      const notifs = [];
      pages.forEach((page) => {
        page.tasks?.forEach((task) => {
          if (task.assignedTo === profile?.uid && !task.viewedByAssignedUser) {
            notifs.push({
              id: `${page.id}-${task.id}`,
              pageId: page.id,
              pageName: page.title,
              taskId: task.id,
              title: task.title,
              task: task,
              type: "assigned",
            });
          }
        });
      });
      return notifs;
    }
  }, [pages, profile]);

  const pagesWithUnviewedNotifications = useMemo(() => {
    const pageIds = new Set();
    notifications.forEach((notif) => {
      pageIds.add(notif.pageId);
    });
    return pageIds;
  }, [notifications]);

  const handleCloseViewModal = () => {
    if (selectedTask && selectedPage) {
      const notifId = `${selectedPage}-${selectedTask.id}`;
      setViewedNotifications((prev) => new Set([...prev, notifId]));
    }
    setIsViewModalOpen(false);
  };

  const createPage = () => {
    if (!canEdit) return;
    if (!newPageTitle.trim()) return;

    const page = {
      id: createId(),
      title: newPageTitle,
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: profile?.uid || null,
      assignedTo: profile?.role === "admin" ? [] : [profile?.uid],
      tasks: [],
    };

    setPages((previousPages) => [page, ...previousPages]);
    savePageToFirestore(page);
    setSelectedPage(page.id);
    setNewPageTitle("");
  };

  const updatePage = (field, value) => {
    if (!canEdit) return;

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) =>
        page.id === selectedPage
          ? { ...page, [field]: value, updatedAt: Date.now() }
          : page
      );

      const updatedPage = nextPages.find((page) => page.id === selectedPage);
      if (updatedPage) {
        savePageToFirestore(updatedPage);
      }

      return nextPages;
    });
  };

  const addTask = () => {
    if (!canEdit) return;
    setTaskForm(emptyTaskForm);
    setIsTaskModalOpen(true);
  };

  const saveTask = () => {
    if (!canEdit) return;
    if (!taskForm.title.trim() || !selectedPage) return;

    const isEdit = Boolean(taskForm.id);

    // Check if edit has meaningful changes (not just whitespace)
    if (isEdit) {
      const currentPage = pages.find((page) => page.id === selectedPage);
      const originalTask = currentPage?.tasks.find((task) => task.id === taskForm.id);
      
      if (originalTask) {
        const titleChanged = taskForm.title.trim() !== originalTask.title.trim();
        const noteChanged = taskForm.note.trim() !== originalTask.note.trim();
        const descriptionChanged = taskForm.description.trim() !== originalTask.description.trim();
        
        // If no meaningful changes, just close the modal without saving
        if (!titleChanged && !noteChanged && !descriptionChanged) {
          setIsTaskModalOpen(false);
          setTaskForm(emptyTaskForm);
          return;
        }
      }
    }

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) => {
        if (page.id !== selectedPage) return page;

        if (isEdit) {
          return {
            ...page,
            updatedAt: Date.now(),
            tasks: page.tasks.map((task) =>
              task.id === taskForm.id ? { ...task, ...taskForm } : task
            ),
          };
        }

        return {
          ...page,
          updatedAt: Date.now(),
          tasks: [
            ...page.tasks,
            {
              id: createId(),
              title: taskForm.title,
              note: taskForm.note,
              description: taskForm.description,
              done: false,
              uploadStatus: taskForm.uploadStatus || "Not Uploaded",
              createdAt: Date.now(),
              assignedTo: taskForm.assignedTo || null,
              viewedByAssignedUser: false,
            },
          ],
        };
      });

      const updatedPage = nextPages.find((page) => page.id === selectedPage);
      if (updatedPage) {
        savePageToFirestore(updatedPage);
      }

      return nextPages;
    });

    setIsTaskModalOpen(false);
    setTaskForm(emptyTaskForm);
  };

  // Helper to check if user can edit a specific task (admin or task is assigned to them)
  const canUserEditTask = (taskId) => {
    if (canEdit) return true; // Admin can edit any task
    
    // For non-admin users, check if task is assigned to them
    const page = pages.find((p) => p.id === selectedPage);
    const task = page?.tasks.find((t) => t.id === taskId);
    return task?.assignedTo === profile?.uid;
  };

  const handleStatusChange = (taskId, value) => {
    if (!canUserEditTask(taskId)) return;

    setPages((previousPages) => {
      const originalPage = previousPages.find((page) => page.id === selectedPage);
      const nextPages = previousPages.map((page) =>
        page.id === selectedPage
          ? {
              ...page,
              tasks: page.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      status: value,
                      done: value === "DONE",
                      uploadStatus: value === "DONE" ? task.uploadStatus : "Not Uploaded",
                    }
                  : task
              ),
            }
          : page
      );

      const updatedPage = nextPages.find((page) => page.id === selectedPage);
      if (updatedPage) {
        savePageToFirestore({ ...updatedPage, updatedAt: originalPage?.updatedAt });
      }

      return nextPages;
    });
  };

  const handleUploadStatusChange = (taskId, value) => {
    if (!canUserEditTask(taskId)) return;

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) =>
        page.id === selectedPage
          ? {
              ...page,
              tasks: page.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      uploadStatus: value,
                      uploadedViewedByAdmin: value === "Uploaded" ? false : task.uploadedViewedByAdmin,
                    }
                  : task
              ),
            }
          : page
      );

      const updatedPage = nextPages.find((page) => page.id === selectedPage);
      if (updatedPage) {
        savePageToFirestore(updatedPage);
      }

      return nextPages;
    });
  };

  const handleCheckboxChange = (taskId, checked) => {
    if (!canEdit) return;

    setPages((previousPages) => {
      const originalPage = previousPages.find((page) => page.id === selectedPage);
      const nextPages = previousPages.map((page) =>
        page.id === selectedPage
          ? {
              ...page,
              tasks: page.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      done: checked,
                      status: checked ? "DONE" : "NOT STARTED",
                      uploadStatus: checked ? task.uploadStatus : "Not Uploaded",
                    }
                  : task
              ),
            }
          : page
      );

      const updatedPage = nextPages.find((page) => page.id === selectedPage);
      if (updatedPage) {
        savePageToFirestore({ ...updatedPage, updatedAt: originalPage?.updatedAt });
      }

      return nextPages;
    });
  };

  const deleteTask = (taskId) => {
    if (!canEdit) return;

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) =>
        page.id === selectedPage
          ? {
              ...page,
              updatedAt: Date.now(),
              tasks: page.tasks.filter((task) => task.id !== taskId),
            }
          : page
      );

      const updatedPage = nextPages.find((page) => page.id === selectedPage);
      if (updatedPage) {
        savePageToFirestore(updatedPage);
      }

      return nextPages;
    });
  };

  const confirmDeleteTask = (taskId) => {
    if (!canEdit) return;
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

  const handleAssignTask = (taskId, userId) => {
    if (!canEdit) return;

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) =>
        page.id === selectedPage
          ? {
              ...page,
              updatedAt: Date.now(),
              tasks: page.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      assignedTo: userId || null,
                      viewedByAssignedUser:
                        task.assignedTo !== userId ? false : task.viewedByAssignedUser,
                    }
                  : task
              ),
            }
          : page
      );

      const updatedPage = nextPages.find((page) => page.id === selectedPage);
      if (updatedPage) {
        savePageToFirestore(updatedPage);
      }

      return nextPages;
    });
  };

  const handleNewPageKeyDown = (event) => {
    if (event.key === "Enter") {
      createPage();
    }
  };

  const handleSelectPage = (pageId) => setSelectedPage(pageId);
  const handleNotificationTaskClick = (pageId, taskData) => {
    setSelectedPage(pageId);
    setSelectedTask(taskData.task);
    setIsViewModalOpen(true);

    if (profile?.role === "admin" && taskData.task.uploadStatus === "Uploaded") {
      markUploadedTaskViewedByAdmin(pageId, taskData.taskId);
    }

    if (profile?.role !== "admin" && taskData.task.assignedTo === profile?.uid) {
      markAssignedTaskViewedByUser(taskData.taskId);
    }
  };
  const markTaskNotificationsAsViewed = (pageId) => {
    const page = pages.find((page) => page.id === pageId);
    if (!page) return;

    const updatedPage = {
      ...page,
      tasks: page.tasks.map((task) => {
        if (profile?.role === "admin" && task.uploadStatus === "Uploaded") {
          return { ...task, uploadedViewedByAdmin: true };
        }
        if (profile?.role !== "admin" && task.assignedTo === profile?.uid) {
          return { ...task, viewedByAssignedUser: true };
        }
        return task;
      }),
    };

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) =>
        page.id === pageId ? updatedPage : page
      );
      savePageToFirestore(updatedPage);
      return nextPages;
    });
  };
  const handleUpdateTaskForm = (nextForm) => setTaskForm(nextForm);
  const markAssignedTaskViewedByUser = (taskId) => {
    const page = pages.find((page) => page.id === selectedPage);
    const task = page?.tasks.find((task) => task.id === taskId);
    if (!task || task.assignedTo !== profile?.uid) return;
    if (task.viewedByAssignedUser) return;

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) =>
        page.id === selectedPage
          ? {
              ...page,
              tasks: page.tasks.map((task) =>
                task.id === taskId
                  ? { ...task, viewedByAssignedUser: true }
                  : task
              ),
            }
          : page
      );

      const updatedPage = nextPages.find((page) => page.id === selectedPage);
      if (updatedPage) {
        savePageToFirestore(updatedPage);
      }

      return nextPages;
    });
  };

  const markUploadedTaskViewedByAdmin = (pageId, taskId) => {
    const page = pages.find((page) => page.id === pageId);
    const task = page?.tasks.find((task) => task.id === taskId);
    if (!task || task.uploadStatus !== "Uploaded") return;
    if (task.uploadedViewedByAdmin) return;

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              tasks: page.tasks.map((task) =>
                task.id === taskId
                  ? { ...task, uploadedViewedByAdmin: true }
                  : task
              ),
            }
          : page
      );

      const updatedPage = nextPages.find((page) => page.id === pageId);
      if (updatedPage) {
        savePageToFirestore(updatedPage);
      }

      return nextPages;
    });
  };

  const handleViewTask = (task) => {
    setSelectedTask(task);
    setIsViewModalOpen(true);
    // Mark notification as viewed if it exists
    const notifId = `${selectedPage}-${task.id}`;
    setViewedNotifications((prev) => new Set([...prev, notifId]));

    if (profile?.role === "admin" && task.uploadStatus === "Uploaded") {
      markUploadedTaskViewedByAdmin(selectedPage, task.id);
    }

    if (profile?.uid && task.assignedTo === profile.uid && profile.role !== "admin") {
      markAssignedTaskViewedByUser(task.id);
    }
  };

  const handleEditTask = (task) => {
    setTaskForm({
      ...task,
      done: false,
      status: "NOT STARTED",
      uploadStatus: "Not Uploaded",
    });
    setIsViewModalOpen(false);
    setIsTaskModalOpen(true);
  };

  const requestDeletePage = (pageId) => {
    setPageToDeleteId(pageId);
    setPageDeleteConfirmInput("");
    setShowPageDeleteModal(true);
  };

  const handleCancelPageDelete = () => {
    setShowPageDeleteModal(false);
    setPageToDeleteId(null);
    setPageDeleteConfirmInput("");
  };

  const handleConfirmPageDelete = async () => {
    if (pageDeleteConfirmInput !== "DELETE" || !pageToDeleteId) return;

    await deletePageFromFirestore(pageToDeleteId);
    setPages((previousPages) => previousPages.filter((page) => page.id !== pageToDeleteId));

    if (selectedPage === pageToDeleteId) {
      setSelectedPage(null);
    }

    setShowPageDeleteModal(false);
    setPageToDeleteId(null);
    setPageDeleteConfirmInput("");
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-zinc-950 text-white overflow-hidden">
      <Sidebar
        pagesSorted={pagesFiltered}
        selectedPage={selectedPage}
        newPageTitle={newPageTitle}
        canEdit={canEdit}
        isAdmin={profile?.role === "admin"}
        profile={profile}
        onSelectPage={handleSelectPage}
        onCreatePage={createPage}
        onNewPageKeyDown={handleNewPageKeyDown}
        onRequestDeletePage={requestDeletePage}
        onChangeNewPageTitle={setNewPageTitle}
        onLogout={logout}
        formatPageDate={formatPageDate}
        notifications={notifications}
        onNotificationTaskClick={handleNotificationTaskClick}
        pagesWithUnviewedNotifications={pagesWithUnviewedNotifications}
        onMarkPageNotificationsAsViewed={markTaskNotificationsAsViewed}
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10">
        <PageEditor
          currentPage={currentPage}
          canEdit={canEdit}
          onUpdatePage={updatePage}
          onAddTask={addTask}
        >
          <TaskList
            tasks={sortedTasks}
            canEdit={canEdit}
            profile={profile}
            users={users}
            selectedPageId={selectedPage}
            viewedNotifications={viewedNotifications}
            onViewTask={handleViewTask}
            onToggleDone={handleCheckboxChange}
            onStatusChange={handleStatusChange}
            onUploadStatusChange={handleUploadStatusChange}
            onConfirmDelete={confirmDeleteTask}
            onAssignTask={handleAssignTask}
          />
        </PageEditor>
      </main>

      {isTaskModalOpen && (
        <TaskModal
          taskForm={taskForm}
          onChangeTaskForm={handleUpdateTaskForm}
          onCancel={() => setIsTaskModalOpen(false)}
          onSave={saveTask}
          users={users}
        />
      )}

      {isViewModalOpen && selectedTask && (
        <ViewTaskModal
          selectedTask={selectedTask}
          onClose={handleCloseViewModal}
          onEdit={handleEditTask}
          canEdit={canEdit}
        />
      )}

      {isDeleteModalOpen && (
        <TaskDeleteModal
          taskTitle={currentPage?.tasks.find((task) => task.id === deleteTaskId)?.title}
          onCancel={handleCancelDelete}
          onDelete={handleConfirmDelete}
        />
      )}

      {showPageDeleteModal && (
        <PageDeleteModal
          pageTitle={pages.find((page) => page.id === pageToDeleteId)?.title}
          confirmInput={pageDeleteConfirmInput}
          onChangeConfirmInput={setPageDeleteConfirmInput}
          onCancel={handleCancelPageDelete}
          onDelete={handleConfirmPageDelete}
        />
      )}
    </div>
  );
}
