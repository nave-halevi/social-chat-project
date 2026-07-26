import { useMemo, useState } from "react";

import { parseYoutubeVideoUrl } from "../../utils/youtube";

export default function TaskForm({
  task,
  scenarios,
  onSave,
  onCancel,
  busy,
  error,
}) {
  const [form, setForm] = useState({
    title: task?.title || "",
    content: task?.content || "",
    task_type: task?.task_type || "LESSON",
    order_index: task?.order_index ?? 1,
    points: task?.points ?? 10,
    scenario_id: task?.scenario_id || "",
    video_url: task?.youtube_video_id
      ? `https://www.youtube.com/watch?v=${task.youtube_video_id}`
      : "",
  });
  const [videoError, setVideoError] = useState(null);

  const scenarioOptions = useMemo(() => {
    const activeScenarios = scenarios.filter((scenario) => scenario.is_active);
    const currentScenario = scenarios.find(
      (scenario) => scenario.id === task?.scenario_id,
    );

    if (currentScenario && !currentScenario.is_active) {
      return [currentScenario, ...activeScenarios];
    }

    return activeScenarios;
  }, [scenarios, task?.scenario_id]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "video_url") {
      setVideoError(null);
    }
    if (name === "task_type" && value !== "LESSON") {
      setVideoError(null);
    }

    setForm((current) => {
      if (name === "task_type" && value !== "LESSON") {
        return {
          ...current,
          task_type: value,
          video_url: "",
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const videoUrl = form.video_url.trim();
    if (
      form.task_type === "LESSON" &&
      videoUrl &&
      !parseYoutubeVideoUrl(videoUrl)
    ) {
      setVideoError(
        "Enter a valid HTTPS YouTube watch, youtu.be, embed, or shorts URL.",
      );
      return;
    }

    setVideoError(null);
    onSave({
      ...form,
      order_index: Number(form.order_index),
      points: Number(form.points),
      scenario_id:
        form.task_type === "LAB" ? form.scenario_id || null : null,
      video_url: form.task_type === "LESSON" ? videoUrl || null : null,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-4"
    >
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid gap-3 md:grid-cols-4">
        <input
          required
          name="title"
          placeholder="Task title"
          value={form.title}
          onChange={handleChange}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        />
        <select
          name="task_type"
          value={form.task_type}
          onChange={handleChange}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        >
          <option>LESSON</option>
          <option>PRACTICE</option>
          <option>LAB</option>
        </select>
        <input
          name="order_index"
          type="number"
          min="0"
          value={form.order_index}
          onChange={handleChange}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        />
        <input
          name="points"
          type="number"
          min="0"
          value={form.points}
          onChange={handleChange}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        />
      </div>

      {form.task_type === "LAB" && (
        <select
          required
          name="scenario_id"
          value={form.scenario_id}
          onChange={handleChange}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        >
          <option value="">Select scenario</option>
          {scenarioOptions.map((scenario) => (
            <option
              key={scenario.id}
              value={scenario.id}
              disabled={!scenario.is_active}
            >
              {scenario.title}
              {!scenario.is_active ? " (Inactive)" : ""}
            </option>
          ))}
        </select>
      )}

      {form.task_type === "LESSON" && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-300">
            YouTube URL
          </span>
          <input
            name="video_url"
            type="text"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={form.video_url}
            onChange={handleChange}
            aria-invalid={Boolean(videoError)}
            aria-describedby={videoError ? "task-video-error" : undefined}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
          {videoError && (
            <p id="task-video-error" className="mt-1 text-sm text-red-400">
              {videoError}
            </p>
          )}
        </label>
      )}

      <textarea
        required
        name="content"
        placeholder="Task content"
        value={form.content}
        onChange={handleChange}
        className="min-h-32 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3"
      />

      <div className="flex gap-2">
        <button
          disabled={busy}
          className="rounded-lg bg-red-600 px-3 py-2"
        >
          Save Task
        </button>
        <button type="button" onClick={onCancel} className="px-3">
          Cancel
        </button>
      </div>
    </form>
  );
}
