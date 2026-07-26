import { isValidYoutubeVideoId } from "../../../../utils/youtube";

export default function VideoWidget({ videoId }) {
  if (!isValidYoutubeVideoId(videoId)) {
    return null;
  }

  return (
    <div className="mt-6 aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
      <iframe
        className="h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title="YouTube video for this lesson"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
