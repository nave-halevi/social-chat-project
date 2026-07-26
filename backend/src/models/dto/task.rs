use serde::{Deserialize, Deserializer, Serialize};
use uuid::Uuid;

use crate::models::entities::task::Task;

#[derive(Debug, Serialize)]
pub struct TaskDto {
    pub id: Uuid,
    pub section_id: Uuid,
    pub scenario_id: Option<Uuid>,
    pub title: String,
    pub content: String,
    pub task_type: String,
    pub youtube_video_id: Option<String>,
    pub order_index: i32,
    pub points: i32,
}

#[derive(Debug, Serialize)]
pub struct TaskResponseDto {
    pub id: Uuid,
    pub section_id: Uuid,
    pub scenario_id: Option<Uuid>,
    pub title: String,
    pub content: String,
    pub task_type: String,
    pub youtube_video_id: Option<String>,
    pub order_index: i32,
    pub points: i32,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskRequest {
    pub section_id: Uuid,
    pub scenario_id: Option<Uuid>,
    pub title: String,
    pub content: String,
    pub task_type: String,
    pub video_url: Option<String>,
    pub order_index: i32,
    pub points: Option<i32>,
}

#[derive(Debug, Default, PartialEq, Eq)]
pub enum VideoUrlPatch {
    #[default]
    Missing,
    Null,
    Value(String),
}

impl<'de> Deserialize<'de> for VideoUrlPatch {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        Ok(match Option::<String>::deserialize(deserializer)? {
            Some(value) => Self::Value(value),
            None => Self::Null,
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub task_type: Option<String>,
    pub scenario_id: Option<Option<Uuid>>,
    pub order_index: Option<i32>,
    pub points: Option<i32>,
    #[serde(default)]
    pub video_url: VideoUrlPatch,
}

impl From<Task> for TaskResponseDto {
    fn from(task: Task) -> Self {
        Self {
            id: task.id,
            section_id: task.section_id,
            scenario_id: task.scenario_id,
            title: task.title,
            content: task.content,
            task_type: task.task_type,
            youtube_video_id: task.youtube_video_id,
            order_index: task.order_index,
            points: task.points,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{UpdateTaskRequest, VideoUrlPatch};

    #[test]
    fn update_video_url_distinguishes_missing_null_and_value() {
        let missing: UpdateTaskRequest = serde_json::from_str("{}").unwrap();
        let null: UpdateTaskRequest = serde_json::from_str(r#"{"video_url":null}"#).unwrap();
        let empty: UpdateTaskRequest = serde_json::from_str(r#"{"video_url":""}"#).unwrap();
        let value: UpdateTaskRequest =
            serde_json::from_str(r#"{"video_url":"https://youtu.be/dQw4w9WgXcQ"}"#).unwrap();

        assert_eq!(missing.video_url, VideoUrlPatch::Missing);
        assert_eq!(null.video_url, VideoUrlPatch::Null);
        assert_eq!(empty.video_url, VideoUrlPatch::Value(String::new()));
        assert_eq!(
            value.video_url,
            VideoUrlPatch::Value("https://youtu.be/dQw4w9WgXcQ".to_string())
        );
    }
}
