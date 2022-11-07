import { Alert } from "./Alert";

export interface Site {
  "@name": string;
  alerts?: Alert[];
}
