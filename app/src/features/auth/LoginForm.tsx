import { useState, type FormEvent } from "react";
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    m.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 max-w-sm p-6 rounded-xl bg-white shadow-lg"
    >
      <h2 className="text-2xl font-bold text-gray-800">Sign in</h2>

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      <button
        disabled={m.isPending}
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
      >
        {m.isPending ? "Signing in..." : "Sign in"}
      </button>
      {m.isError && (
        <div role="alert" className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
          Login failed: {(m.error as Error).message}
        </div>
      )}
    </form>
  );
}
