import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import { authReducer } from "./authSlice";
import { telemetryReducer } from "./telemetrySlices";
import {uiReducer} from "./uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    telemetry: telemetryReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// pre-typed version for the redux hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
