export interface Report {
  site: Site[];
  updated?: unknown;
}

export interface Site {
  "@name": string;
  alerts?: Alert[];
}

export interface FilteredSite extends Site {
  ignoredAlerts: Alert[];
}

export function isFilteredSite(site: Site): site is FilteredSite {
  return Array.isArray((site as FilteredSite).ignoredAlerts);
}

export interface DifferenceSite extends FilteredSite {
  /** Alerts that are not in the current report but were in the last one */
  removedAlerts: Alert[];
}

export function isDifferenceSite(site: Site): site is DifferenceSite {
  return Array.isArray((site as DifferenceSite).removedAlerts);
}

export interface Alert {
  name: string;
  pluginid: string;
  instances: Instance[];
}

export interface FilteredReport extends Report {
  site: FilteredSite[];
}

export interface Instance {
  uri: string;
}
