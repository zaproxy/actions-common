import { Alert } from "./Alert.js";
import { InstanceFixture } from "./InstanceFixture.js";

export class AlertFixture implements Alert {
  instances = [new InstanceFixture()];
  name = "Cross Site Scripting (Reflected)";
  pluginid = "40012";

  constructor(override: Partial<Alert> = {}) {
    Object.assign(this, override);
  }
}
