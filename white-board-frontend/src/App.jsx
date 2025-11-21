import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
// import './A'

// Import components and pages
import Login from './components/login';
import DashboardPage from './components/DashboardPage';
import WhiteboardPage from './components/WhiteBoardPage';
import CollaborativeWhiteboard from './components/CollaborativeWhiteboard';
import SignUp from './components/Signup';

function App() {
  return (
    <BrowserRouter>
      {/* Set up the main layout container */}
      <div className="App font-sans min-h-screen p-8  bg-slate-600">
        <Toaster />
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-center text-white drop-shadow-md">
            My Whiteboard App
          </h1>
        </header>

        <main>
          <Routes>
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<DashboardPage />} />
            <Route path="/whiteboard/:id" element={<WhiteboardPage />} />
            {/* console.log(boardId); */}
            <Route path="/collab/:boardId" element={<CollaborativeWhiteboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
