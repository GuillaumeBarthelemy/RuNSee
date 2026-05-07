import { useCallback, useEffect, useState } from "react";
import { getProviderStatuses } from "../services/externalProvider.service.js";

const EMPTY_STATUSES = Object.freeze({
  providers: {
    strava: {
      connected: false,
      status: "unknown",
    },
    garmin: {
      connected: false,
      status: "unknown",
    },
  },
});

export default function useProviderStatuses() {
  const [data, setData] = useState(EMPTY_STATUSES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await getProviderStatuses();
      setData(result || EMPTY_STATUSES);
      return result || EMPTY_STATUSES;
    } catch (requestError) {
      setError(
        requestError?.response?.data?.userMessage
          || requestError?.response?.data?.message
          || requestError?.message
          || "Statut des connexions indisponible.",
      );
      setData(EMPTY_STATUSES);
      return EMPTY_STATUSES;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    providers: data.providers || EMPTY_STATUSES.providers,
    isLoading,
    error,
    refresh,
  };
}
