import { Site } from "./Site.js";
import { Alert } from "./Alert.js";

export interface FilteredSite extends Site {
  ignoredAlerts: Alert[];
}

export function isFilteredSite(site: Site): site is FilteredSite {
  return Array.isArray((site as FilteredSite).ignoredAlerts);
}
