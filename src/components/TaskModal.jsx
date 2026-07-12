export default function TaskModal({ taskForm, onChangeTaskForm, onCancel, onSave, users = [] }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-zinc-900 w-full sm:w-[90vw] md:w-[70vw] h-[95vh] md:h-[70vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-3">
        <input
          placeholder="Title"
          value={taskForm.title}
          onChange={(event) => onChangeTaskForm({ ...taskForm, title: event.target.value })}
          className="w-full p-3 bg-zinc-800 rounded-xl"
        />

        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={taskForm.assignedTo || ""}
            onChange={(event) => onChangeTaskForm({ ...taskForm, assignedTo: event.target.value })}
            className="w-full p-3 bg-zinc-800 rounded-xl text-sm"
          >
            <option value="">Assign to user...</option>
            {users.map((user) => (
              <option key={user.uid} value={user.uid}>
                {user.name || user.email}
              </option>
            ))}
          </select>

          <select
            value={taskForm.category || "Uncategorize"}
            onChange={(event) => onChangeTaskForm({ ...taskForm, category: event.target.value })}
            className="w-full p-3 bg-zinc-800 rounded-xl text-sm"
          >
            <option value="Uncategorize">Uncategorize</option>
            <option value="Non-CTA">Non-CTA</option>
            <option value="CTA">CTA</option>
          </select>
        </div>

        <textarea
          placeholder="Note"
          value={taskForm.note}
          onChange={(event) => onChangeTaskForm({ ...taskForm, note: event.target.value })}
          className="w-full h-32 p-3 bg-zinc-800 rounded-xl resize-none text-sm sm:text-base"
        />

        <textarea
          placeholder="Description"
          value={taskForm.description}
          onChange={(event) => onChangeTaskForm({ ...taskForm, description: event.target.value })}
          className="w-full min-h-[250px] md:min-h-[320px] p-3 bg-zinc-800 rounded-xl text-sm sm:text-base"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="bg-zinc-700 px-4 py-3 rounded-xl">
            Cancel
          </button>
          <button onClick={onSave} className="bg-white text-black px-4 py-3 rounded-xl">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
