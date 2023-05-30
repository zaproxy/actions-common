import { Alert } from "./Alert";
import { InstanceFixture } from "./InstanceFixture";

export class AlertFixture implements Alert {
  instances = [new InstanceFixture()];
  name = "Cross Site Scripting (Reflected)";
  pluginid = "40012";

  confidence = "2" as const;
  riskcode = "3" as const;

  constructor(override: Partial<Alert> = {}) {
    Object.assign(this, override);
  }
}
