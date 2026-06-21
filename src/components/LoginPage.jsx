import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function LoginPage() {
  const { login, forgotPassword, user, isVerified, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (user && isVerified) {
      navigate(from, { replace: true });
    }
  }, [user, isVerified, from, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    try {
      const appUser = await login({ email, password });
      if (appUser.emailVerified) {
        navigate(from, { replace: true });
      } else {
        navigate("/verify-email", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Unable to sign in. Please try again.");
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setStatus("");

    if (!email.trim()) {
      setError("Please enter your email address first.");
      return;
    }

    try {
      await forgotPassword(email);
      setStatus("Password reset instructions were sent to your email.");
    } catch (err) {
      setError(err.message || "Unable to send password reset email.");
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
        <h1 className="text-3xl font-bold mb-6">Sign In</h1>

        {error && <div className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-red-200">{error}</div>}
        {status && <div className="mb-4 rounded-2xl bg-emerald-500/10 px-4 py-3 text-emerald-200">{status}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button className="w-full rounded-2xl bg-white px-4 py-3 text-black font-semibold" type="submit">
            Continue
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-3 text-sm text-zinc-400">
          <button onClick={handleForgotPassword} className="text-left text-amber-400 hover:underline" type="button">
            Forgot password?
          </button>
          <span>
            New here? <Link to="/register" className="text-white underline">Create an account</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
