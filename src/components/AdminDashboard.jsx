import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { collection, doc, getDocs, getFirestore, query, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function AdminDashboard() {
  const { user, profile, logout, updateUserRole, disableUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, "users"));
      setUsers(usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }

    fetchUsers().catch((err) => {
      console.error(err);
      setError("Unable to load users.");
      setLoading(false);
    });
  }, []);

  const handleRoleChange = async (uid, nextRole) => {
    setError("");
    try {
      await updateUserRole(uid, nextRole);
      setUsers((prev) => prev.map((user) => (user.uid === uid ? { ...user, role: nextRole } : user)));
    } catch (err) {
      setError(err.message || "Unable to update role.");
    }
  };

  const handleStatusChange = async (uid, nextStatus) => {
    setError("");
    try {
      await disableUser(uid, nextStatus);
      setUsers((prev) => prev.map((user) => (user.uid === uid ? { ...user, status: nextStatus } : user)));
    } catch (err) {
      setError(err.message || "Unable to update status.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <span className="text-lg">Loading admin dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-zinc-400">Manage users, roles, and account status.</p>
          </div>
          <button onClick={logout} className="rounded-2xl bg-white px-4 py-3 text-black font-semibold">
            Sign Out
          </button>
        </div>

        {error && <div className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-red-200">{error}</div>}

        <div className="overflow-x-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((userItem) => (
                <tr key={userItem.uid} className="border-b border-zinc-800">
                  <td className="p-3">{userItem.name || "—"}</td>
                  <td className="p-3">{userItem.email}</td>
                  <td className="p-3">
                    <select
                      value={userItem.role}
                      onChange={(e) => handleRoleChange(userItem.uid, e.target.value)}
                      className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                      disabled={userItem.uid === user.uid}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={userItem.status}
                      onChange={(e) => handleStatusChange(userItem.uid, e.target.value)}
                      className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                      disabled={userItem.uid === user.uid}
                    >
                      <option value="active">active</option>
                      <option value="disabled">disabled</option>
                    </select>
                  </td>
                  <td className="p-3 text-zinc-400">{new Date(userItem.createdAt?.seconds ? userItem.createdAt.seconds * 1000 : Date.now()).toLocaleString()}</td>
                  <td className="p-3 text-zinc-400">{userItem.uid === user.uid ? "Current user" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
