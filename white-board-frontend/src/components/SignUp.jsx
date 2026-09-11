import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
      await apiService.signUp(username, email, password);
      toast.success("Account created successfully!");

      await apiService.login(username, password);
      toast.success("Logged in successfully!");

      navigate("/");
    } catch (err) {
      console.error(err);
      if (err.response?.data) {
        const data = err.response?.data;
        setError(
          data?.detail ||
          data?.username?.[0] ||
          data?.email?.[0] ||
          data?.password?.[0] ||
          "Signup failed."
        );
      } else {
        setError("Unable to sign up. Try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 relative overflow-hidden bg-[#FFF8F4]">
      {/* Ambient Blobs */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#FFE2D1]/60 blur-3xl animate-float pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-[#FFF0E6]/80 blur-3xl animate-float-reverse pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <form
          onSubmit={handleSubmit}
          className="
            w-full p-8 sm:p-10 rounded-3xl
            bg-white shadow-[0_15px_40px_rgba(255,107,0,0.08)]
            border border-[#FFE2D1]
            transition-all duration-300
            hover:shadow-[0_20px_50px_rgba(255,107,0,0.12)]
          "
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-[#FF8800] text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-orange-500/30">
              🚀
            </div>
            <h2 className="text-3xl font-extrabold text-[#1E2022] tracking-tight">Create Account</h2>
            <p className="text-sm font-medium text-[#6C757D] mt-1">Start collaborating on DrawFlow today</p>
          </div>

          {/* Username */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-[#1E2022] uppercase tracking-wider mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="johndoe"
              className="
                w-full px-4 py-3.5 rounded-2xl
                bg-[#FFF8F4] border border-[#FFE2D1]
                text-[#1E2022] placeholder-[#A0AAB0] text-sm
                focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]
                transition-all
              "
            />
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-[#1E2022] uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="john@example.com"
              className="
                w-full px-4 py-3.5 rounded-2xl
                bg-[#FFF8F4] border border-[#FFE2D1]
                text-[#1E2022] placeholder-[#A0AAB0] text-sm
                focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]
                transition-all
              "
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-[#1E2022] uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
              placeholder="••••••••"
              className="
                w-full px-4 py-3.5 rounded-2xl
                bg-[#FFF8F4] border border-[#FFE2D1]
                text-[#1E2022] placeholder-[#A0AAB0] text-sm
                focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]
                transition-all
              "
            />
          </div>

          {/* Confirm Password */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-[#1E2022] uppercase tracking-wider mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength="6"
              placeholder="••••••••"
              className="
                w-full px-4 py-3.5 rounded-2xl
                bg-[#FFF8F4] border border-[#FFE2D1]
                text-[#1E2022] placeholder-[#A0AAB0] text-sm
                focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]
                transition-all
              "
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="
              w-full py-3.5 rounded-2xl font-bold text-white text-base
              bg-gradient-to-r from-[#FF6B00] to-[#FF8800]
              shadow-lg shadow-orange-500/25
              transition-all duration-200 ease-in-out
              hover:from-[#E05D00] hover:to-[#FF6B00] hover:shadow-orange-500/40
              transform hover:-translate-y-0.5 active:translate-y-0
              disabled:opacity-60 flex items-center justify-center gap-2
            "
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Creating Account...
              </>
            ) : (
              "Sign Up →"
            )}
          </button>

          {error && (
            <div className="mt-5 text-center text-sm font-semibold text-red-600 bg-red-50 p-3 rounded-2xl border border-red-200">
              {error}
            </div>
          )}

          {/* Footer Navigation */}
          <div className="mt-6 text-center border-t border-[#FFE2D1] pt-5">
            <p className="text-xs font-medium text-[#6C757D]">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-[#FF6B00] hover:underline">
                Log In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignUp;
