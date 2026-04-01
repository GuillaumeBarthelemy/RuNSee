import axios from "axios";

const STRAVA_API_BASE_URL = "https://www.strava.com/api/v3";

export async function listAthleteActivities(accessToken, options = {}) {
  const response = await axios.get(`${STRAVA_API_BASE_URL}/athlete/activities`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      page: options.page ?? 1,
      per_page: options.perPage ?? 100,
      after: options.after ?? undefined,
      before: options.before ?? undefined,
    },
  });

  return {
    data: response.data,
    headers: response.headers,
  };
}

export async function getActivityById(accessToken, activityId) {
  const response = await axios.get(`${STRAVA_API_BASE_URL}/activities/${activityId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return {
    data: response.data,
    headers: response.headers,
  };
}
