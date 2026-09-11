import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as apiService from "../api/apiService";
import apiClient from "../api/apiClient";
import toast from "react-hot-toast";

function DashboardPage() {
  const [whiteboards, setWhiteboards] = useState([]);
  const [newBoardName, setNewBoardName] = useState("");
  const [user, setUser] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState("all"); // "all"
  const navigate = useNavigate();

  const fetchWhiteboards = useCallback(async () => {
    try {
      const data = await apiService.getWhiteboards();
      setWhiteboards(data || []);
    } catch (error) {
      console.error("Error fetching whiteboards:", error);
      if (error.response && error.response.status === 401) {
        navigate("/login");
      }
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser({ username: "User" });
      }
      fetchWhiteboards();
    } else {
      setUser(null);
    }
  }, [fetchWhiteboards]);

  const createNewWhiteBoard = async () => {
    if (!newBoardName.trim()) {
      toast.error("Please enter a name for your whiteboard.");
      return;
    }
    try {
      setIsCreating(true);
      const res = await apiClient.post("/whiteboards/", {
        name: newBoardName.trim(),
      });

      const boardID = res.data.id;
      if (!boardID) throw new Error("No board id in response");
      toast.success(`Whiteboard "${res.data.name}" created!`, { icon: "✨" });
      setNewBoardName("");
      fetchWhiteboards();
    } catch (error) {
      console.error("Error creating whiteboard:", error);
      if (error.response && error.response.status === 401) {
        navigate("/login");
      } else {
        toast.error("Failed to create whiteboard.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setUser(null);
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleSignup = () => {
    navigate("/signup");
  };

  const username = user?.username || user?.user_id || "Creator";

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-[#FFE2D1]">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0E6] text-[#FF6B00] border border-[#FFE2D1] text-xs font-bold uppercase tracking-wider mb-2">
            <span>🎨</span> Personal Workspace
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1E2022] tracking-tight">
            {user ? `Welcome back, ${username}! 👋` : "Collaborative Whiteboards"}
          </h1>
          <p className="text-sm text-[#6C757D] font-medium mt-1">
            Design wireframes, draw concepts, and generate live code in real-time.
          </p>
        </div>

        {/* User Status / Action Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-white p-2 pl-4 rounded-2xl shadow-sm border border-[#FFE2D1]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#FFF0E6] text-[#FF6B00] font-bold text-sm flex items-center justify-center border border-[#FFE2D1]">
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-bold text-[#1E2022] hidden sm:inline">
                  {username}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogin}
                className="px-5 py-2.5 rounded-2xl bg-white border border-[#FFE2D1] text-[#1E2022] hover:bg-[#FFF0E6] hover:text-[#FF6B00] font-bold text-sm shadow-sm transition-all"
              >
                Log In
              </button>
              <button
                onClick={handleSignup}
                className="px-5 py-2.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05D00] text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!user ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-[#FFE2D1] shadow-sm max-w-2xl mx-auto p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-[#FFF0E6] text-[#FF6B00] flex items-center justify-center text-3xl font-bold">
            ✨
          </div>
          <h2 className="text-2xl font-bold text-[#1E2022] mb-2">Sign in to start creating</h2>
          <p className="text-sm text-[#6C757D] mb-6 max-w-md mx-auto">
            Create whiteboards, sketch UI wireframes with AI code generation, and collaborate live with your team.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleLogin}
              className="px-6 py-3 rounded-2xl bg-[#FF6B00] text-white font-bold hover:bg-[#E05D00] shadow-md shadow-orange-500/20 transition-all"
            >
              Get Started Now →
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Create New Board Card */}
          <div className="mb-10 p-6 sm:p-8 bg-white rounded-3xl shadow-[0_10px_30px_rgba(255,107,0,0.06)] border border-[#FFE2D1] relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 rounded-xl bg-[#FFF0E6] text-[#FF6B00] font-bold text-lg">
                ➕
              </span>
              <div>
                <h3 className="text-lg font-extrabold text-[#1E2022]">Create New Whiteboard</h3>
                <p className="text-xs text-[#6C757D]">Start a fresh canvas for drawing or AI wireframing</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createNewWhiteBoard();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Enter whiteboard name (e.g. Mobile App Wireframe)..."
                className="
                  flex-grow px-5 py-3.5 rounded-2xl
                  bg-[#FFF8F4] border border-[#FFE2D1]
                  text-[#1E2022] placeholder-[#A0AAB0] text-sm font-medium
                  focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]
                  transition-all
                "
              />
              <button
                type="submit"
                disabled={isCreating}
                className="
                  px-7 py-3.5 rounded-2xl font-bold text-white text-sm whitespace-nowrap
                  bg-gradient-to-r from-[#FF6B00] to-[#FF8800]
                  shadow-lg shadow-orange-500/20
                  transition-all duration-200 ease-in-out
                  hover:from-[#E05D00] hover:to-[#FF6B00] hover:shadow-orange-500/35
                  transform hover:-translate-y-0.5 active:translate-y-0
                  disabled:opacity-60 flex items-center justify-center gap-2
                "
              >
                {isCreating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Board →"
                )}
              </button>
            </form>
          </div>

          {/* Whiteboards Grid Header & Category Pills */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-extrabold text-[#1E2022]">Your Whiteboards</h3>
              <p className="text-xs text-[#6C757D]">
                Showing {whiteboards.length} board{whiteboards.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-[#FFE2D1] shadow-sm text-xs">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-1.5 rounded-xl font-semibold transition-all ${
                  filter === "all"
                    ? "bg-[#FF6B00] text-white shadow-sm"
                    : "text-[#6C757D] hover:text-[#FF6B00]"
                }`}
              >
                All Boards
              </button>
            </div>
          </div>

          {/* Whiteboards Grid */}
          {whiteboards.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#FFE2D1] shadow-sm p-8">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#FFF0E6] text-[#FF6B00] flex items-center justify-center text-2xl font-bold">
                📋
              </div>
              <h4 className="text-lg font-bold text-[#1E2022]">No whiteboards yet</h4>
              <p className="text-xs text-[#6C757D] mt-1 mb-4">
                Enter a board name above to create your first whiteboard project.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {whiteboards.map((board) => (
                <div
                  key={board.id}
                  className="
                    group relative flex flex-col justify-between p-6 rounded-3xl
                    bg-white border border-[#FFE2D1]
                    shadow-[0_8px_25px_rgba(255,107,0,0.05)]
                    transition-all duration-300 ease-in-out
                    hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(255,107,0,0.12)]
                    hover:border-[#FF6B00]/40
                  "
                >
                  <div>
                    {/* Top Row: Thumbnail Icon + Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#FFF0E6] text-[#FF6B00] flex items-center justify-center font-bold text-xl group-hover:bg-[#FF6B00] group-hover:text-white transition-colors shadow-sm">
                        🖼️
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#FFF0E6] text-[#FF6B00] border border-[#FFE2D1] text-[11px] font-bold uppercase tracking-wider">
                        Active
                      </span>
                    </div>

                    {/* Board Title */}
                    <h4 className="font-extrabold text-xl text-[#1E2022] group-hover:text-[#FF6B00] transition-colors line-clamp-1 mb-2">
                      {board.name}
                    </h4>
                    <p className="text-xs text-[#6C757D] font-medium">
                      ID: <span className="font-mono text-[#1E2022]">{board.id}</span>
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-8 pt-4 border-t border-[#FFE2D1] flex items-center justify-between">
                    <Link
                      to={`/whiteboard/${board.id}`}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6C757D] hover:text-[#FF6B00] hover:bg-[#FFF0E6] transition-all"
                    >
                      👁️ View Detail
                    </Link>

                    <Link
                      to={`/collab/${board.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#FF6B00] hover:bg-[#E05D00] shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5"
                    >
                      🚀 Collaborate Live
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardPage;
