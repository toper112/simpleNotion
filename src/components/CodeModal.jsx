export default function CodeModal({ codeInput, codeError, onChangeCodeInput, onVerify, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-zinc-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-zinc-800">
        <h2 className="text-2xl font-bold">Enter Code</h2>
        <p className="text-zinc-400">Code required to modify content</p>

        {codeError && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {codeError}
          </div>
        )}

        <input
          type="password"
          value={codeInput}
          onChange={(event) => onChangeCodeInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onVerify()}
          placeholder="Enter code"
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-center outline-none focus:border-white"
          autoFocus
        />

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="bg-zinc-700 px-4 py-3 rounded-xl">
            Cancel
          </button>
          <button onClick={onVerify} className="bg-white text-black px-4 py-3 rounded-xl font-semibold">
            Verify
          </button>
        </div>
      </div>
    </div>
  );
}
