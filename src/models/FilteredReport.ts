import { Report } from "./Report.js";
import { FilteredSite } from "./FilteredSite.js";

export interface FilteredReport extends Report {
  site: FilteredSite[];
}
