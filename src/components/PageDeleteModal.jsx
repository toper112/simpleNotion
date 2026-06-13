export default function PageDeleteModal({
  pageTitle,
  confirmInput,
  onChangeConfirmInput,
  onCancel,
  onDelete,
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-zinc-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-zinc-800">
        <h2 className="text-2xl font-bold">Delete Page</h2>
        <p className="text-zinc-300">
          Type "DELETE" to confirm deletion of {pageTitle ? `"${pageTitle}"` : "this page"}.
        </p>

        <input
          value={confirmInput}
          onChange={(event) => onChangeConfirmInput(event.target.value)}
          placeholder="Type DELETE to confirm"
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-center outline-none focus:border-white"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="bg-zinc-700 px-4 py-3 rounded-xl">
            Cancel
          </button>
          <button
            onClick={onDelete}
            disabled={confirmInput !== "DELETE"}
            className="bg-red-500 text-white px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
