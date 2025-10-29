import React from 'react'
import Login from './components/Login'
import { BrowserRouter, Routes, Route } from 'react-router-dom'


const App = () => {
  return (
    <BrowserRouter>
      <div className="App font-sans min-h-screen p-8">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-center text-white drop-shadow-md">
            My Whiteboard App
          </h1>
        </header>

        <main>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* <Route path="/" element={<DashboardPage />} /> */}
            {/* <Route path="/whiteboard/:id" element={<WhiteboardPage />} /> */}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App