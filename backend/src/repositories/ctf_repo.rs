use sqlx::{Error, PgPool};
use uuid::Uuid;

pub struct FlagSubmissionResult {
    pub newly_solved: bool,
    pub earned_points: i32,
}

pub async fn get_env_details(pool: &PgPool, env_id: Uuid) -> Result<Option<(Uuid, Uuid)>, Error> {
    let record = sqlx::query!(
        "SELECT user_id, scenario_id FROM environments WHERE id = $1",
        env_id
    )
    .fetch_optional(pool)
    .await?;

    Ok(record.map(|r| (r.user_id, r.scenario_id)))
}

pub async fn get_flag(
    pool: &PgPool,
    scenario_id: Uuid,
    flag_value: &str,
) -> Result<Option<(Uuid, i32)>, Error> {
    let record = sqlx::query!(
        "SELECT id, points FROM flags WHERE scenario_id = $1 AND flag_value = $2",
        scenario_id,
        flag_value
    )
    .fetch_optional(pool)
    .await?;

    Ok(record.map(|r| (r.id, r.points)))
}

pub async fn submit_flag_and_complete_task(
    pool: &PgPool,
    user_id: Uuid,
    flag_id: Uuid,
    task_id: Uuid,
) -> Result<FlagSubmissionResult, Error> {
    let mut transaction = pool.begin().await?;

    let inserted_flag_id = sqlx::query_scalar!(
        r#"
        INSERT INTO user_flags (user_id, flag_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, flag_id) DO NOTHING
        RETURNING id
        "#,
        user_id,
        flag_id
    )
    .fetch_optional(&mut *transaction)
    .await?;

    let progress = sqlx::query!(
        r#"
        INSERT INTO user_task_progress (
            user_id,
            task_id,
            status,
            started_at,
            completed_at,
            earned_points
        )
        SELECT
            $1,
            t.id,
            'COMPLETED',
            now(),
            now(),
            t.points
        FROM tasks t
        WHERE t.id = $2
        ON CONFLICT (user_id, task_id)
        DO UPDATE SET
            status = 'COMPLETED',
            started_at = COALESCE(
                user_task_progress.started_at,
                now()
            ),
            completed_at = COALESCE(
                user_task_progress.completed_at,
                now()
            ),
            earned_points = CASE
                WHEN user_task_progress.status = 'COMPLETED'
                    THEN user_task_progress.earned_points
                ELSE EXCLUDED.earned_points
            END
        RETURNING earned_points
        "#,
        user_id,
        task_id
    )
    .fetch_one(&mut *transaction)
    .await?;

    transaction.commit().await?;

    Ok(FlagSubmissionResult {
        newly_solved: inserted_flag_id.is_some(),
        earned_points: progress.earned_points,
    })
}
