import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as apiService from "../api/apiService";
import apiClient from "../api/apiClient";

function DashboardPage() {
  const [whiteboards, setWhiteboards] = useState([]);
  const [newBoardName, setNewBoardName] = useState("");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("user");

    if (token) {
      setUser(JSON.parse(userData || "{}"));
      fetchWhiteboards();
    } else {
      setUser(null);
    }
    console.log(token);
  }, []);

  const createNewWhiteBoard = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await apiClient.post(
        "/whiteboards/",
        { name: newBoardName || "Untitled Board" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const boardID = res.data.id;
      if (!boardID) throw new Error("No board id in response");
      window.location.reload();
      // navigate("/");
    } catch (error) {
      console.error("Error creating whiteboard:", error);
      if (error.response && error.response.status === 401) {
        navigate("/login"); 
      }
    }
  };

  const fetchWhiteboards = async () => {
    try {
      const data = await apiService.getWhiteboards();
      setWhiteboards(data);
    } catch (error) {
      console.error("Error fetching whiteboards:", error);
      if (error.response && error.response.status === 401) {
        navigate("/login"); 
      }
    }
  };

  // const handleCreateBoard = async (e) => {
  //   e.preventDefault();
  //   if (!newBoardName.trim()) return;

  //   try {
  //     const newBoard = await apiService.createWhiteboard(newBoardName);
  //     setWhiteboards([...whiteboards, newBoard]);
  //     setNewBoardName("");
  //   } catch (error) {
  //     console.error("Error creating whiteboard:", error);
  //   }
  // };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleSignup = () => {
    navigate("/signup");
  };

  return (
    <div className="max-w-7xl mx-auto bg-slate-600 p-8 min-h-screen text-white">
      {/* Header with login/logout button */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {user ? (
          <button
            onClick={handleLogout}
            className="px-5 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold transition"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={handleLogin}
            className="px-5 py-2 rounded-md bg-green-600 hover:bg-green-500 text-white font-semibold transition"
          >
            Login
          </button>
        )}
        <button
            onClick={handleSignup}
            className="px-5 py-2 rounded-md bg-green-600 hover:bg-green-500 text-white font-semibold transition"
          >
            Signup
          </button>
      </div>

      {/* If not logged in */}
      {!user ? (
        <div className="text-center mt-20">
          <p className="text-lg text-gray-200 mb-6">
            Please log in to access your whiteboards.
          </p>
        </div>
      ) : (
        <>
          {/* Create New Board Form */}
          <div className="mb-12 p-6 bg-white/10 backdrop-blur-md rounded-xl shadow-lg border border-white/20">
            {/* <h1>Welcome {user}</h1> */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createNewWhiteBoard();
              }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Enter new whiteboard name..."
                className="
                  flex-grow px-4 py-3 rounded-md
                  bg-white/10 border border-white/20
                  text-white placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-indigo-400
                "
              />
              <button
                type="submit"
                className="
                  px-6 py-3 rounded-md font-semibold text-white
                  bg-indigo-600 shadow-lg
                  transition-all duration-300 ease-in-out
                  hover:bg-indigo-500 hover:shadow-indigo-500/50
                  transform hover:-translate-y-1
                "
              >
                Create New Board
              </button>
            </form>
          </div>

          {/* Whiteboards Grid */}
          <h3 className="text-2xl font-semibold mb-6">Your Whiteboards</h3>
          <div className="[perspective:1200px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {whiteboards.map((board) => (
                <div
                  key={board.id}
                  // to={`/whiteboard/${board.id}`}
                  className="
                    block p-6 h-48 rounded-xl
                    bg-white/10 backdrop-blur-md shadow-lg
                    border border-white/20
                    transition-all duration-300 ease-in-out
                    [transform-style:preserve-3d]
                    hover:shadow-2xl hover:shadow-indigo-500/30
                    hover:[transform:rotateY(10deg)_translateZ(10px)]
                  "
                >
                  <div className="[transform:translateZ(20px)] h-full flex flex-col justify-between">
                    <span className="font-semibold text-xl text-white">
                      {board.name}
                    </span>

                    <div className="flex gap-4 mt-auto">
                      <Link
                        to={`/whiteboard/${board.id}`}
                        className="text-sm font-medium text-blue-300 hover:underline"
                      >
                        View
                      </Link>
                      <Link
                        to={`/collab/${board.id}`}
                        className="text-sm font-medium text-green-300 hover:underline"
                      >
                        Collaborate
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
