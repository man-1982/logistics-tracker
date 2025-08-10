import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAppDispatch } from "../../store";
import { setAuth } from "../../store/authSlice";

export default function LoginForm() {
  const d = useAppDispatch();
  const [username, setUsername] = useState("dispatcher");
  const [password, setPassword] = useState("demo");

  /**
   * Implements a login mutation hook using the `api.login` function.
   */
  const m = useMutation({
    mutationFn: () => api.login(username, password),
    onSuccess: (res) => {
      d(setAuth({ token: res.accessToken, user: res.user }));
    },
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); m.mutate(); }}
      className="grid gap-2 max-w-80 p-4 rounded-xl bg-white shadow"
    >

      <h2>Sign in</h2>
      <label>
        Username
        <input
          aria-label="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </label>
      <label>
        Password
        <input
          aria-label="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <button disabled={m.isPending} type="submit">
        {m.isPending ? "Signing in..." : "Sign in"}
      </button>
      {m.isError && <div role="alert">Login failed: {(m.error as Error).message}</div>}
    </form>
  );
}
