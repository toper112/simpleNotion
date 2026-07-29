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
  const [selectedTabId, setSelectedTabId] = useState(null);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [taskFilters, setTaskFilters] = useState({ category: "All", assigned: "All", upload: "All", assigned_user: "All" });
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

  const getPageTabs = (page) => {
    if (!page) return [{ id: "legacy-tab", title: "Tab 1", tasks: [] }];

    const existingTabs = Array.isArray(page.tabs) ? page.tabs : [];
    const legacyTasks = Array.isArray(page.tasks) ? page.tasks : [];
    const tasksInTabs = new Set(
      existingTabs.flatMap((tab) => (tab.tasks || []).map((task) => task.id))
    );
    const orphanTasks = legacyTasks.filter((task) => !tasksInTabs.has(task.id));

    if (existingTabs.length === 0) {
      return [{ id: "legacy-tab", title: "Tab 1", tasks: orphanTasks }];
    }

    const tab1Index = existingTabs.findIndex(
      (tab) => tab.title === "Tab 1" || tab.id === "legacy-tab"
    );

    if (tab1Index >= 0) {
      return existingTabs.map((tab, index) =>
        index === tab1Index
          ? { ...tab, tasks: [...(tab.tasks || []), ...orphanTasks] }
          : tab
      );
    }

    return [
      { id: "legacy-tab", title: "Tab 1", tasks: orphanTasks },
      ...existingTabs,
    ];
  };

  const currentPage = useMemo(
    () => {
      const page = pages.find((page) => page.id === selectedPage);
      if (!page) return null;
      if (profile?.role === "admin") return page;
      const hasAssignedTask = getPageTabs(page).some((tab) =>
        (tab.tasks || []).some((task) => task.assignedTo === profile?.uid)
      );
      return hasAssignedTask ? page : null;
    },
    [pages, selectedPage, profile]
  );

  const activeTab = useMemo(() => {
    if (!currentPage) return null;
    const tabs = getPageTabs(currentPage);
    if (!tabs.length) return null;
    const selected = tabs.find((tab) => tab.id === selectedTabId) || tabs[0];
    return selected;
  }, [currentPage, selectedTabId]);

  useEffect(() => {
    if (!currentPage) return;
    const tabs = getPageTabs(currentPage);
    if (!tabs.length) return;
    if (!selectedTabId || !tabs.some((tab) => tab.id === selectedTabId)) {
      setSelectedTabId(tabs[0].id);
    }
  }, [currentPage, selectedTabId]);

  const currentTabTasks = useMemo(() => {
    if (!currentPage || !activeTab) return [];
    const tasks = activeTab.tasks || [];
    return profile?.role === "admin"
      ? tasks
      : tasks.filter((task) => task.assignedTo === profile?.uid);
  }, [activeTab, currentPage, profile]);

  const sortedTasks = useMemo(() => {
    return [...currentTabTasks].sort((a, b) => b.createdAt - a.createdAt);
  }, [currentTabTasks]);

  const pagesSorted = useMemo(
    () => [...pages].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)),
    [pages]
  );

  const pagesFiltered = useMemo(() => {
    if (profile?.role === "admin") return pagesSorted;

    return pagesSorted.filter((page) =>
      getPageTabs(page).some((tab) =>
        (tab.tasks || []).some((task) => task.assignedTo === profile?.uid)
      )
    );
  }, [pagesSorted, profile]);

  const canEdit = profile?.role === "admin";

  const notifications = useMemo(() => {
    if (profile?.role === "admin") {
      const notifs = [];
      pages.forEach((page) => {
        getPageTabs(page).forEach((tab) => {
          (tab.tasks || []).forEach((task) => {
            if (task.uploadStatus === "Uploaded" && !task.uploadedViewedByAdmin) {
              notifs.push({
                id: `${page.id}-${tab.id}-${task.id}`,
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
      });
      return notifs;
    } else {
      const notifs = [];
      pages.forEach((page) => {
        getPageTabs(page).forEach((tab) => {
          (tab.tasks || []).forEach((task) => {
            if (task.assignedTo === profile?.uid && !task.viewedByAssignedUser) {
              notifs.push({
                id: `${page.id}-${tab.id}-${task.id}`,
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
      tabs: [{ id: createId(), title: "Tab 1", tasks: [] }],
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
    if (!canEdit || !activeTab) return;
    setTaskForm({ ...emptyTaskForm, category: "Uncategorize" });
    setIsTaskModalOpen(true);
  };

  const saveTask = () => {
    if (!canEdit) return;
    if (!taskForm.title.trim() || !selectedPage) return;

    const isEdit = Boolean(taskForm.id);

    // Check if edit has meaningful changes (not just whitespace)
    if (isEdit) {
      const currentPage = pages.find((page) => page.id === selectedPage);
      const originalTask = getPageTabs(currentPage)
        .flatMap((tab) => tab.tasks || [])
        .find((task) => task.id === taskForm.id);
      
      if (originalTask) {
        const titleChanged = taskForm.title.trim() !== originalTask.title.trim();
        const noteInspoChanged = taskForm.note_inspo.trim() !== originalTask.note_inspo.trim();
        const noteSettingChanged = taskForm.note_setting.trim() !== originalTask.note_setting.trim();
        const noteCpChanged = taskForm.note_cp.trim() !== originalTask.note_cp.trim();
        const descriptionChanged = taskForm.description.trim() !== originalTask.description.trim();
        
        // If no meaningful changes, just close the modal without saving
        if (!titleChanged && !noteInspoChanged && !noteSettingChanged && !noteCpChanged && !descriptionChanged) {
          setIsTaskModalOpen(false);
          setTaskForm(emptyTaskForm);
          return;
        }
      }
    }

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) => {
        if (page.id !== selectedPage) return page;

        const tabs = getPageTabs(page).map((tab) =>
          tab.id === activeTab?.id
            ? {
                ...tab,
                tasks: isEdit
                  ? (tab.tasks || []).map((task) =>
                      task.id === taskForm.id ? { ...task, ...taskForm } : task
                    )
                  : [
                      ...(tab.tasks || []),
                      {
                        id: createId(),
                        title: taskForm.title,
                        note_inspo: taskForm.note_inspo,
                        note_setting: taskForm.note_setting,
                        note_cp: taskForm.note_cp,
                        description: taskForm.description,
                        done: false,
                        uploadStatus: taskForm.uploadStatus || "Not Uploaded",
                        category: taskForm.category || "Uncategorize",
                        createdAt: Date.now(),
                        assignedTo: taskForm.assignedTo || null,
                        viewedByAssignedUser: false,
                      },
                    ],
              }
            : tab
        );

        if (isEdit) {
          return {
            ...page,
            updatedAt: Date.now(),
            tabs,
            tasks: tabs.flatMap((tab) => tab.tasks),
          };
        }

        return {
          ...page,
          updatedAt: Date.now(),
          tabs,
          tasks: tabs.flatMap((tab) => tab.tasks),
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
    const task = getPageTabs(page)
      .flatMap((tab) => tab.tasks || [])
      .find((t) => t.id === taskId);
    return task?.assignedTo === profile?.uid;
  };

  const handleStatusChange = (taskId, value) => {
    if (!canUserEditTask(taskId)) return;

    setPages((previousPages) => {
      const originalPage = previousPages.find((page) => page.id === selectedPage);
      const nextPages = previousPages.map((page) => {
      if (page.id !== selectedPage) return page;

      const updatedTabs = getPageTabs(page).map((tab) =>
        tab.id === activeTab?.id
          ? {
              ...tab,
              tasks: (tab.tasks || []).map((task) =>
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
          : tab
      );

      return {
        ...page,
        updatedAt: Date.now(),
        tabs: updatedTabs,
        tasks: updatedTabs.flatMap((tab) => tab.tasks || []),
      };
    });

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
      const nextPages = previousPages.map((page) => {
      if (page.id !== selectedPage) return page;

      const updatedTabs = getPageTabs(page).map((tab) =>
        tab.id === activeTab?.id
          ? {
              ...tab,
              tasks: (tab.tasks || []).map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      uploadStatus: value,
                      uploadedViewedByAdmin: value === "Uploaded" ? false : task.uploadedViewedByAdmin,
                    }
                  : task
              ),
            }
          : tab
      );

      return {
        ...page,
        updatedAt: Date.now(),
        tabs: updatedTabs,
        tasks: updatedTabs.flatMap((tab) => tab.tasks || []),
      };
    });

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
      const nextPages = previousPages.map((page) => {
      if (page.id !== selectedPage) return page;

      const updatedTabs = getPageTabs(page).map((tab) =>
        tab.id === activeTab?.id
          ? {
              ...tab,
              tasks: (tab.tasks || []).map((task) =>
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
          : tab
      );

      return {
        ...page,
        updatedAt: Date.now(),
        tabs: updatedTabs,
        tasks: updatedTabs.flatMap((tab) => tab.tasks || []),
      };
    });

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
              tabs: getPageTabs(page).map((tab) =>
                tab.id === activeTab?.id
                  ? { ...tab, tasks: (tab.tasks || []).filter((task) => task.id !== taskId) }
                  : tab
              ),
              tasks: getPageTabs(page).flatMap((tab) =>
                tab.id === activeTab?.id
                  ? (tab.tasks || []).filter((task) => task.id !== taskId)
                  : tab.tasks
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
      const nextPages = previousPages.map((page) => {
      if (page.id !== selectedPage) return page;

      const updatedTabs = getPageTabs(page).map((tab) =>
        tab.id === activeTab?.id
          ? {
              ...tab,
              tasks: (tab.tasks || []).map((task) =>
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
          : tab
      );

      return {
        ...page,
        updatedAt: Date.now(),
        tabs: updatedTabs,
        tasks: updatedTabs.flatMap((tab) => tab.tasks || []),
      };
    });

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

  const handleSelectPage = (pageId) => {
    setSelectedPage(pageId);
    const page = pages.find((entry) => entry.id === pageId);
    const pageTabs = getPageTabs(page);
    if (pageTabs.length) {
      setSelectedTabId(pageTabs[0].id);
    }
  };
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

    const pageTabs = getPageTabs(page);
    const updatedTabs = pageTabs.map((tab) => ({
      ...tab,
      tasks: (tab.tasks || []).map((task) => {
        if (profile?.role === "admin" && task.uploadStatus === "Uploaded") {
          return { ...task, uploadedViewedByAdmin: true };
        }
        if (profile?.role !== "admin" && task.assignedTo === profile?.uid) {
          return { ...task, viewedByAssignedUser: true };
        }
        return task;
      }),
    }));

    const updatedPage = {
      ...page,
      tabs: updatedTabs,
      tasks: updatedTabs.flatMap((tab) => tab.tasks),
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
    const task = getPageTabs(page).flatMap((tab) => tab.tasks || []).find((task) => task.id === taskId);
    if (!task || task.assignedTo !== profile?.uid) return;
    if (task.viewedByAssignedUser) return;

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) => {
        if (page.id !== selectedPage) return page;

        const updatedTabs = getPageTabs(page).map((tab) => ({
          ...tab,
          tasks: (tab.tasks || []).map((task) =>
            task.id === taskId ? { ...task, viewedByAssignedUser: true } : task
          ),
        }));

        return {
          ...page,
          updatedAt: Date.now(),
          tabs: updatedTabs,
          tasks: updatedTabs.flatMap((tab) => tab.tasks || []),
        };
      });

      const updatedPage = nextPages.find((page) => page.id === selectedPage);
      if (updatedPage) {
        savePageToFirestore(updatedPage);
      }

      return nextPages;
    });
  };

  const markUploadedTaskViewedByAdmin = (pageId, taskId) => {
    const page = pages.find((page) => page.id === pageId);
    const task = getPageTabs(page).flatMap((tab) => tab.tasks || []).find((task) => task.id === taskId);
    if (!task || task.uploadStatus !== "Uploaded") return;
    if (task.uploadedViewedByAdmin) return;

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) => {
        if (page.id !== pageId) return page;

        const updatedTabs = getPageTabs(page).map((tab) => ({
          ...tab,
          tasks: (tab.tasks || []).map((task) =>
            task.id === taskId ? { ...task, uploadedViewedByAdmin: true } : task
          ),
        }));

        return {
          ...page,
          updatedAt: Date.now(),
          tabs: updatedTabs,
          tasks: updatedTabs.flatMap((tab) => tab.tasks || []),
        };
      });

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
      uploadStatus: task.uploadStatus || "Not Uploaded",
      category: task.category || "Uncategorize",
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

  const createTab = () => {
    if (!canEdit || !selectedPage) return;

    const newTab = {
      id: createId(),
      title: `Tab ${getPageTabs(currentPage).length + 1}`,
      tasks: [],
    };

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) =>
        page.id === selectedPage
          ? {
              ...page,
              updatedAt: Date.now(),
              tabs: [...getPageTabs(page), newTab],
              tasks: [...getPageTabs(page).flatMap((tab) => tab.tasks || []), ...newTab.tasks],
            }
          : page
      );

      const updatedPage = nextPages.find((page) => page.id === selectedPage);
      if (updatedPage) {
        savePageToFirestore(updatedPage);
      }

      return nextPages;
    });

    setSelectedTabId(newTab.id);
  };

  const renameActiveTab = (title) => {
    if (!canEdit || !selectedPage || !activeTab) return;

    setPages((previousPages) => {
      const nextPages = previousPages.map((page) => {
        if (page.id !== selectedPage) return page;

        const updatedTabs = getPageTabs(page).map((tab) =>
          tab.id === activeTab.id ? { ...tab, title: title.trim() || activeTab.title } : tab
        );

        return {
          ...page,
          updatedAt: Date.now(),
          tabs: updatedTabs,
          tasks: updatedTabs.flatMap((tab) => tab.tasks || []),
        };
      });

      const updatedPage = nextPages.find((page) => page.id === selectedPage);
      if (updatedPage) {
        savePageToFirestore(updatedPage);
      }

      return nextPages;
    });
  };

  const handleSelectTab = (tabId) => setSelectedTabId(tabId);

  const filteredTasks = useMemo(() => {
    let result = [...sortedTasks];

    if (taskFilters.category !== "All") {
      result = result.filter((task) => task.category === taskFilters.category);
    }

    if (taskFilters.assigned !== "All") {
      const assignedFilter = taskFilters.assigned === "Assigned";
      result = result.filter((task) => Boolean(task.assignedTo) === assignedFilter); 
    } 

    if (taskFilters.upload !== "All") {
      result = result.filter((task) => task.uploadStatus === taskFilters.upload);
    }

    if (taskFilters.assigned_user !== "All") {
      result = result.filter((task) => task.assignedTo === taskFilters.assigned_user);
    }

    return result;
  }, [sortedTasks, taskFilters]);

  const taskFilterCount = filteredTasks.length;

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

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10">
        <PageEditor
          currentPage={currentPage}
          canEdit={canEdit}
          tabs={getPageTabs(currentPage)}
          activeTab={activeTab}
          onUpdatePage={updatePage}
          onCreateTab={createTab}
          onSelectTab={handleSelectTab}
          onRenameTab={renameActiveTab}
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="text-sm text-zinc-400">
                <span className="mb-1 block">Category</span>
                <select
                  value={taskFilters.category}
                  onChange={(event) => setTaskFilters((prev) => ({ ...prev, category: event.target.value }))}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="All">All</option>
                  <option value="Uncategorize">Uncategorize</option>
                  <option value="Non-CTA">Non-CTA</option>
                  <option value="CTA">CTA</option>
                </select>
              </label>

              <label className="text-sm text-zinc-400">
                <span className="mb-1 block">Assigned</span>
                <select
                  value={taskFilters.assigned}
                  onChange={(event) => setTaskFilters((prev) => ({ ...prev, assigned: event.target.value }))}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="All">All</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Unassigned">Unassigned</option>
                </select>
              </label>

              <label className="text-sm text-zinc-400">
                <span className="mb-1 block">Upload</span>
                <select
                  value={taskFilters.upload}
                  onChange={(event) => setTaskFilters((prev) => ({ ...prev, upload: event.target.value }))}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="All">All</option>
                  <option value="Not Uploaded">Not Uploaded</option>
                  <option value="Uploaded">Uploaded</option>
                </select>
              </label>

              <label className="text-sm text-zinc-400">
                <span className="mb-1 block">Assigned To</span>
                <select
                  value={taskFilters.assigned_user}
                  onChange={(event) => setTaskFilters((prev) => ({ ...prev, assigned_user: event.target.value }))}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="All">All</option>
                  {users.map((user) => {
                    if (user.role === "admin") return null;

                    return (
                      <option key={user.uid} value={user.uid}>
                        {user.name || user.email}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={addTask}
                disabled={!canEdit || !activeTab}
                className="w-full sm:w-auto rounded-2xl bg-white px-4 py-3 text-black transition hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Task
              </button>

              <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
                {taskFilterCount} result{taskFilterCount === 1 ? "" : "s"}
              </div>
            </div>
            </div>

            <TaskList
              tasks={filteredTasks}
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
          </div>
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
