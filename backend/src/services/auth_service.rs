use bcrypt::{DEFAULT_COST, hash, verify};
use chrono::Utc;
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use sqlx::PgPool;

use crate::models::user::{
    Claims, LoginRequest, LoginResponse, RegisterRequest, Role, UserResponse,
};
use crate::repositories::user_repo;

pub async fn register(pool: &PgPool, req: RegisterRequest) -> Result<UserResponse, String> {
    let hashed = hash(&req.password, DEFAULT_COST).map_err(|e| e.to_string())?;

    let user = user_repo::create_user(pool, &req.user_name, &req.email, &hashed)
        .await
        .map_err(|e| e.to_string())?;

    Ok(user.into())
}

pub async fn login(pool: &PgPool, req: LoginRequest) -> Result<LoginResponse, String> {
    let user = user_repo::get_user_by_email(pool, &req.email)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Invalid credentials")?;

    let valid = verify(&req.password, &user.password_hash).map_err(|e| e.to_string())?;

    if !valid {
        return Err("Invalid credentials".to_string());
    }

    let is_active = user_repo::is_user_active(pool, user.id)
        .await
        .map_err(|e| e.to_string())?;

    if !is_active {
        return Err("This account has been disabled.".to_string());
    }

    let token = generate_token(&user.id.to_string(), user.role.clone())?;
    let user_response = user.into();

    let response = LoginResponse {
        token,
        user: user_response,
    };

    Ok(response)
}

pub fn generate_token(user_id: &str, role: Role) -> Result<String, String> {
    let claims = Claims {
        sub: user_id.to_string(),
        exp: (Utc::now().timestamp() + 86400) as usize,
        role,
    };

    let secret = std::env::var("JWT_SECRET").map_err(|e| e.to_string())?;

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )
    .map_err(|e| e.to_string())
}

pub fn verify_token(token: &str) -> Result<Claims, String> {
    let secret = std::env::var("JWT_SECRET").map_err(|e| e.to_string())?;

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|e| e.to_string())
}
