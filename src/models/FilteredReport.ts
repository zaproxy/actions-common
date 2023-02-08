import { Report } from "./Report";
import { FilteredSite } from "./FilteredSite";

export interface FilteredReport extends Report {
  site: FilteredSite[];
}
