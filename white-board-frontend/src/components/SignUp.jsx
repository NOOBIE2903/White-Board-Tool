import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import * as apiService from "../api/apiService";

function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setIsLoading(false);
      return;
    }

    try {
      // ✅ Sign up user (Django: POST /api/users/)
      await apiService.signUp(username, email, password);
      toast.success("Account created successfully!");

      // ✅ Login user (Django: POST /api/token/)
      const loginResponse = await apiService.login(username, password);

      toast.success("Logged in successfully!");

      navigate("/");
    } catch (err) {
      console.error(err);

      if (err.response?.data) {
        const backendError =
          Object.values(err.response.data)?.[0] || "Signup failed.";
        setError(backendError);
      } else {
        setError("Unable to sign up. Try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-800 p-4 font-inter">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="w-full p-8 rounded-xl bg-white/10 backdrop-blur-lg shadow-xl"
        >
          <h2 className="text-3xl font-bold text-center text-white mb-6">
            Create Account
          </h2>

          {/* Username */}
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-2 mb-4 rounded bg-white/15 border border-white/20 text-white"
            placeholder="Username"
          />

          {/* Email */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 mb-4 rounded bg-white/15 border border-white/20 text-white"
            placeholder="Email"
          />

          {/* Password */}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
            className="w-full px-4 py-2 mb-4 rounded bg-white/15 border border-white/20 text-white"
            placeholder="Password"
          />

          {/* Confirm Password */}
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength="6"
            className="w-full px-4 py-2 mb-6 rounded bg-white/15 border border-white/20 text-white"
            placeholder="Confirm Password"
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded bg-indigo-600 text-white font-bold hover:bg-indigo-500"
          >
            {isLoading ? "Creating..." : "Sign Up"}
          </button>

          {error && (
            <p className="mt-4 text-red-400 text-center bg-red-900/20 p-2 rounded border border-red-700/50">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default SignUp;
