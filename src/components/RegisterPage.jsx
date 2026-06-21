import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await register({ name, email, password });
      setStatus("Account created. Please verify your email before signing in.");
      setTimeout(() => navigate("/verify-email", { replace: true }), 700);
    } catch (err) {
      setError(err.message || "Unable to create your account.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <span className="text-lg">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <h1 className="text-3xl font-bold mb-6">Create Account</h1>

        {error && <div className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-red-200">{error}</div>}
        {status && <div className="mb-4 rounded-2xl bg-emerald-500/10 px-4 py-3 text-emerald-200">{status}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-zinc-400">
            Full name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
              required
            />
          </label>

          <label className="block text-sm text-zinc-400">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
              required
            />
          </label>

          <label className="block text-sm text-zinc-400">
            Password
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 pr-14 text-white outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-3 flex items-center text-sm text-zinc-300 hover:text-white"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label className="block text-sm text-zinc-400">
            Confirm password
            <div className="relative mt-2">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 pr-14 text-white outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute inset-y-0 right-3 flex items-center text-sm text-zinc-300 hover:text-white"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button className="w-full rounded-2xl bg-white px-4 py-3 text-black font-semibold" type="submit">
            Sign up
          </button>
        </form>

        <div className="mt-4 text-sm text-zinc-400">
          Already have an account? <Link to="/login" className="text-white underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
