import { useState } from "react";

import { completeContentTask } from "../../../services/academyService";

import LearningPanel from "../panels/LearningPanel";
import MarkdownWidget from "../widgets/MarkdownWidget";
import VideoWidget from "../widgets/VideoWidget";

export default function LessonLayout({ task, onTaskCompleted }) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState(null);

  const handleComplete = async () => {
    if (!task?.id || isCompleting) {
      return;
    }

    setIsCompleting(true);
    setError(null);

    try {
      await completeContentTask(task.id);

      await onTaskCompleted?.();
    } catch (err) {
      setError(err.message || "Failed to complete lesson.");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="h-full w-full">
      <LearningPanel>
        <div className="flex min-h-full flex-col">
          <MarkdownWidget task={task} />
          <VideoWidget videoId={task?.youtube_video_id} />

          <div className="mt-auto border-t border-zinc-800 pt-6">
            {error && (
              <div className="mb-3 rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleComplete}
                disabled={isCompleting}
                className="
                  rounded-lg
                  bg-emerald-600
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  transition
                  hover:bg-emerald-500
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {isCompleting ? "Completing..." : "Complete & Continue →"}
              </button>
            </div>
          </div>
        </div>
      </LearningPanel>
    </div>
  );
}
