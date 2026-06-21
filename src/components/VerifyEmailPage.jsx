import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function VerifyEmailPage() {
  const { user, resendVerificationEmail, logout, loading } = useAuth();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !loading) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleResend = async () => {
    setError("");
    setStatus("");

    try {
      await resendVerificationEmail();
      setStatus("Verification email sent. Please check your inbox.");
    } catch (err) {
      setError(err.message || "Unable to resend verification email.");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
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
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-10 shadow-xl text-center">
        <h1 className="text-3xl font-bold mb-4">Verify Your Email</h1>
        <p className="mb-6 text-zinc-400">
          A verification link has been sent to your email. Please verify your address before continuing.
        </p>

        {error && <div className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-red-200">{error}</div>}
        {status && <div className="mb-4 rounded-2xl bg-emerald-500/10 px-4 py-3 text-emerald-200">{status}</div>}

        <div className="space-y-3">
          <button onClick={handleResend} className="w-full rounded-2xl bg-white px-4 py-3 text-black font-semibold">
            Resend Verification Email
          </button>
          <button onClick={handleLogout} className="w-full rounded-2xl border border-zinc-700 px-4 py-3 text-zinc-200">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
