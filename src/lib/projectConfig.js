/**
 * Resolves the configuration of a project for a given season.
 * If a season-specific override exists, it uses it.
 * Otherwise, it falls back to the default/global project configuration.
 */
export function getProjectConfigForSeason(project, seasonName) {
  if (!project) return null;

  // If seasonName is not provided, fallback directly to project values
  if (!seasonName) {
    return {
      start_date: project.start_date,
      season_duration_months: project.season_duration_months || 12,
      monthly_photos_target: project.monthly_photos_target || 10,
      monthly_posts_target: project.monthly_posts_target || 4,
      override_season_rules: project.override_season_rules || false,
      custom_video_months: Array.isArray(project.custom_video_months) ? project.custom_video_months : [],
      custom_campaign_requirements: Array.isArray(project.custom_campaign_requirements) ? project.custom_campaign_requirements : [],
      status: project.status || "activo"
    };
  }

  const config = project.project_season_configs?.find(
    (c) => (c.season_name || "").trim() === seasonName.trim()
  );

  return {
    start_date: config?.start_date !== undefined && config?.start_date !== null 
      ? config.start_date 
      : project.start_date,
    season_duration_months: config?.season_duration_months !== undefined && config?.season_duration_months !== null 
      ? config.season_duration_months 
      : (project.season_duration_months || 12),
    monthly_photos_target: config?.monthly_photos_target !== undefined && config?.monthly_photos_target !== null 
      ? config.monthly_photos_target 
      : (project.monthly_photos_target || 10),
    monthly_posts_target: config?.monthly_posts_target !== undefined && config?.monthly_posts_target !== null 
      ? config.monthly_posts_target 
      : (project.monthly_posts_target || 4),
    override_season_rules: config?.override_season_rules !== undefined && config?.override_season_rules !== null 
      ? config.override_season_rules 
      : (project.override_season_rules || false),
    custom_video_months: config?.custom_video_months !== undefined && config?.custom_video_months !== null 
      ? (Array.isArray(config.custom_video_months) ? config.custom_video_months : [])
      : (Array.isArray(project.custom_video_months) ? project.custom_video_months : []),
    custom_campaign_requirements: config?.custom_campaign_requirements !== undefined && config?.custom_campaign_requirements !== null 
      ? (Array.isArray(config.custom_campaign_requirements) ? config.custom_campaign_requirements : [])
      : (Array.isArray(project.custom_campaign_requirements) ? project.custom_campaign_requirements : []),
    status: config?.status !== undefined && config?.status !== null 
      ? config.status 
      : (project.status || "activo")
  };
}
