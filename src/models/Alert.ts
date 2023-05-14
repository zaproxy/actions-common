import { Instance } from "./Instance";

export interface Alert {
  name: string;
  pluginid: string;
  riskcode: "0" | "1" | "2" | "3";
  confidence: "0" | "1" | "2" | "3" | "4";
  instances: Instance[];
}
