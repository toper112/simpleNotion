import { db } from "./firebase";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import PageEditor from "./components/PageEditor";
import TaskList from "./components/TaskList";
import TaskModal from "./components/TaskModal";
import ViewTaskModal from "./components/ViewTaskModal";
import TaskDeleteModal from "./components/TaskDeleteModal";
import PageDeleteModal from "./components/PageDeleteModal";
import CodeModal from "./components/CodeModal";
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

const CORRECT_CODE = "1126";
const CODE_AUTH_KEY = "simple-notion-code-auth";
const pagesCollection = collection(db, "notionPages");

export default function SimpleNotionApp() {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCodeAuthenticated, setIsCodeAuthenticated] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
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
    const savedAuth = sessionStorage.getItem(CODE_AUTH_KEY);
    if (savedAuth === "true") {
      setIsCodeAuthenticated(true);
    }
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
    () => pages.find((page) => page.id === selectedPage) || null,
    [pages, selectedPage]
  );

  const sortedTasks = useMemo(
    () =>
      currentPage
        ? [...currentPage.tasks].sort((a, b) => b.createdAt - a.createdAt)
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

  const verifyCode = () => {
    if (codeInput.trim() === CORRECT_CODE) {
      sessionStorage.setItem(CODE_AUTH_KEY, "true");
      setIsCodeAuthenticated(true);
      setCodeError("");
      setCodeInput("");
      setShowCodeModal(false);
    } else {
      setCodeError("Invalid code. Preview only.");
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

    setPages((previousPages) => [page, ...previousPages]);
    savePageToFirestore(page);
    setSelectedPage(page.id);
    setNewPageTitle("");
  };

  const updatePage = (field, value) => {
    if (!checkCodeBeforeCRUD()) return;

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
    if (!checkCodeBeforeCRUD()) return;
    setTaskForm(emptyTaskForm);
    setIsTaskModalOpen(true);
  };

  const saveTask = () => {
    if (!checkCodeBeforeCRUD()) return;
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
    if (!checkCodeBeforeCRUD()) return;

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
    if (!checkCodeBeforeCRUD()) return;

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
    if (!checkCodeBeforeCRUD()) return;

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
    if (!checkCodeBeforeCRUD()) return;

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

  const handleAuthLock = () => {
    sessionStorage.removeItem(CODE_AUTH_KEY);
    setIsCodeAuthenticated(false);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-zinc-950 text-white overflow-hidden">
      <Sidebar
        pagesSorted={pagesSorted}
        selectedPage={selectedPage}
        newPageTitle={newPageTitle}
        isCodeAuthenticated={isCodeAuthenticated}
        onSelectPage={handleSelectPage}
        onCreatePage={createPage}
        onNewPageKeyDown={handleNewPageKeyDown}
        onRequestDeletePage={requestDeletePage}
        onShowCodeModal={() => setShowCodeModal(true)}
        onLock={handleAuthLock}
        onChangeNewPageTitle={setNewPageTitle}
        formatPageDate={formatPageDate}
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10">
        <PageEditor
          currentPage={currentPage}
          canEdit={isCodeAuthenticated}
          onUpdatePage={updatePage}
          onAddTask={addTask}
        >
          <TaskList
            tasks={sortedTasks}
            canEdit={isCodeAuthenticated}
            onViewTask={handleViewTask}
            onToggleDone={handleCheckboxChange}
            onStatusChange={handleStatusChange}
            onUploadStatusChange={handleUploadStatusChange}
            onConfirmDelete={confirmDeleteTask}
          />
        </PageEditor>
      </main>

      {showCodeModal && (
        <CodeModal
          codeInput={codeInput}
          codeError={codeError}
          onChangeCodeInput={setCodeInput}
          onVerify={verifyCode}
          onCancel={() => setShowCodeModal(false)}
        />
      )}

      {isTaskModalOpen && (
        <TaskModal
          taskForm={taskForm}
          onChangeTaskForm={handleUpdateTaskForm}
          onCancel={() => setIsTaskModalOpen(false)}
          onSave={saveTask}
        />
      )}

      {isViewModalOpen && selectedTask && (
        <ViewTaskModal
          selectedTask={selectedTask}
          onClose={() => setIsViewModalOpen(false)}
          onEdit={handleEditTask}
          canEdit={isCodeAuthenticated}
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
