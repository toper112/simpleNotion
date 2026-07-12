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
  category: "Uncategorize",
};

export const createDefaultPage = () => ({
  id: createId(),
  title: "My First Page",
  content: "# Welcome\n\nStart writing your tasks here...",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  createdBy: null,
  assignedTo: [],
  tabs: [],
  tasks: [],
});

export const formatPageDate = (timestamp) =>
  timestamp ? new Date(timestamp).toLocaleString() : "";
