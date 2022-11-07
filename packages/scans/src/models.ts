export interface Report {
  site: Site[],
  updated?: unknown
}

export interface Site {
  "@name": string
  alerts?: Alert[]
}

export interface FilteredSite extends Site {
  ignoredAlerts?: Alert[]
}

export interface DifferenceSite extends FilteredSite {
  removedAlerts?: Alert[]
}

export interface Alert {
  name: string
  pluginid: string
  instances: Instance[]
}

export interface FilteredReport extends Report {
  site: FilteredSite[]
}

export interface Instance {
  uri: string
}
