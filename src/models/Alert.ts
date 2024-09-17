import { Instance } from "./Instance.js";

export interface Alert {
  name: string;
  pluginid: string;
  instances: Instance[];
}
