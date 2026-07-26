use sqlx::PgPool;
use uuid::Uuid;

use crate::models::entities::{course::Course, section::Section, task::Task};

use crate::models::dto::{
    course::UpdateCourseRequest,
    section::UpdateSectionRequest,
    task::{CreateTaskRequest, UpdateTaskRequest},
};

// =====================================================
// Courses
// =====================================================

pub async fn create_course(
    pool: &PgPool,
    title: &str,
    slug: &str,
    description: Option<&str>,
    difficulty: Option<&str>,
) -> Result<Course, sqlx::Error> {
    sqlx::query_as!(
        Course,
        r#"
        INSERT INTO courses
            (title, slug, description, difficulty, is_published)

        VALUES
            ($1, $2, $3, $4, false)

        RETURNING
            id,
            title,
            slug,
            description,
            difficulty,
            is_published,
            created_at
        "#,
        title,
        slug,
        description,
        difficulty
    )
    .fetch_one(pool)
    .await
}

pub async fn get_courses(pool: &PgPool) -> Result<Vec<Course>, sqlx::Error> {
    sqlx::query_as!(
        Course,
        r#"
        SELECT
            id,
            title,
            slug,
            description,
            difficulty,
            is_published,
            created_at

        FROM courses

        ORDER BY created_at DESC
        "#
    )
    .fetch_all(pool)
    .await
}

pub async fn get_published_courses(pool: &PgPool) -> Result<Vec<Course>, sqlx::Error> {
    sqlx::query_as!(
        Course,
        r#"
        SELECT
            id,
            title,
            slug,
            description,
            difficulty,
            is_published,
            created_at
        FROM courses
        WHERE is_published = true
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(pool)
    .await
}

pub async fn get_course_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Course>, sqlx::Error> {
    sqlx::query_as!(
        Course,
        r#"
        SELECT
            id,
            title,
            slug,
            description,
            difficulty,
            is_published,
            created_at

        FROM courses

        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(pool)
    .await
}

pub async fn update_course(
    pool: &PgPool,
    id: Uuid,
    req: UpdateCourseRequest,
) -> Result<Course, sqlx::Error> {
    sqlx::query_as!(
        Course,
        r#"
        UPDATE courses

        SET
            title = COALESCE($2, title),
            slug = COALESCE($3, slug),
            description = COALESCE($4, description),
            difficulty = COALESCE($5, difficulty),
            is_published = COALESCE($6, is_published)

        WHERE id = $1

        RETURNING
            id,
            title,
            slug,
            description,
            difficulty,
            is_published,
            created_at
        "#,
        id,
        req.title,
        req.slug,
        req.description,
        req.difficulty,
        req.is_published
    )
    .fetch_one(pool)
    .await
}

pub async fn delete_course(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        DELETE FROM courses
        WHERE id = $1
        "#,
        id
    )
    .execute(pool)
    .await?;

    Ok(())
}

// =====================================================
// Sections
// =====================================================

pub async fn create_section(
    pool: &PgPool,
    course_id: Uuid,
    title: &str,
    description: Option<&str>,
    order_index: i32,
) -> Result<Section, sqlx::Error> {
    sqlx::query_as!(
        Section,
        r#"
        INSERT INTO sections
            (course_id, title, description, order_index)

        VALUES
            ($1,$2,$3,$4)

        RETURNING
            id,
            course_id,
            title,
            description,
            order_index
        "#,
        course_id,
        title,
        description,
        order_index
    )
    .fetch_one(pool)
    .await
}

pub async fn get_section_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Section>, sqlx::Error> {
    sqlx::query_as!(
        Section,
        r#"
        SELECT
            id,
            course_id,
            title,
            description,
            order_index

        FROM sections

        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(pool)
    .await
}

pub async fn get_sections_by_course(
    pool: &PgPool,
    course_id: Uuid,
) -> Result<Vec<Section>, sqlx::Error> {
    sqlx::query_as!(
        Section,
        r#"
        SELECT
            id,
            course_id,
            title,
            description,
            order_index

        FROM sections

        WHERE course_id = $1

        ORDER BY order_index
        "#,
        course_id
    )
    .fetch_all(pool)
    .await
}

pub async fn update_section(
    pool: &PgPool,
    id: Uuid,
    req: UpdateSectionRequest,
) -> Result<Section, sqlx::Error> {
    sqlx::query_as!(
        Section,
        r#"
        UPDATE sections

        SET
            title = COALESCE($2,title),
            description = COALESCE($3,description),
            order_index = COALESCE($4,order_index)

        WHERE id = $1

        RETURNING
            id,
            course_id,
            title,
            description,
            order_index
        "#,
        id,
        req.title,
        req.description,
        req.order_index
    )
    .fetch_one(pool)
    .await
}

pub async fn delete_section(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        DELETE FROM sections
        WHERE id=$1
        "#,
        id
    )
    .execute(pool)
    .await?;

    Ok(())
}

// =====================================================
// Tasks
// =====================================================

pub async fn create_task(
    pool: &PgPool,
    req: CreateTaskRequest,
    youtube_video_id: Option<&str>,
) -> Result<Task, sqlx::Error> {
    sqlx::query_as::<_, Task>(
        r#"
        INSERT INTO tasks
            (
                section_id,
                scenario_id,
                title,
                content,
                task_type,
                youtube_video_id,
                order_index,
                points
            )

        VALUES
            ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,10))


        RETURNING
            id,
            section_id,
            scenario_id,
            title,
            content,
            task_type,
            youtube_video_id,
            order_index,
            points
        "#,
    )
    .bind(req.section_id)
    .bind(req.scenario_id)
    .bind(req.title)
    .bind(req.content)
    .bind(req.task_type)
    .bind(youtube_video_id)
    .bind(req.order_index)
    .bind(req.points)
    .fetch_one(pool)
    .await
}

pub async fn get_task_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Task>, sqlx::Error> {
    sqlx::query_as::<_, Task>(
        r#"
        SELECT
            id,
            section_id,
            scenario_id,
            title,
            content,
            task_type,
            youtube_video_id,
            order_index,
            points

        FROM tasks

        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn get_tasks_by_section(
    pool: &PgPool,
    section_id: Uuid,
) -> Result<Vec<Task>, sqlx::Error> {
    sqlx::query_as::<_, Task>(
        r#"
        SELECT
            id,
            section_id,
            scenario_id,
            title,
            content,
            task_type,
            youtube_video_id,
            order_index,
            points

        FROM tasks

        WHERE section_id = $1

        ORDER BY order_index
        "#,
    )
    .bind(section_id)
    .fetch_all(pool)
    .await
}

pub async fn update_task(
    pool: &PgPool,
    id: Uuid,
    req: UpdateTaskRequest,
    update_youtube_video_id: bool,
    youtube_video_id: Option<&str>,
) -> Result<Task, sqlx::Error> {
    sqlx::query_as::<_, Task>(
        r#"
        UPDATE tasks

        SET

            title = COALESCE($2,title),

            content = COALESCE($3,content),

            task_type = COALESCE($4,task_type),

            scenario_id = CASE WHEN $5 THEN $6 ELSE scenario_id END,

            order_index = COALESCE($7,order_index),

            points = COALESCE($8,points),

            youtube_video_id = CASE
                WHEN $9 THEN $10
                ELSE youtube_video_id
            END

        WHERE id = $1


        RETURNING

            id,
            section_id,
            scenario_id,
            title,
            content,
            task_type,
            youtube_video_id,
            order_index,
            points
        "#,
    )
    .bind(id)
    .bind(req.title)
    .bind(req.content)
    .bind(req.task_type)
    .bind(req.scenario_id.is_some())
    .bind(req.scenario_id.flatten())
    .bind(req.order_index)
    .bind(req.points)
    .bind(update_youtube_video_id)
    .bind(youtube_video_id)
    .fetch_one(pool)
    .await
}

pub async fn delete_task(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        DELETE FROM tasks

        WHERE id = $1
        "#,
        id
    )
    .execute(pool)
    .await?;

    Ok(())
}
