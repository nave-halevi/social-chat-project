import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../../context/auth-context";
import AdminHeader from "../components/AdminHeader";
import AdminTable from "../components/AdminTable";
import ConfirmActionModal from "../components/ConfirmActionModal";
import useAdminUserDetails from "../hooks/useAdminUserDetails";
import {
  resetAdminUserPassword,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "../services/adminService";
import { Page } from "./AdminOverviewPage";

const fmt = (value) => (value ? new Date(value).toLocaleString() : "—");

export default function AdminUserDetailsPage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const { data, loading, error, reload } = useAdminUserDetails(userId);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [passwords, setPasswords] = useState({ new_password: "", confirm_password: "" });

  if (loading) return <Page>Loading user...</Page>;
  if (error) return <Page><p className="text-red-400">{error}</p></Page>;
  if (!data) return <Page><p className="text-red-400">User not found.</p></Page>;

  const { user, activity, recent_labs: recentLabs } = data;
  const isSelf = currentUser?.id === user.id;

  const runAction = async () => {
    setBusy(true);
    setActionError(null);
    setMessage(null);
    try {
      if (confirm.type === "status") {
        await updateAdminUserStatus(user.id, { is_active: !user.is_active });
      }
      if (confirm.type === "role") {
        await updateAdminUserRole(user.id, { role: user.role === "Admin" ? "User" : "Admin" });
      }
      setConfirm(null);
      setMessage("User updated successfully.");
      await reload();
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setBusy(true);
    setActionError(null);
    setMessage(null);
    try {
      const response = await resetAdminUserPassword(user.id, passwords);
      setMessage(response.message);
      setPasswords({ new_password: "", confirm_password: "" });
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Link to="/admin/users" className="text-sm text-zinc-400">← Users</Link>
      <div className="mt-4">
        <AdminHeader title={user.user_name} description="Account details, activity, and safe administration actions." />
      </div>

      {message && <p className="mb-4 text-emerald-400">{message}</p>}
      {actionError && <p className="mb-4 text-red-400">{actionError}</p>}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-xl">
              {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : user.user_name[0]?.toUpperCase()}
            </span>
            <div>
              <h2 className="text-xl font-semibold">{user.user_name}</h2>
              <p className="text-sm text-zinc-400">{user.email}</p>
            </div>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Info label="Role" value={user.role} />
            <Info label="Status" value={user.is_active ? "Active" : "Disabled"} tone={user.is_active ? "text-emerald-400" : "text-red-400"} />
            <Info label="Total score" value={user.total_score} />
            <Info label="Joined" value={fmt(user.created_at)} />
            <Info label="Updated" value={fmt(user.updated_at)} />
            <Info label="User ID" value={user.id} mono />
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="font-semibold">Actions</h3>
          <div className="mt-4 space-y-3">
            <button
              disabled={isSelf}
              onClick={() => setConfirm({ type: "status" })}
              className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              {user.is_active ? "Disable User" : "Enable User"}
            </button>
            <button
              disabled={isSelf}
              onClick={() => setConfirm({ type: "role" })}
              className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              {user.role === "Admin" ? "Demote to User" : "Promote to Admin"}
            </button>
          </div>

          <form onSubmit={resetPassword} className="mt-5 space-y-3 border-t border-zinc-800 pt-5">
            <h3 className="font-semibold">Reset Password</h3>
            <input
              type="password"
              minLength="8"
              required
              disabled={isSelf}
              value={passwords.new_password}
              onChange={(event) => setPasswords({ ...passwords, new_password: event.target.value })}
              placeholder="Temporary password"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <input
              type="password"
              minLength="8"
              required
              disabled={isSelf}
              value={passwords.confirm_password}
              onChange={(event) => setPasswords({ ...passwords, confirm_password: event.target.value })}
              placeholder="Confirm temporary password"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <button disabled={busy || isSelf} className="rounded-lg bg-red-600 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50">
              Reset Password
            </button>
          </form>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="font-semibold">Activity Summary</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Info label="Courses" value={activity.courses_with_progress} />
          <Info label="Started tasks" value={activity.started_tasks} />
          <Info label="Completed tasks" value={activity.completed_tasks} />
          <Info label="Solved flags" value={activity.solved_flags} />
          <Info label="Active labs" value={activity.active_labs} />
        </div>
      </section>

      <section className="mt-6">
        <h3 className="mb-3 font-semibold">Recent Labs</h3>
        {!recentLabs.length ? (
          <p className="rounded-lg border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">No labs found for this user.</p>
        ) : (
          <AdminTable headers={["Scenario", "Environment", "Instance", "VM", "Created"]}>
            {recentLabs.map((lab) => (
              <tr key={lab.environment_id}>
                <td className="px-4 py-3">{lab.scenario_title}</td>
                <td className="px-4 py-3">{lab.environment_status}</td>
                <td className="px-4 py-3">{lab.instance_status || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-400">{lab.vm_name || "—"}</td>
                <td className="px-4 py-3 text-zinc-400">{fmt(lab.created_at)}</td>
              </tr>
            ))}
          </AdminTable>
        )}
      </section>

      <ConfirmActionModal
        open={!!confirm}
        title={confirm?.type === "role" ? "Change user role?" : "Change account status?"}
        message="This action affects the user's current permissions immediately."
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={runAction}
      />
    </Page>
  );
}

function Info({ label, value, tone = "text-white", mono = false }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-zinc-500">{label}</dt>
      <dd className={`mt-1 break-words ${tone} ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
