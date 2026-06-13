export default function TaskDeleteModal({ taskTitle, onCancel, onDelete }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-zinc-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-zinc-800">
        <h2 className="text-2xl font-bold">Confirm delete</h2>
        <p className="text-zinc-300">
          Are you sure you want to delete this task?
          {taskTitle && (
            <span className="font-semibold text-white"> "{taskTitle}"</span>
          )}
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="bg-zinc-700 px-4 py-3 rounded-xl">
            Cancel
          </button>
          <button onClick={onDelete} className="bg-red-500 text-white px-4 py-3 rounded-xl">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
