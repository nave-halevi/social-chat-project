import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/auth-context";
import ChangePasswordForm from "../components/ChangePasswordForm";
import ProfileDetailsForm from "../components/ProfileDetailsForm";
import ProfileSummaryCard from "../components/ProfileSummaryCard";
import useProfile from "../hooks/useProfile";

function formatDate(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat().format(new Date(value));
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const {
    profile,
    loading,
    error,
    errorContext,
    isUpdatingProfile,
    isChangingPassword,
    isUpdatingAvatar,
    profileSuccess,
    passwordSuccess,
    reloadProfile,
    updateProfileDetails,
    updatePassword,
    updateProfileAvatar,
    clearMessages,
  } = useProfile();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return <div className="p-10 text-zinc-300">Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="p-10">
        <div className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-red-300">
          <p>{error || "Profile data was not found."}</p>
          <button
            type="button"
            onClick={reloadProfile}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-full bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="mt-2 text-zinc-400">
              Manage your account information and security settings.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="self-start rounded-lg border border-red-900 px-5 py-2.5 text-sm font-semibold text-red-400 transition hover:border-red-700 hover:bg-red-950/30 hover:text-red-300 sm:self-auto"
          >
            Logout
          </button>
        </div>

        <ProfileSummaryCard
          profile={profile}
          isUpdatingAvatar={isUpdatingAvatar}
          onAvatarChange={updateProfileAvatar}
        />

        {errorContext === "avatar" && error && (
          <div className="mt-5 rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {profileSuccess?.toLowerCase().includes("image") && (
          <div className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-300">
            {profileSuccess}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <ProfileDetailsForm
            key={profile.updated_at}
            profile={profile}
            isUpdating={isUpdatingProfile}
            error={errorContext === "profile" ? error : null}
            success={
              profileSuccess?.toLowerCase().includes("details")
                ? profileSuccess
                : null
            }
            onSubmit={updateProfileDetails}
            onClearMessages={clearMessages}
          />

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold">Account Statistics</h2>

            <dl className="mt-6 space-y-5">
              <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <dt className="text-sm text-zinc-400">Total score</dt>
                <dd className="font-semibold text-emerald-400">
                  {profile.total_score}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <dt className="text-sm text-zinc-400">Role</dt>
                <dd className="font-semibold text-zinc-200">{profile.role}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-zinc-400">Created</dt>
                <dd className="text-sm font-medium text-zinc-200">
                  {formatDate(profile.created_at)}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="mt-6">
          <ChangePasswordForm
            isUpdating={isChangingPassword}
            error={errorContext === "password" ? error : null}
            success={passwordSuccess}
            onSubmit={updatePassword}
            onClearMessages={clearMessages}
          />
        </div>
      </div>
    </main>
  );
}
