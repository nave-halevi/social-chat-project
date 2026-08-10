import { useMemo, useState } from "react";

import Input from "../../../shared/ui/Input";

export default function ProfileDetailsForm({
  profile,
  avatarUrl,
  hasAvatarChanges,
  isUpdating,
  error,
  success,
  onSubmit,
  onClearMessages,
}) {
  const [userName, setUserName] = useState(profile.user_name);
  const [email, setEmail] = useState(profile.email);

  const hasChanges = useMemo(
    () =>
      hasAvatarChanges ||
      userName.trim() !== profile.user_name ||
      email.trim().toLowerCase() !== profile.email,
    [email, hasAvatarChanges, profile.email, profile.user_name, userName],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasChanges) return;

    const payload = { user_name: userName, email };

    if (hasAvatarChanges) {
      payload.avatar_url = avatarUrl;
    }

    await onSubmit(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-semibold">Personal Information</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Update the name and email shown on your account.
      </p>

      <div className="mt-6 space-y-5">
        <Input
          label="User name"
          value={userName}
          minLength={3}
          maxLength={50}
          required
          disabled={isUpdating}
          onChange={(event) => {
            setUserName(event.target.value);
            onClearMessages();
          }}
        />

        <Input
          label="Email"
          type="email"
          value={email}
          required
          disabled={isUpdating}
          onChange={(event) => {
            setEmail(event.target.value);
            onClearMessages();
          }}
        />
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={!hasChanges || isUpdating}
        className="mt-6 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUpdating ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
