import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as apiService from '../api/apiService'

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiService.login(username, password);
      navigate('/');
    } catch (err) {
      setError('Failed to log in. Please check your credentials.');
      console.error(err);
    }
  };

  return (
    // Perspective container for the 3D effect
    <div className="flex justify-center [perspective:1000px] bg-slate-600">
      {/* The 3D Card:
        - transition-all, duration-300: Smooth animation
        - hover:-translate-y-2: Lifts the card
        - hover:shadow-2xl: Adds a bigger shadow
        - hover:[transform:rotateX(5deg)]: Tilts the card slightly in 3D
      */}
      <form 
        onSubmit={handleSubmit} 
        className="
          w-full max-w-sm p-8 rounded-xl
          bg-white/10 backdrop-blur-md shadow-lg
          border border-white/20
          transition-all duration-300 ease-in-out
          hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/30
          [transform-style:preserve-3d]
          hover:[transform:rotateX(5deg)_translateY(-8px)]
        "
      >
        <h2 className="text-2xl font-semibold text-center text-white mb-6">Login</h2>
        
        {/* Styled Inputs */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-200 mb-2">Username</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)} 
            className="
              w-full px-4 py-2 rounded-md
              bg-white/10 border border-white/20
              text-white placeholder-slate-400
              focus:outline-none focus:ring-2 focus:ring-indigo-400
            "
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-200 mb-2">Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="
              w-full px-4 py-2 rounded-md
              bg-white/10 border border-white/20
              text-white placeholder-slate-400
              focus:outline-none focus:ring-2 focus:ring-indigo-400
            "
          />
        </div>
        
        {/* Styled Button with 3D Hover */}
        <button 
          type="submit"
          className="
            w-full py-3 rounded-md font-semibold text-white
            bg-indigo-600 shadow-lg
            transition-all duration-300 ease-in-out
            hover:bg-indigo-500 hover:shadow-indigo-500/50
            transform hover:-translate-y-1
          "
        >
          Login
        </button>
        
        {error && <p className="mt-4 text-center text-red-400">{error}</p>}
      </form>
    </div>
  );
}

export default Login;
