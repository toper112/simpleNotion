import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-10 text-center shadow-xl">
        <h1 className="text-4xl font-bold mb-4">Unauthorized</h1>
        <p className="mb-6 text-zinc-400">
          You do not have permission to access this page. Please contact an administrator if you think this is an error.
        </p>
        <Link to="/" className="inline-flex rounded-2xl bg-white px-5 py-3 text-black font-semibold">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
