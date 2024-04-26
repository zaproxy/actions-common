import { Alert } from "./Alert.js";

export interface Site {
  "@name": string;
  alerts?: Alert[];
}
