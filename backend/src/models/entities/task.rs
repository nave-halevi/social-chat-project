use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Task {
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
