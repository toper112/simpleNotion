export default function TaskModal({ taskForm, onChangeTaskForm, onCancel, onSave }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-zinc-900 w-full sm:w-[90vw] md:w-[70vw] h-[95vh] md:h-[70vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-3">
        <input
          placeholder="Title"
          value={taskForm.title}
          onChange={(event) => onChangeTaskForm({ ...taskForm, title: event.target.value })}
          className="w-full p-3 bg-zinc-800 rounded-xl"
        />

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

        <div className="w-full">
          <label className="mb-2 block text-sm text-zinc-300">Upload Status</label>
          <select
            value={taskForm.uploadStatus ?? "Not Uploaded"}
            onChange={(event) => onChangeTaskForm({ ...taskForm, uploadStatus: event.target.value })}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm outline-none focus:border-white"
          >
            <option value="Not Uploaded">Not Uploaded</option>
            <option value="Uploaded">Uploaded</option>
          </select>
        </div>

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
