import axios from "axios";

export async function getLoggedInAthlete(accessToken) {
  const response = await axios.get("https://www.strava.com/api/v3/athlete", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}
