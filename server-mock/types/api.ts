export type DriverId = string;
export type DeliveryId = string;

export type Driver = {
  id: DriverId,
  name: string,
  // TODO add more statuses and change type
  status: "active" | "pause",
  // TODO vehicle implement separate type
  vehicle?: string
};

export type DeliveryStatus = "assigned" | "in_progress" | "completed" | "cancelled";

export type Delivery = {
  id: DeliveryId,
  title: string,
  customer: string,
  address: string,
  etaMinutes: number,
  status: DeliveryStatus,
  driverId?: DriverId | null,
}

// WS envelope (v1)
export type WsEnvelope <TType extends string, TData> = {
  v: 1,
  type: TType,
  // TODO check the timestamp ISO format
  ts: string,
  data: TData
}

export type GpsPing = {
  driverId: DriverId,
  lat: number,
  lng: number,
}
