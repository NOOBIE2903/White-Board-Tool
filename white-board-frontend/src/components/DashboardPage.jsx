import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as apiService from '../api/apiService'

function DashboardPage() {
  const [whiteboards, setWhiteboards] = useState([]);
  const [newBoardName, setNewBoardName] = useState('');

  useEffect(() => {
    const fetchWhiteboards = async () => {
      try {
        const data = await apiService.getWhiteboards();
        setWhiteboards(data);
      } catch (error) {
        console.error('Error fetching whiteboards:', error);
      }
    };
    fetchWhiteboards();
  }, []); 

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    try {
      const newBoard = await apiService.createWhiteboard(newBoardName);
      setWhiteboards([...whiteboards, newBoard]);
      setNewBoardName('');
    } catch (error) {
      console.error('Error creating whiteboard:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto bg-slate-600 p-8 min-h-screen text-white">
      {/* Create New Board Form */}
      <div className="mb-12 p-6 bg-white/10 backdrop-blur-md rounded-xl shadow-lg border border-white/20">
        <form onSubmit={handleCreateBoard} className="flex flex-col sm:flex-row gap-4">
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
      {/* Perspective container for the grid */}
      <div className="[perspective:1200px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {whiteboards.map(board => (
            // Each board card is now a div, containing the name and links
            <div 
              key={board.id}
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
              {/* This inner div helps with the 3D effect */}
              <div className="[transform:translateZ(20px)] h-full flex flex-col justify-between">
                <span className="font-semibold text-xl text-white">
                  {board.name}
                </span>
                
                {/* Links at the bottom of the card */}
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
    </div>
  );
}

export default DashboardPage;