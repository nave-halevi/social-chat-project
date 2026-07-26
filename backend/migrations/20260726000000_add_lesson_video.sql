UPDATE tasks
SET task_type = CASE
    WHEN UPPER(BTRIM(task_type)) = 'THEORY' THEN 'LESSON'
    ELSE UPPER(BTRIM(task_type))
END
WHERE UPPER(BTRIM(task_type)) IN ('THEORY', 'LESSON', 'PRACTICE', 'LAB');

ALTER TABLE tasks
ADD COLUMN youtube_video_id VARCHAR(11) NULL;

ALTER TABLE tasks
ADD CONSTRAINT tasks_youtube_video_id_format_check
CHECK (
    youtube_video_id IS NULL
    OR youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'
);

ALTER TABLE tasks
ADD CONSTRAINT tasks_youtube_video_lesson_only_check
CHECK (
    youtube_video_id IS NULL
    OR task_type = 'LESSON'
);

ALTER TABLE tasks
ADD CONSTRAINT tasks_task_type_check
CHECK (task_type IN ('LESSON', 'PRACTICE', 'LAB'));
