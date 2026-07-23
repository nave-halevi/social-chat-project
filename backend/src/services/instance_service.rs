use chrono::{Duration, Utc};
use sqlx::PgPool;
use tokio::task;
use uuid::Uuid;

use crate::{
    models::{
        dto::lab::{CreateLabResponseDto, LabStatusResponseDto},
        status::{EnvironmentStatus, InstanceStatus},
    },
    repositories::{ctf_repo, environment_repo, instance_repo, scenario_repo, task_repo},
    services::task_progress_service,
    utils::{network, virtualbox_manager},
};

const DEFAULT_LAB_IDLE_TIMEOUT_MINUTES: i64 = 20;
const EXPIRED_LAB_CLEANUP_LIMIT: i64 = 10;

fn lab_idle_timeout_minutes() -> i64 {
    std::env::var("LAB_IDLE_TIMEOUT_MINUTES")
        .ok()
        .and_then(|value| value.parse::<i64>().ok())
        .filter(|minutes| *minutes > 0)
        .unwrap_or(DEFAULT_LAB_IDLE_TIMEOUT_MINUTES)
}

fn next_expiration() -> chrono::DateTime<Utc> {
    Utc::now() + Duration::minutes(lab_idle_timeout_minutes())
}

fn is_expired(environment: &crate::models::entities::Environment) -> bool {
    environment
        .expires_at
        .is_some_and(|expires_at| expires_at <= Utc::now())
}

pub async fn create_user_lab(
    pool: &PgPool,
    user_id: Uuid,
    scenario_id: Uuid,
) -> Result<CreateLabResponseDto, String> {
    if let Some(active_environment) = environment_repo::find_any_active_environment(pool, user_id)
        .await
        .map_err(|error| format!("Failed to check active environments: {error}"))?
    {
        if is_expired(&active_environment) {
            delete_user_lab(pool, active_environment.user_id, active_environment.id).await?;
        } else {
            if active_environment.scenario_id == scenario_id {
                return Err("You already have an active environment for this scenario".to_string());
            }

            return Err(
                "You already have an active lab. Stop it before starting another one.".to_string(),
            );
        }
    }

    let scenario = scenario_repo::find_active_scenario_by_id(pool, scenario_id)
        .await
        .map_err(|error| format!("Failed to retrieve scenario: {error}"))?
        .ok_or_else(|| "Scenario not found or inactive".to_string())?;

    let active_environment = environment_repo::find_active_environment(pool, user_id, scenario_id)
        .await
        .map_err(|error| format!("Failed to check active environments: {error}"))?;

    if active_environment.is_some() {
        return Err("You already have an active environment for this scenario".to_string());
    }

    let environment = environment_repo::create_environment(
        pool,
        user_id,
        scenario_id,
        next_expiration(),
    )
    .await
    .map_err(|error| {
        if let sqlx::Error::Database(database_error) = &error {
            if database_error.is_unique_violation() {
                return "You already have an active lab. Stop it before starting another one."
                    .to_string();
            }
        }

        format!("Failed to create environment: {error}")
    })?;

    let vm_name = format!("lab-{}-{}", user_id, Uuid::new_v4().as_simple());

    let host_ssh_port = network::get_available_port();
    let ssh_port = i32::from(host_ssh_port);

    let instance = match instance_repo::create_instance(
        pool,
        environment.id,
        &vm_name,
        ssh_port,
        true,
    )
    .await
    {
        Ok(instance) => instance,

        Err(error) => {
            let _ = environment_repo::update_environment_status(
                pool,
                environment.id,
                EnvironmentStatus::Failed,
            )
            .await;

            return Err(format!("Failed to create instance record: {error}"));
        }
    };

    let template_name = scenario.vm_template_name;
    let vm_name_for_virtualbox = vm_name.clone();

    let virtual_machine_result = task::spawn_blocking(move || -> Result<(), String> {
        virtualbox_manager::clone_vm(&template_name, &vm_name_for_virtualbox)?;

        virtualbox_manager::start_vm(&vm_name_for_virtualbox, host_ssh_port)?;

        virtualbox_manager::wait_for_ssh(host_ssh_port, std::time::Duration::from_secs(120))?;

        Ok(())
    })
    .await
    .map_err(|error| format!("VirtualBox blocking task failed: {error}"))?;

    if let Err(error) = virtual_machine_result {
        let _ =
            instance_repo::update_instance_status(pool, instance.id, InstanceStatus::Failed).await;

        let _ = environment_repo::update_environment_status(
            pool,
            environment.id,
            EnvironmentStatus::Failed,
        )
        .await;

        let vm_name_for_cleanup = vm_name.clone();

        let _ =
            task::spawn_blocking(move || virtualbox_manager::delete_vm(&vm_name_for_cleanup)).await;

        return Err(format!(
            "Failed to create or start virtual machine: {error}"
        ));
    }

    let running_instance =
        match instance_repo::update_instance_status(pool, instance.id, InstanceStatus::Running)
            .await
        {
            Ok(instance) => instance,

            Err(error) => {
                cleanup_failed_environment(pool, environment.id, instance.id, vm_name.clone())
                    .await;

                return Err(format!(
                    "VM started, but the instance status could not be updated: {error}"
                ));
            }
        };

    if let Err(error) = environment_repo::mark_environment_running(pool, environment.id).await {
        cleanup_failed_environment(pool, environment.id, running_instance.id, vm_name.clone())
            .await;

        return Err(format!(
            "VM started, but the environment status could not be updated: {error}"
        ));
    }

    Ok(CreateLabResponseDto {
        environment_id: environment.id,
        instance_id: running_instance.id,
        scenario_id,
        vm_name,
        ssh_port: running_instance.ssh_port,
        status: EnvironmentStatus::Running.as_str().to_string(),
        expires_at: environment.expires_at,
    })
}

pub async fn delete_user_lab(
    pool: &PgPool,
    user_id: Uuid,
    environment_id: Uuid,
) -> Result<(), String> {
    let environment = environment_repo::find_user_environment_by_id(pool, environment_id, user_id)
        .await
        .map_err(|error| format!("Failed to retrieve environment: {error}"))?
        .ok_or_else(|| "Environment not found".to_string())?;

    /*
        Idempotent behavior:
        deleting an already destroyed Environment is successful.
    */
    if environment.status == EnvironmentStatus::Destroyed.as_str() {
        return Ok(());
    }

    environment_repo::update_environment_status(pool, environment_id, EnvironmentStatus::Stopping)
        .await
        .map_err(|error| format!("Failed to mark environment as stopping: {error}"))?;

    let instance = instance_repo::find_by_environment_id(pool, environment_id)
        .await
        .map_err(|error| format!("Failed to retrieve instance: {error}"))?;

    /*
        An old or partially-created Environment may have no
        Instance. In that case there is no VM record to delete,
        so we can safely close the Environment.
    */
    let Some(instance) = instance else {
        environment_repo::mark_environment_destroyed(pool, environment_id)
            .await
            .map_err(|error| format!("Failed to destroy orphan environment: {error}"))?;

        return Ok(());
    };

    instance_repo::update_instance_status(pool, instance.id, InstanceStatus::Stopping)
        .await
        .map_err(|error| format!("Failed to mark instance as stopping: {error}"))?;

    let vm_name = instance.vm_name.clone();

    let deletion_result = task::spawn_blocking(move || virtualbox_manager::delete_vm(&vm_name))
        .await
        .map_err(|error| format!("VirtualBox deletion task failed: {error}"))?;

    if let Err(error) = deletion_result {
        let _ =
            instance_repo::update_instance_status(pool, instance.id, InstanceStatus::Failed).await;

        let _ = environment_repo::update_environment_status(
            pool,
            environment_id,
            EnvironmentStatus::Failed,
        )
        .await;

        return Err(format!("Failed to delete virtual machine: {error}"));
    }

    instance_repo::update_instance_status(pool, instance.id, InstanceStatus::Destroyed)
        .await
        .map_err(|error| {
            format!("VM was deleted, but instance status could not be updated: {error}")
        })?;

    environment_repo::mark_environment_destroyed(pool, environment_id)
        .await
        .map_err(|error| {
            format!("VM was deleted, but environment status could not be updated: {error}")
        })?;

    Ok(())
}

pub async fn verify_and_submit_flag(
    pool: &PgPool,
    user_id: Uuid,
    environment_id: Uuid,
    task_id: Uuid,
    submitted_flag: &str,
) -> Result<String, String> {
    let environment = environment_repo::find_user_environment_by_id(pool, environment_id, user_id)
        .await
        .map_err(|error| format!("Failed to retrieve environment: {error}"))?
        .ok_or_else(|| "Environment not found".to_string())?;

    if environment.status != EnvironmentStatus::Running.as_str() {
        return Err("The environment is not currently running".to_string());
    }

    let _ =
        environment_repo::touch_environment_activity(pool, environment.id, next_expiration()).await;

    let belongs_to_scenario =
        task_repo::task_belongs_to_scenario(pool, task_id, environment.scenario_id)
            .await
            .map_err(|error| format!("Failed to validate task scenario: {error}"))?;

    if !belongs_to_scenario {
        return Err("The task is not connected to this lab scenario".to_string());
    }

    task_progress_service::ensure_task_accessible(pool, user_id, task_id)
        .await
        .map_err(|error| match error {
            crate::errors::AppError::Forbidden => {
                "This task is locked. Complete the previous task first.".to_string()
            }

            crate::errors::AppError::NotFound => {
                "Task progress information was not found.".to_string()
            }

            other => {
                format!("Failed to validate task access: {other}")
            }
        })?;

    let normalized_flag = submitted_flag.trim();

    if normalized_flag.is_empty() {
        return Err("Flag value cannot be empty".to_string());
    }

    let flag_details = ctf_repo::get_flag(pool, environment.scenario_id, normalized_flag)
        .await
        .map_err(|error| format!("Failed to verify flag: {error}"))?;

    let (flag_id, _flag_points) = match flag_details {
        Some(details) => details,

        None => {
            return Ok("❌ Incorrect flag. Keep trying!".to_string());
        }
    };

    match ctf_repo::submit_flag_and_complete_task(pool, user_id, flag_id, task_id).await {
        Ok(result) if result.newly_solved => Ok(format!(
            "✅ Correct! You earned {} points.",
            result.earned_points
        )),

        Ok(_) => Ok("⚠️ You already submitted this flag!".to_string()),

        Err(error) => Err(format!(
            "Failed to record the flag and task completion: {error}"
        )),
    }
}

async fn cleanup_failed_environment(
    pool: &PgPool,
    environment_id: Uuid,
    instance_id: Uuid,
    vm_name: String,
) {
    let _ = task::spawn_blocking(move || virtualbox_manager::delete_vm(&vm_name)).await;

    let _ = instance_repo::update_instance_status(pool, instance_id, InstanceStatus::Failed).await;

    let _ = environment_repo::update_environment_status(
        pool,
        environment_id,
        EnvironmentStatus::Failed,
    )
    .await;
}

pub async fn get_lab_status(
    pool: &PgPool,
    user_id: Uuid,
    environment_id: Uuid,
) -> Result<LabStatusResponseDto, String> {
    let environment = environment_repo::find_user_environment_by_id(pool, environment_id, user_id)
        .await
        .map_err(|error| format!("Failed to retrieve environment: {}", error))?
        .ok_or_else(|| "Environment not found".to_string())?;

    if matches!(
        environment.status.as_str(),
        "Building" | "Running" | "Stopping"
    ) && is_expired(&environment)
    {
        delete_user_lab(pool, environment.user_id, environment.id).await?;
        return Err("Environment expired".to_string());
    }

    let instance = instance_repo::find_by_environment_id(pool, environment.id)
        .await
        .map_err(|error| format!("Failed to retrieve instance: {}", error))?;

    Ok(LabStatusResponseDto {
        environment_id: environment.id,
        scenario_id: environment.scenario_id,
        environment_status: environment.status,

        instance_id: instance.as_ref().map(|instance| instance.id),

        vm_name: instance.as_ref().map(|instance| instance.vm_name.clone()),

        ssh_port: instance.as_ref().and_then(|instance| instance.ssh_port),

        instance_status: instance.as_ref().map(|instance| instance.status.clone()),

        is_entry_point: instance.as_ref().map(|instance| instance.is_entry_point),

        created_at: environment.created_at,
        started_at: environment.started_at,
        stopped_at: environment.stopped_at,
        last_activity: environment.last_activity,
        expires_at: environment.expires_at,
    })
}

pub async fn get_active_lab(
    pool: &PgPool,
    user_id: Uuid,
    scenario_id: Uuid,
) -> Result<Option<LabStatusResponseDto>, String> {
    let environment = environment_repo::find_active_environment(pool, user_id, scenario_id)
        .await
        .map_err(|error| format!("Failed to retrieve active environment: {}", error))?;

    let Some(environment) = environment else {
        return Ok(None);
    };

    if is_expired(&environment) {
        delete_user_lab(pool, environment.user_id, environment.id).await?;
        return Ok(None);
    }

    let instance = instance_repo::find_by_environment_id(pool, environment.id)
        .await
        .map_err(|error| format!("Failed to retrieve active instance: {}", error))?;

    Ok(Some(LabStatusResponseDto {
        environment_id: environment.id,
        scenario_id: environment.scenario_id,
        environment_status: environment.status,

        instance_id: instance.as_ref().map(|instance| instance.id),

        vm_name: instance.as_ref().map(|instance| instance.vm_name.clone()),

        ssh_port: instance.as_ref().and_then(|instance| instance.ssh_port),

        instance_status: instance.as_ref().map(|instance| instance.status.clone()),

        is_entry_point: instance.as_ref().map(|instance| instance.is_entry_point),

        created_at: environment.created_at,
        started_at: environment.started_at,
        stopped_at: environment.stopped_at,
        last_activity: environment.last_activity,
        expires_at: environment.expires_at,
    }))
}

pub async fn get_any_active_lab(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<LabStatusResponseDto>, String> {
    let Some(environment) = environment_repo::find_any_active_environment(pool, user_id)
        .await
        .map_err(|error| format!("Failed to retrieve active environment: {}", error))?
    else {
        return Ok(None);
    };

    if is_expired(&environment) {
        delete_user_lab(pool, environment.user_id, environment.id).await?;
        return Ok(None);
    }

    let instance = instance_repo::find_by_environment_id(pool, environment.id)
        .await
        .map_err(|error| format!("Failed to retrieve active instance: {}", error))?;

    Ok(Some(LabStatusResponseDto {
        environment_id: environment.id,
        scenario_id: environment.scenario_id,
        environment_status: environment.status,
        instance_id: instance.as_ref().map(|instance| instance.id),
        vm_name: instance.as_ref().map(|instance| instance.vm_name.clone()),
        ssh_port: instance.as_ref().and_then(|instance| instance.ssh_port),
        instance_status: instance.as_ref().map(|instance| instance.status.clone()),
        is_entry_point: instance.as_ref().map(|instance| instance.is_entry_point),
        created_at: environment.created_at,
        started_at: environment.started_at,
        stopped_at: environment.stopped_at,
        last_activity: environment.last_activity,
        expires_at: environment.expires_at,
    }))
}

pub async fn touch_lab_activity(pool: &PgPool, environment_id: Uuid) -> Result<(), String> {
    let environment = environment_repo::find_environment_by_id(pool, environment_id)
        .await
        .map_err(|error| format!("Failed to retrieve environment: {error}"))?
        .ok_or_else(|| "Environment not found".to_string())?;

    if is_expired(&environment) {
        delete_user_lab(pool, environment.user_id, environment.id).await?;
        return Err("Environment expired".to_string());
    }

    environment_repo::touch_environment_activity(pool, environment_id, next_expiration())
        .await
        .map_err(|error| format!("Failed to refresh lab activity: {error}"))?;

    Ok(())
}

pub async fn cleanup_expired_labs(pool: &PgPool) {
    let expired_environments =
        match environment_repo::find_expired_active_environments(pool, EXPIRED_LAB_CLEANUP_LIMIT)
            .await
        {
            Ok(environments) => environments,
            Err(error) => {
                eprintln!("[Lab Cleanup] Failed to find expired labs: {error}");
                return;
            }
        };

    for environment in expired_environments {
        if let Err(error) = delete_user_lab(pool, environment.user_id, environment.id).await {
            eprintln!(
                "[Lab Cleanup] Failed to cleanup expired lab '{}': {}",
                environment.id, error
            );
        }
    }
}
