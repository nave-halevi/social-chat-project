use thiserror::Error;
use url::Url;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum YouTubeUrlError {
    #[error("The video URL is not a valid URL.")]
    InvalidUrl,

    #[error("The video URL must use HTTPS.")]
    InvalidScheme,

    #[error("The video URL must use a supported YouTube domain.")]
    InvalidDomain,

    #[error("The video URL is not a supported YouTube video URL.")]
    UnsupportedFormat,

    #[error("The YouTube video ID must contain exactly 11 valid characters.")]
    InvalidVideoId,
}

pub fn parse_youtube_video_id(value: &str) -> Result<String, YouTubeUrlError> {
    let url = Url::parse(value.trim()).map_err(|_| YouTubeUrlError::InvalidUrl)?;

    if url.scheme() != "https" {
        return Err(YouTubeUrlError::InvalidScheme);
    }

    if url.port().is_some_and(|port| port != 443) {
        return Err(YouTubeUrlError::InvalidDomain);
    }

    if !url.username().is_empty() || url.password().is_some() {
        return Err(YouTubeUrlError::InvalidDomain);
    }

    let host = url.host_str().ok_or(YouTubeUrlError::InvalidDomain)?;
    let video_id = match host {
        "youtu.be" => single_path_segment(&url)?,
        "youtube.com" | "www.youtube.com" | "m.youtube.com" => youtube_domain_video_id(&url)?,
        _ => return Err(YouTubeUrlError::InvalidDomain),
    };

    if is_valid_video_id(&video_id) {
        Ok(video_id)
    } else {
        Err(YouTubeUrlError::InvalidVideoId)
    }
}

fn youtube_domain_video_id(url: &Url) -> Result<String, YouTubeUrlError> {
    if url.path() == "/watch" {
        let mut video_ids = url
            .query_pairs()
            .filter_map(|(key, value)| (key == "v").then_some(value));
        let video_id = video_ids.next().ok_or(YouTubeUrlError::UnsupportedFormat)?;

        if video_ids.next().is_some() {
            return Err(YouTubeUrlError::UnsupportedFormat);
        }

        return if is_valid_video_id(&video_id) {
            Ok(video_id.into_owned())
        } else {
            Err(YouTubeUrlError::InvalidVideoId)
        };
    }

    let segments: Vec<_> = url
        .path_segments()
        .ok_or(YouTubeUrlError::UnsupportedFormat)?
        .collect();

    match segments.as_slice() {
        ["embed" | "shorts", video_id] => Ok((*video_id).to_string()),
        _ => Err(YouTubeUrlError::UnsupportedFormat),
    }
}

fn single_path_segment(url: &Url) -> Result<String, YouTubeUrlError> {
    let segments: Vec<_> = url
        .path_segments()
        .ok_or(YouTubeUrlError::UnsupportedFormat)?
        .collect();

    match segments.as_slice() {
        [video_id] if !video_id.is_empty() => Ok((*video_id).to_string()),
        _ => Err(YouTubeUrlError::UnsupportedFormat),
    }
}

fn is_valid_video_id(value: &str) -> bool {
    value.len() == 11
        && value
            .bytes()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, b'_' | b'-'))
}

#[cfg(test)]
mod tests {
    use super::{YouTubeUrlError, parse_youtube_video_id};

    const VIDEO_ID: &str = "dQw4w9WgXcQ";

    #[test]
    fn parses_supported_youtube_urls() {
        let urls = [
            "https://youtube.com/watch?v=dQw4w9WgXcQ",
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtu.be/dQw4w9WgXcQ",
            "https://youtube.com/embed/dQw4w9WgXcQ",
            "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        ];

        for url in urls {
            assert_eq!(parse_youtube_video_id(url).as_deref(), Ok(VIDEO_ID));
        }
    }

    #[test]
    fn allows_additional_query_parameters() {
        let urls = [
            "https://www.youtube.com/watch?feature=shared&v=dQw4w9WgXcQ&t=30",
            "https://youtu.be/dQw4w9WgXcQ?si=example",
            "https://m.youtube.com/embed/dQw4w9WgXcQ?start=10",
            "https://youtube.com/shorts/dQw4w9WgXcQ?feature=share",
        ];

        for url in urls {
            assert_eq!(parse_youtube_video_id(url).as_deref(), Ok(VIDEO_ID));
        }
    }

    #[test]
    fn rejects_http_urls() {
        assert_eq!(
            parse_youtube_video_id("http://youtube.com/watch?v=dQw4w9WgXcQ"),
            Err(YouTubeUrlError::InvalidScheme)
        );
    }

    #[test]
    fn rejects_impersonating_domains() {
        let urls = [
            "https://youtube.com.example.org/watch?v=dQw4w9WgXcQ",
            "https://youtube.com:444/watch?v=dQw4w9WgXcQ",
            "https://youtube.com@example.org/watch?v=dQw4w9WgXcQ",
        ];

        for url in urls {
            assert_eq!(
                parse_youtube_video_id(url),
                Err(YouTubeUrlError::InvalidDomain)
            );
        }
    }

    #[test]
    fn rejects_invalid_video_ids() {
        let urls = [
            "https://youtu.be/short",
            "https://youtube.com/watch?v=dQw4w9WgXc!",
            "https://youtube.com/embed/dQw4w9WgXc%20",
        ];

        for url in urls {
            assert!(matches!(
                parse_youtube_video_id(url),
                Err(YouTubeUrlError::InvalidVideoId)
            ));
        }
    }

    #[test]
    fn rejects_non_youtube_sites() {
        assert_eq!(
            parse_youtube_video_id("https://example.org/watch?v=dQw4w9WgXcQ"),
            Err(YouTubeUrlError::InvalidDomain)
        );
    }

    #[test]
    fn rejects_unsupported_paths() {
        let urls = [
            "https://youtube.com/dQw4w9WgXcQ",
            "https://youtu.be/dQw4w9WgXcQ/extra",
            "https://youtube.com/watch?v=dQw4w9WgXcQ&v=abcdefghijk",
        ];

        for url in urls {
            assert!(parse_youtube_video_id(url).is_err());
        }
    }
}
