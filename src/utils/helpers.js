export const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const emptyTaskForm = {
  id: null,
  title: "",
  note: "",
  description: "",
  uploadStatus: "Not Uploaded",
};

export const createDefaultPage = () => ({
  id: createId(),
  title: "My First Page",
  content: "# Welcome\n\nStart writing your tasks here...",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  createdBy: null,
  assignedTo: [],
  tasks: [
    {
      id: createId(),
      title: "Create your first task",
      note: "",
      description: "",
      done: false,
      createdAt: Date.now(),
      status: "NOT STARTED",
      assignedTo: null,
    },
  ],
});

export const formatPageDate = (timestamp) =>
  timestamp ? new Date(timestamp).toLocaleString() : "";
