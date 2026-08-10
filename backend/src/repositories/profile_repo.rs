use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, sqlx::FromRow)]
pub struct ProfileRow {
    pub id: Uuid,
    pub user_name: String,
    pub email: String,
    pub role: String,
    pub total_score: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
pub struct PasswordRow {
    pub password_hash: String,
}

pub async fn get_profile_by_user_id(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<ProfileRow>, sqlx::Error> {
    sqlx::query_as::<_, ProfileRow>(
        r#"
        SELECT
            id,
            user_name,
            email,
            role,
            COALESCE((
                SELECT SUM(earned_points)::INT
                FROM user_task_progress
                WHERE user_id = users.id
            ), 0) AS total_score,
            created_at,
            updated_at,
            avatar_url
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
}

pub async fn email_belongs_to_another_user(
    pool: &PgPool,
    user_id: Uuid,
    email: &str,
) -> Result<bool, sqlx::Error> {
    let exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS (
            SELECT 1
            FROM users
            WHERE LOWER(email) = LOWER($1)
              AND id <> $2
        )
        "#,
    )
    .bind(email)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(exists)
}

pub async fn update_profile(
    pool: &PgPool,
    user_id: Uuid,
    user_name: &str,
    email: &str,
    avatar_url: Option<&str>,
) -> Result<Option<ProfileRow>, sqlx::Error> {
    sqlx::query_as::<_, ProfileRow>(
        r#"
        UPDATE users
        SET user_name = $2,
            email = $3,
            avatar_url = COALESCE($4, avatar_url),
            updated_at = NOW()
        WHERE id = $1
        RETURNING
            id,
            user_name,
            email,
            role,
            COALESCE((
                SELECT SUM(earned_points)::INT
                FROM user_task_progress
                WHERE user_id = users.id
            ), 0) AS total_score,
            created_at,
            updated_at,
            avatar_url
        "#,
    )
    .bind(user_id)
    .bind(user_name)
    .bind(email)
    .bind(avatar_url)
    .fetch_optional(pool)
    .await
}

pub async fn get_password_hash(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<PasswordRow>, sqlx::Error> {
    sqlx::query_as::<_, PasswordRow>(
        r#"
        SELECT password_hash
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
}

pub async fn update_password_hash(
    pool: &PgPool,
    user_id: Uuid,
    password_hash: &str,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"
        UPDATE users
        SET password_hash = $2,
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .bind(password_hash)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() == 1)
}

pub async fn update_avatar(
    pool: &PgPool,
    user_id: Uuid,
    avatar_url: Option<&str>,
) -> Result<Option<ProfileRow>, sqlx::Error> {
    sqlx::query_as::<_, ProfileRow>(
        r#"
        UPDATE users
        SET avatar_url = $2,
            updated_at = NOW()
        WHERE id = $1
        RETURNING
            id,
            user_name,
            email,
            role,
            COALESCE((
                SELECT SUM(earned_points)::INT
                FROM user_task_progress
                WHERE user_id = users.id
            ), 0) AS total_score,
            created_at,
            updated_at,
            avatar_url
        "#,
    )
    .bind(user_id)
    .bind(avatar_url)
    .fetch_optional(pool)
    .await
}
