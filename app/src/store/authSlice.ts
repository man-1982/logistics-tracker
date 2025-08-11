import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type User } from "../lib/api";

type AuthState = { token: string | null; user: User | null };

const initialState: AuthState = { token: null, user: null };

/**
 * Redux authentication state.
 * Authentication token and user information.
 */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /**
     * Sets the authentication state with a new token and user.
     */
    setAuth(state, action: PayloadAction<{ token: string; user: User }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    /**
     * Clears the authentication state, effectively logging the user out.
     */
    clearAuth(state) {
      state.token = null;
      state.user = null;
    },
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export const authReducer = authSlice.reducer;

/**
 * Authentication token from the state.
 */
export const selectToken = (s: { auth: AuthState }) => s.auth.token;

/**
 * Selects the user object from the state.
 */
export const selectUser = (s: { auth: AuthState }) => s.auth.user;
