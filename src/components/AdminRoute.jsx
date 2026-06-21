import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function AdminRoute({ children }) {
  const { user, profile, isVerified, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <span className="text-lg">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (profile?.role !== "admin") {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
