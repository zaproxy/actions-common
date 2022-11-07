import { FilteredSite } from "./FilteredSite";
import { Site } from "./Site";
import { Alert } from "./Alert";

export interface DifferenceSite extends FilteredSite {
  /** Alerts that are not in the current report but were in the last one */
  removedAlerts: Alert[];
}

export function isDifferenceSite(site: Site): site is DifferenceSite {
  return Array.isArray((site as DifferenceSite).removedAlerts);
}
