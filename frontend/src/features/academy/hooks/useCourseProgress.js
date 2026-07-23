import { useCallback, useEffect, useState } from "react";

import { getCourseProgress } from "../services/academyService";

export default function useCourseProgress(courseId) {
  const [progress, setProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState(null);

  const loadProgress = useCallback(async () => {
    if (!courseId) {
      setProgress(null);
      setProgressLoading(false);
      return;
    }

    setProgressLoading(true);
    setProgressError(null);

    try {
      const data = await getCourseProgress(courseId);
      setProgress(data);
      return data;
      
    } catch (error) {
      setProgressError(error.message || "Failed to load course progress");

      throw error;
    } finally {
      setProgressLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;

    if (!courseId) {
      return undefined;
    }

    Promise.resolve()
      .then(() => {
        if (cancelled) {
          return null;
        }

        setProgressLoading(true);
        setProgressError(null);

        return getCourseProgress(courseId);
      })
      .then((data) => {
        if (!cancelled && data) {
          setProgress(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setProgressError(error.message || "Failed to load course progress");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setProgressLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return {
    progress,
    progressLoading,
    progressError,
    reloadProgress: loadProgress,
  };
}
