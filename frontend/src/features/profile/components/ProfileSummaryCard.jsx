import { useRef, useState } from "react";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const DICEBEAR_AVATAR_BASE_URL =
  "https://api.dicebear.com/10.x/pixel-art/svg";

function buildDiceBearAvatarUrl(seed) {
  return `${DICEBEAR_AVATAR_BASE_URL}?seed=${encodeURIComponent(seed)}`;
}

function formatDate(value) {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export default function ProfileSummaryCard({
  profile,
  avatarUrl,
  isUpdatingAvatar,
  onAvatarChange,
  onGeneratedAvatar,
  onClearMessages,
}) {
  const fileInputRef = useRef(null);
  const isGeneratingRef = useRef(false);
  const [imageError, setImageError] = useState(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const initial = (profile.user_name || profile.email || "U")
    .charAt(0)
    .toUpperCase();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Choose a PNG, JPEG, or WebP image.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Profile image must be smaller than 2 MB.");
      return;
    }

    setImageError(null);

    const reader = new FileReader();
    reader.onload = () => onAvatarChange(reader.result);
    reader.onerror = () => setImageError("The selected image could not be read.");
    reader.readAsDataURL(file);
  };

  const handleGenerateAvatar = () => {
    if (isGeneratingRef.current) return;

    isGeneratingRef.current = true;
    setIsGeneratingAvatar(true);

    const generatedAvatarUrl = buildDiceBearAvatarUrl(crypto.randomUUID());
    const image = new Image();

    image.onload = () => {
      onGeneratedAvatar(generatedAvatarUrl);
      onClearMessages();
      setImageError(null);
      setIsGeneratingAvatar(false);
      isGeneratingRef.current = false;
    };
    image.onerror = () => {
      setImageError("The random avatar could not be loaded. Please try again.");
      setIsGeneratingAvatar(false);
      isGeneratingRef.current = false;
    };
    image.src = generatedAvatarUrl;
  };

  const avatarControlsDisabled = isUpdatingAvatar || isGeneratingAvatar;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-zinc-700 bg-zinc-950">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${profile.user_name}'s profile`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-red-500">
              {initial}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="truncate text-2xl font-semibold">
              {profile.user_name}
            </h2>
            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
              {profile.role}
            </span>
          </div>

          <p className="mt-1 truncate text-zinc-400">{profile.email}</p>
          <p className="mt-3 text-sm text-zinc-500">
            Joined {formatDate(profile.created_at)}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              disabled={avatarControlsDisabled}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdatingAvatar ? "Uploading..." : "Change Image"}
            </button>

            <button
              type="button"
              disabled={avatarControlsDisabled}
              onClick={handleGenerateAvatar}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingAvatar
                ? "Generating..."
                : "Generate Random Avatar"}
            </button>

            {avatarUrl && (
              <button
                type="button"
                disabled={avatarControlsDisabled}
                onClick={() => onAvatarChange(null)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white disabled:opacity-50"
              >
                Remove Image
              </button>
            )}
          </div>

          {imageError && (
            <p className="mt-3 text-sm text-red-400">{imageError}</p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-6 py-4 text-center sm:min-w-32">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Total Score
          </p>
          <p className="mt-1 text-3xl font-bold text-emerald-400">
            {profile.total_score}
          </p>
        </div>
      </div>
    </section>
  );
}
