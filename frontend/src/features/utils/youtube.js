const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);

export const isValidYoutubeVideoId = (videoId) =>
  typeof videoId === "string" && YOUTUBE_VIDEO_ID_PATTERN.test(videoId);

export const parseYoutubeVideoUrl = (value) => {
  let url;

  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    return null;
  }

  let videoId = null;

  if (url.hostname === "youtu.be") {
    const match = url.pathname.match(/^\/([^/]+)$/);
    videoId = match?.[1] || null;
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    if (url.pathname === "/watch") {
      const videoIds = url.searchParams.getAll("v");
      videoId = videoIds.length === 1 ? videoIds[0] : null;
    } else {
      const match = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/);
      videoId = match?.[1] || null;
    }
  }

  return isValidYoutubeVideoId(videoId) ? videoId : null;
};
