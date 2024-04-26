import { Report } from "./Report.js";
import { SiteFixture } from "./SiteFixture.js";

export class ReportFixture implements Report {
  site = [new SiteFixture()];

  constructor(override: Partial<Report> = {}) {
    Object.assign(this, override);
  }
}
