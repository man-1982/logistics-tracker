import {Delivery} from "./api";

export type MachineStatus = "delivering" | "paused" | "idle" | "alarm";
export const ALL_MACHINE_STATUSES: MachineStatus[] = ["delivering", "paused", "idle", "alarm"];

export function randomStatus(): MachineStatus {
  return ALL_MACHINE_STATUSES[Math.floor(Math.random() * ALL_MACHINE_STATUSES.length)] ?? "idle";
}

export function seedStatuses<T extends { id: string; status?: MachineStatus }>(drivers: T[]): T[] {
  for (const d of drivers) d.status = (d.status as MachineStatus) ?? randomStatus();
  return drivers;
}

export type DeliveryStatus = "assigned" | "in_progress" | "completed" | "cancelled";

export const ALL_DELIVERY_STATUSES: DeliveryStatus[] = ["assigned", "in_progress", "completed", "cancelled"];

export function randomDeliveryStatus(): DeliveryStatus {
  return ALL_DELIVERY_STATUSES[Math.floor(Math.random() * ALL_DELIVERY_STATUSES.length)] ?? "in_progress";
}

export function seedDeliveryStatuses<T extends { id: string; deliveryStatus?: DeliveryStatus }>(Deliveries: T[]): T[] {
  for (const d of Deliveries) d.deliveryStatus = (d.deliveryStatus as DeliveryStatus) ?? randomDeliveryStatus();
  return Deliveries;
}



