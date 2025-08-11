import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type UiState = { selectedDriverId: string | null };
const initial: UiState = { selectedDriverId: null };

const uiSlice = createSlice({
  name: "ui",
  initialState: initial,
  reducers: {
    setSelectedDriver(state, action: PayloadAction<string | null>) {
      state.selectedDriverId = action.payload;
    },
  },
});

export const { setSelectedDriver } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
export const selectSelectedDriverId = (s: { ui: UiState }) => s.ui.selectedDriverId;
