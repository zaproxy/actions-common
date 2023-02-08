import { Instance } from "./Instance";

export interface Alert {
  name: string;
  pluginid: string;
  instances: Instance[];
}
