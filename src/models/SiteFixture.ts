import { Site } from "./Site.js";
import { AlertFixture } from "./AlertFixture.js";

export class SiteFixture implements Site {
  "@name" = "http://localhost:8080";
  alerts = [new AlertFixture()];

  constructor(override: Partial<Site> = {}) {
    Object.assign(this, override);
  }
}
