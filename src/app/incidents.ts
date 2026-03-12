import data from "./incidents.json";

export interface StatEffects {
  uptime?: number;
  morale?: number;
  cloud_cost?: number;
  reputation?: number;
}

export interface Choice {
  text: string;
  effects: StatEffects;
}

export interface Incident {
  title: string;
  description: string;
  options: Choice[];
}

export const incidents: Incident[] = data as Incident[];
