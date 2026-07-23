use crate::{models::user::UserResponse, repositories::user_repo};
use sqlx::PgPool;

pub async fn fetch_all_users(pool: &PgPool) -> Result<Vec<UserResponse>, String> {
    user_repo::get_all_users(pool)
        .await
        .map(|users| users.into_iter().map(UserResponse::from).collect())
        .map_err(|e| e.to_string())
}
