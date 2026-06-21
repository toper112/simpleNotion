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
      return !page.assignedTo || page.assignedTo.includes(profile?.uid) ? page : null;
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

  const handleStatusChange = (taskId, value) => {
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
    if (!canEdit) return;

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) =>
        page.id === selectedPage
          ? {
              ...page,
              tasks: page.tasks.map((task) =>
                task.id === taskId ? { ...task, uploadStatus: value } : task
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
                  ? { ...task, assignedTo: userId || null }
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
  const handleUpdateTaskForm = (nextForm) => setTaskForm(nextForm);
  const handleViewTask = (task) => {
    setSelectedTask(task);
    setIsViewModalOpen(true);
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
            users={users}
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
          onClose={() => setIsViewModalOpen(false)}
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
