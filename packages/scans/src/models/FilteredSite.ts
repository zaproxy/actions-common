import { Site } from "./Site";
import { Alert } from "./Alert";

export interface FilteredSite extends Site {
  ignoredAlerts: Alert[];
}

export function isFilteredSite(site: Site): site is FilteredSite {
  return Array.isArray((site as FilteredSite).ignoredAlerts);
}
