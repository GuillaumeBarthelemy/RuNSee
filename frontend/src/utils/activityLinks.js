export function getActivityPublicId(activity = {}) {
  return String(
    activity?.id
      || activity?.publicId
      || activity?.stravaActivityId
      || activity?.sourceActivityId
      || "",
  ).trim();
}

export function buildActivityDetailPath(activity = {}) {
  const publicId = getActivityPublicId(activity);
  return publicId ? `/activities/${encodeURIComponent(publicId)}` : "";
}
