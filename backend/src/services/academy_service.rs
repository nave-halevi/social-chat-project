use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;

use crate::repositories::{academy_repo, scenario_repo};

use crate::models::entities::{course::Course, section::Section, task::Task};

use crate::models::dto::{
    course::{CourseFullDto, CreateCourseRequest, UpdateCourseRequest},
    section::{CreateSectionRequest, SectionDto, UpdateSectionRequest},
    task::{CreateTaskRequest, TaskDto, UpdateTaskRequest, VideoUrlPatch},
};
use crate::utils::youtube::parse_youtube_video_id;

// =====================================================
// Courses
// =====================================================

fn map_course_write_error(error: sqlx::Error) -> AppError {
    match error {
        sqlx::Error::RowNotFound => AppError::NotFound,
        sqlx::Error::Database(database_error) if database_error.is_unique_violation() => {
            AppError::Validation("A course with this slug already exists.".to_string())
        }
        error => AppError::Database(error),
    }
}

fn map_order_write_error(error: sqlx::Error, item: &str) -> AppError {
    match error {
        sqlx::Error::RowNotFound => AppError::NotFound,
        sqlx::Error::Database(database_error) if database_error.is_unique_violation() => {
            AppError::Validation(format!("Another {item} already uses this order index."))
        }
        sqlx::Error::Database(database_error) if database_error.is_foreign_key_violation() => {
            AppError::Validation(format!(
                "The selected parent for this {item} does not exist."
            ))
        }
        error => AppError::Database(error),
    }
}

pub async fn get_courses(pool: &PgPool) -> Result<Vec<Course>, AppError> {
    Ok(academy_repo::get_published_courses(pool).await?)
}

pub async fn get_all_courses(pool: &PgPool) -> Result<Vec<Course>, AppError> {
    Ok(academy_repo::get_courses(pool).await?)
}

pub async fn get_course_by_id(pool: &PgPool, id: Uuid) -> Result<Course, AppError> {
    academy_repo::get_course_by_id(pool, id)
        .await?
        .ok_or(AppError::NotFound)
}

pub async fn get_course_full(pool: &PgPool, course_id: Uuid) -> Result<CourseFullDto, AppError> {
    let course = get_course_by_id(pool, course_id).await?;

    let section_entities = academy_repo::get_sections_by_course(pool, course_id).await?;

    let mut sections = Vec::with_capacity(section_entities.len());

    for section in section_entities {
        let task_entities = academy_repo::get_tasks_by_section(pool, section.id).await?;

        let tasks = task_entities
            .into_iter()
            .map(|task| TaskDto {
                id: task.id,
                section_id: task.section_id,
                scenario_id: task.scenario_id,
                title: task.title,
                content: task.content,
                task_type: task.task_type,
                youtube_video_id: task.youtube_video_id,
                order_index: task.order_index,
                points: task.points,
            })
            .collect();

        sections.push(SectionDto {
            id: section.id,
            title: section.title,
            order_index: section.order_index,
            tasks,
        });
    }

    sections.sort_by_key(|section| section.order_index);

    Ok(CourseFullDto {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        difficulty: course.difficulty,
        is_published: course.is_published,
        created_at: course.created_at,
        sections,
    })
}

pub async fn create_course(pool: &PgPool, req: CreateCourseRequest) -> Result<Course, AppError> {
    let title = req.title.trim();
    let slug = req.slug.trim().to_lowercase();

    if title.is_empty() {
        return Err(AppError::Validation(
            "Course title is required.".to_string(),
        ));
    }

    if slug.is_empty() {
        return Err(AppError::Validation("Course slug is required.".to_string()));
    }

    match academy_repo::create_course(
        pool,
        title,
        &slug,
        req.description.as_deref(),
        req.difficulty.as_deref(),
    )
    .await
    {
        Ok(course) => Ok(course),

        Err(sqlx::Error::Database(database_error)) if database_error.is_unique_violation() => Err(
            AppError::Validation("A course with this slug already exists.".to_string()),
        ),

        Err(error) => Err(AppError::Database(error)),
    }
}

pub async fn update_course(
    pool: &PgPool,
    id: Uuid,
    mut req: UpdateCourseRequest,
) -> Result<Course, AppError> {
    req.title = req.title.trim().to_string();
    req.slug = req.slug.trim().to_lowercase();

    if req.title.is_empty() || req.slug.is_empty() {
        return Err(AppError::Validation(
            "Course title and slug are required.".to_string(),
        ));
    }

    academy_repo::update_course(pool, id, req)
        .await
        .map_err(map_course_write_error)
}

pub async fn delete_course(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    academy_repo::delete_course(pool, id).await?;

    Ok(())
}

// =====================================================
// Sections
// =====================================================

pub async fn get_section_by_id(pool: &PgPool, id: Uuid) -> Result<Section, AppError> {
    academy_repo::get_section_by_id(pool, id)
        .await?
        .ok_or(AppError::NotFound)
}

pub async fn get_sections_by_course(
    pool: &PgPool,
    course_id: Uuid,
) -> Result<Vec<Section>, AppError> {
    Ok(academy_repo::get_sections_by_course(pool, course_id).await?)
}

pub async fn create_section(pool: &PgPool, req: CreateSectionRequest) -> Result<Section, AppError> {
    let title = req.title.trim();
    if title.is_empty() || req.order_index < 0 {
        return Err(AppError::Validation(
            "Section title is required and order index cannot be negative.".to_string(),
        ));
    }

    academy_repo::create_section(
        pool,
        req.course_id,
        title,
        req.description.as_deref(),
        req.order_index,
    )
    .await
    .map_err(|error| map_order_write_error(error, "section"))
}

pub async fn update_section(
    pool: &PgPool,
    id: Uuid,
    mut req: UpdateSectionRequest,
) -> Result<Section, AppError> {
    if let Some(title) = &req.title {
        let normalized = title.trim();
        if normalized.is_empty() {
            return Err(AppError::Validation(
                "Section title is required.".to_string(),
            ));
        }
        req.title = Some(normalized.to_string());
    }
    if req.order_index.is_some_and(|order| order < 0) {
        return Err(AppError::Validation(
            "Section order index cannot be negative.".to_string(),
        ));
    }

    academy_repo::update_section(pool, id, req)
        .await
        .map_err(|error| map_order_write_error(error, "section"))
}

pub async fn delete_section(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    academy_repo::delete_section(pool, id).await?;

    Ok(())
}

// =====================================================
// Tasks
// =====================================================

const TASK_TYPES: [&str; 3] = ["LESSON", "PRACTICE", "LAB"];

fn normalize_task_type(task_type: &str) -> Result<String, AppError> {
    let normalized = task_type.trim().to_ascii_uppercase();

    if TASK_TYPES.contains(&normalized.as_str()) {
        Ok(normalized)
    } else {
        Err(AppError::Validation(
            "Task type must be LESSON, PRACTICE, or LAB.".to_string(),
        ))
    }
}

fn video_id_from_url(video_url: &str, task_type: &str) -> Result<Option<String>, AppError> {
    let video_url = video_url.trim();
    if video_url.is_empty() {
        return Ok(None);
    }
    if task_type != "LESSON" {
        return Err(AppError::Validation(
            "Only LESSON tasks can include a YouTube video.".to_string(),
        ));
    }

    parse_youtube_video_id(video_url)
        .map(Some)
        .map_err(|error| AppError::Validation(error.to_string()))
}

pub async fn get_task_by_id(pool: &PgPool, id: Uuid) -> Result<Task, AppError> {
    academy_repo::get_task_by_id(pool, id)
        .await?
        .ok_or(AppError::NotFound)
}

pub async fn get_tasks_by_section(pool: &PgPool, section_id: Uuid) -> Result<Vec<Task>, AppError> {
    Ok(academy_repo::get_tasks_by_section(pool, section_id).await?)
}

pub async fn create_task(pool: &PgPool, mut req: CreateTaskRequest) -> Result<Task, AppError> {
    if req.title.trim().is_empty()
        || req.content.trim().is_empty()
        || req.order_index < 0
        || req.points.is_some_and(|points| points < 0)
    {
        return Err(AppError::Validation(
            "Task title and content are required; order and points cannot be negative.".to_string(),
        ));
    }
    req.task_type = normalize_task_type(&req.task_type)?;
    let youtube_video_id = match req.video_url.as_deref() {
        Some(video_url) => video_id_from_url(video_url, &req.task_type)?,
        None => None,
    };

    if req.task_type == "LAB" {
        let scenario_id = req.scenario_id.ok_or_else(|| {
            AppError::Validation("LAB tasks must reference a scenario.".to_string())
        })?;
        let scenario = scenario_repo::find_scenario_by_id(pool, scenario_id)
            .await?
            .ok_or_else(|| AppError::Validation("Selected scenario does not exist.".to_string()))?;

        if !scenario.is_active {
            return Err(AppError::Validation(
                "Inactive scenarios cannot be assigned to a new lab task.".to_string(),
            ));
        }
    }

    academy_repo::create_task(pool, req, youtube_video_id.as_deref())
        .await
        .map_err(|error| map_order_write_error(error, "task"))
}

pub async fn update_task(
    pool: &PgPool,
    id: Uuid,
    mut req: UpdateTaskRequest,
) -> Result<Task, AppError> {
    if req
        .title
        .as_deref()
        .is_some_and(|title| title.trim().is_empty())
        || req
            .content
            .as_deref()
            .is_some_and(|content| content.trim().is_empty())
        || req.order_index.is_some_and(|order| order < 0)
        || req.points.is_some_and(|points| points < 0)
    {
        return Err(AppError::Validation(
            "Task title and content cannot be empty; order and points cannot be negative."
                .to_string(),
        ));
    }
    if let Some(task_type) = &req.task_type {
        req.task_type = Some(normalize_task_type(task_type)?);
    }

    let current = get_task_by_id(pool, id).await?;
    let task_type = req
        .task_type
        .as_deref()
        .unwrap_or(&current.task_type)
        .to_string();
    let scenario_id = req.scenario_id.unwrap_or(current.scenario_id);

    if task_type != "LAB" {
        req.scenario_id = Some(None);
    } else {
        let scenario_id = scenario_id.ok_or_else(|| {
            AppError::Validation("LAB tasks must reference a scenario.".to_string())
        })?;
        let keeps_existing_inactive_scenario = current.task_type == "LAB"
            && current.scenario_id == Some(scenario_id)
            && req
                .scenario_id
                .is_none_or(|requested| requested == Some(scenario_id));

        if !keeps_existing_inactive_scenario {
            let scenario = scenario_repo::find_scenario_by_id(pool, scenario_id)
                .await?
                .ok_or_else(|| {
                    AppError::Validation("Selected scenario does not exist.".to_string())
                })?;

            if !scenario.is_active {
                return Err(AppError::Validation(
                    "Inactive scenarios cannot be assigned to a lab task.".to_string(),
                ));
            }
        }
    }

    let (update_youtube_video_id, youtube_video_id) = match &req.video_url {
        VideoUrlPatch::Missing if task_type == "LESSON" => (false, None),
        VideoUrlPatch::Missing | VideoUrlPatch::Null => (true, None),
        VideoUrlPatch::Value(video_url) => (true, video_id_from_url(video_url, &task_type)?),
    };

    academy_repo::update_task(
        pool,
        id,
        req,
        update_youtube_video_id,
        youtube_video_id.as_deref(),
    )
    .await
    .map_err(|error| map_order_write_error(error, "task"))
}

pub async fn delete_task(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    academy_repo::delete_task(pool, id).await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{normalize_task_type, video_id_from_url};
    use crate::errors::AppError;

    #[test]
    fn normalizes_allowed_task_types() {
        assert_eq!(normalize_task_type(" lesson ").unwrap(), "LESSON");
        assert_eq!(normalize_task_type("Practice").unwrap(), "PRACTICE");
        assert_eq!(normalize_task_type("LAB").unwrap(), "LAB");
    }

    #[test]
    fn rejects_unknown_task_types() {
        assert!(matches!(
            normalize_task_type("THEORY"),
            Err(AppError::Validation(_))
        ));
    }

    #[test]
    fn rejects_a_video_for_non_lesson_tasks() {
        assert!(matches!(
            video_id_from_url("https://youtu.be/dQw4w9WgXcQ", "PRACTICE"),
            Err(AppError::Validation(_))
        ));
    }

    #[test]
    fn treats_an_empty_video_url_as_no_video() {
        assert_eq!(video_id_from_url("  ", "LESSON").unwrap(), None);
    }
}
