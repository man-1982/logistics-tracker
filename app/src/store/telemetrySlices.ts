import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type DriverPos = { lat: number; lng: number; ts: string };
export type TelemetryState = Record<string, DriverPos>;

const initialState: TelemetryState = {};

/**
 * Redux slice for managing real-time driver telemetry data.
 */
const telemetrySlice = createSlice({
  name: "telemetry",
  initialState,
  reducers: {
    /**
     * Adds or updates the position of a specific driver.
     */
    upsertPosition(state, action: PayloadAction<{ driverId: string; pos: DriverPos }>) {
      const { driverId, pos } = action.payload;
      state[driverId] = pos;
    },
    /**
     * Clears all driver position data from the state.
     */
    resetPositions() {
      return {};
    },
  },
});

export const { upsertPosition, resetPositions } = telemetrySlice.actions;
export const telemetryReducer = telemetrySlice.reducer;
