use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::user::Role;

#[derive(Debug, Serialize)]
pub struct ProfileResponseDto {
    pub id: Uuid,
    pub user_name: String,
    pub email: String,
    pub role: Role,
    pub total_score: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub user_name: String,
    pub email: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
    pub confirm_password: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAvatarRequest {
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MessageResponseDto {
    pub message: String,
}
