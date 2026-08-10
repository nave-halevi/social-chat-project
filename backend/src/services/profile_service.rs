use bcrypt::{DEFAULT_COST, hash, verify};
use sqlx::PgPool;
use url::Url;
use uuid::Uuid;

use crate::{
    errors::AppError,
    models::{
        dto::profile::{
            ChangePasswordRequest, MessageResponseDto, ProfileResponseDto, UpdateAvatarRequest,
            UpdateProfileRequest,
        },
        user::Role,
    },
    repositories::profile_repo::{self, ProfileRow},
};

const MIN_USERNAME_LENGTH: usize = 3;
const MAX_USERNAME_LENGTH: usize = 50;
const MIN_PASSWORD_LENGTH: usize = 8;
const MAX_AVATAR_LENGTH: usize = 2_800_000;
const DICEBEAR_AVATAR_HOST: &str = "api.dicebear.com";
const DICEBEAR_AVATAR_PATH: &str = "/10.x/pixel-art/svg";

fn map_profile(profile: ProfileRow) -> ProfileResponseDto {
    let role = match profile.role.to_ascii_lowercase().as_str() {
        "admin" => Role::Admin,
        _ => Role::User,
    };

    ProfileResponseDto {
        id: profile.id,
        user_name: profile.user_name,
        email: profile.email,
        role,
        total_score: profile.total_score,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        avatar_url: profile.avatar_url,
    }
}

fn validate_email(email: &str) -> bool {
    if email.len() > 254 || email.chars().any(char::is_whitespace) {
        return false;
    }

    let Some((local, domain)) = email.split_once('@') else {
        return false;
    };

    !local.is_empty()
        && !domain.is_empty()
        && !domain.contains('@')
        && domain.contains('.')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
}

fn is_unique_violation(error: &sqlx::Error) -> bool {
    matches!(
        error,
        sqlx::Error::Database(database_error)
            if database_error.is_unique_violation()
    )
}

fn is_dicebear_avatar_url(value: &str) -> bool {
    let Ok(url) = Url::parse(value) else {
        return false;
    };
    let mut query_pairs = url.query_pairs();
    let has_valid_seed = matches!(
        (query_pairs.next(), query_pairs.next()),
        (Some((key, seed)), None) if key == "seed" && !seed.is_empty()
    );

    url.scheme() == "https"
        && url.host_str() == Some(DICEBEAR_AVATAR_HOST)
        && url.port().is_none()
        && url.path() == DICEBEAR_AVATAR_PATH
        && url.fragment().is_none()
        && has_valid_seed
}

fn validate_avatar(avatar_url: Option<&str>) -> Result<(), AppError> {
    let Some(avatar) = avatar_url else {
        return Ok(());
    };
    let allowed_type = avatar.starts_with("data:image/png;base64,")
        || avatar.starts_with("data:image/jpeg;base64,")
        || avatar.starts_with("data:image/webp;base64,")
        || is_dicebear_avatar_url(avatar);

    if !allowed_type {
        return Err(AppError::Validation(
            "Profile image must be a PNG, JPEG, WebP, or DiceBear image.".to_string(),
        ));
    }

    if avatar.len() > MAX_AVATAR_LENGTH {
        return Err(AppError::Validation(
            "Profile image must be smaller than 2 MB.".to_string(),
        ));
    }

    Ok(())
}

pub async fn get_profile(pool: &PgPool, user_id: Uuid) -> Result<ProfileResponseDto, AppError> {
    let profile = profile_repo::get_profile_by_user_id(pool, user_id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(map_profile(profile))
}

pub async fn update_profile(
    pool: &PgPool,
    user_id: Uuid,
    request: UpdateProfileRequest,
) -> Result<ProfileResponseDto, AppError> {
    let user_name = request.user_name.trim();
    let email = request.email.trim().to_ascii_lowercase();
    let avatar_url = request.avatar_url.as_deref().map(str::trim);
    let username_length = user_name.chars().count();

    if !(MIN_USERNAME_LENGTH..=MAX_USERNAME_LENGTH).contains(&username_length) {
        return Err(AppError::Validation(format!(
            "User name must be between {MIN_USERNAME_LENGTH} and {MAX_USERNAME_LENGTH} characters."
        )));
    }

    if !validate_email(&email) {
        return Err(AppError::Validation(
            "Enter a valid email address.".to_string(),
        ));
    }

    if profile_repo::email_belongs_to_another_user(pool, user_id, &email).await? {
        return Err(AppError::Validation(
            "This email address is already in use.".to_string(),
        ));
    }

    validate_avatar(avatar_url)?;

    let profile =
        match profile_repo::update_profile(pool, user_id, user_name, &email, avatar_url).await {
            Ok(Some(profile)) => profile,
            Ok(None) => return Err(AppError::NotFound),
            Err(error) if is_unique_violation(&error) => {
                return Err(AppError::Validation(
                    "This email address is already in use.".to_string(),
                ));
            }
            Err(error) => return Err(AppError::Database(error)),
        };

    Ok(map_profile(profile))
}

pub async fn change_password(
    pool: &PgPool,
    user_id: Uuid,
    request: ChangePasswordRequest,
) -> Result<MessageResponseDto, AppError> {
    if request.new_password != request.confirm_password {
        return Err(AppError::Validation(
            "New password and confirmation do not match.".to_string(),
        ));
    }

    if request.new_password.chars().count() < MIN_PASSWORD_LENGTH {
        return Err(AppError::Validation(format!(
            "New password must contain at least {MIN_PASSWORD_LENGTH} characters."
        )));
    }

    let password = profile_repo::get_password_hash(pool, user_id)
        .await?
        .ok_or(AppError::NotFound)?;

    let current_password_is_valid = verify(&request.current_password, &password.password_hash)
        .map_err(|_| AppError::Internal)?;

    if !current_password_is_valid {
        return Err(AppError::Unauthorized);
    }

    let password_is_unchanged =
        verify(&request.new_password, &password.password_hash).map_err(|_| AppError::Internal)?;

    if password_is_unchanged {
        return Err(AppError::Validation(
            "New password must be different from the current password.".to_string(),
        ));
    }

    let password_hash =
        hash(&request.new_password, DEFAULT_COST).map_err(|_| AppError::Internal)?;

    if !profile_repo::update_password_hash(pool, user_id, &password_hash).await? {
        return Err(AppError::NotFound);
    }

    Ok(MessageResponseDto {
        message: "Password updated successfully.".to_string(),
    })
}

pub async fn update_avatar(
    pool: &PgPool,
    user_id: Uuid,
    request: UpdateAvatarRequest,
) -> Result<ProfileResponseDto, AppError> {
    let avatar_url = request.avatar_url.as_deref().map(str::trim);
    validate_avatar(avatar_url)?;

    let profile = profile_repo::update_avatar(pool, user_id, avatar_url)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(map_profile(profile))
}

#[cfg(test)]
mod tests {
    use super::is_dicebear_avatar_url;

    #[test]
    fn accepts_the_expected_dicebear_avatar_url() {
        assert!(is_dicebear_avatar_url(
            "https://api.dicebear.com/10.x/pixel-art/svg?seed=fixed%20seed"
        ));
    }

    #[test]
    fn rejects_dicebear_avatar_url_variations() {
        for value in [
            "http://api.dicebear.com/10.x/pixel-art/svg?seed=fixed",
            "https://example.com/10.x/pixel-art/svg?seed=fixed",
            "https://api.dicebear.com/9.x/pixel-art/svg?seed=fixed",
            "https://api.dicebear.com/10.x/pixel-art/svg",
            "https://api.dicebear.com/10.x/pixel-art/svg?seed=",
            "https://api.dicebear.com/10.x/pixel-art/svg?seed=fixed&background=red",
        ] {
            assert!(!is_dicebear_avatar_url(value), "accepted {value}");
        }
    }
}
