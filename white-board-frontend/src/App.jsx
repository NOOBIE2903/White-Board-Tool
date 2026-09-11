import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Login from './components/Login';
import DashboardPage from './components/DashboardPage';
import WhiteboardPage from './components/WhiteBoardPage';
import CollaborativeWhiteboard from './components/CollaborativeWhiteboard';
import SignUp from './components/SignUp';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#FFF8F4] text-[#1E2022] font-sans flex flex-col">
        {/* Custom Warm Theme Toast Notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#FFFFFF',
              color: '#1E2022',
              border: '1px solid #FFE2D1',
              boxShadow: '0 10px 25px -5px rgba(255, 107, 0, 0.1)',
              borderRadius: '16px',
              padding: '12px 20px',
              fontWeight: 500,
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#FF6B00',
                secondary: '#FFFFFF',
              },
            },
          }}
        />

        {/* Global Brand Header */}
        <header className="w-full bg-white/80 backdrop-blur-md border-b border-[#FFE2D1] sticky top-0 z-40 px-6 py-3.5 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#FF8800] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                ✏️
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-[#1E2022] group-hover:text-[#FF6B00] transition-colors">
                  DrawFlow
                </span>
                <span className="text-[10px] font-semibold text-[#FF6B00] tracking-wider uppercase">
                  Collaborative AI Canvas
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-3">
              <Link
                to="/"
                className="px-4 py-2 rounded-full text-sm font-semibold text-[#6C757D] hover:text-[#FF6B00] hover:bg-[#FFF0E6] transition-all"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Route Content */}
        <main className="flex-1 w-full">
          <Routes>
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<DashboardPage />} />
            <Route path="/whiteboard/:id" element={<WhiteboardPage />} />
            <Route path="/collab/:boardId" element={<CollaborativeWhiteboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
