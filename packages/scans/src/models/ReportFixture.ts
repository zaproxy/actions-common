import { Report } from "./Report";
import { SiteFixture } from "./SiteFixture";

export class ReportFixture implements Report {
  site = [new SiteFixture()];

  constructor(override: Partial<Report> = {}) {
    Object.assign(this, override);
  }
}
