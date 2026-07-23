import { useCallback, useEffect, useState } from "react";

import { getDashboard } from "../services/dashboardService";

export default function useDashboard() {
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getDashboard();

      setDashboard(data);

      return data;
    } catch (requestError) {
      setError(requestError.message || "Failed to load dashboard.");

      throw requestError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getDashboard()
      .then((data) => {
        if (!cancelled) {
          setDashboard(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message || "Failed to load dashboard.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    dashboard,
    loading,
    error,
    reloadDashboard: loadDashboard,
  };
}
