import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getWhiteboardDetails } from '../api/apiService';
import WhiteboardCanvas from './WhiteBoardCanvas';

function WhiteboardPage() {
  const { id } = useParams();

//   const = useState(null);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [whiteboardData, setWhiteboardData] = useState(null)
  const [board, setBoard] = useState(null)
  const [owner, setOwner] = useState(null)

  useEffect (() => {
    const fetchWhiteboard = async () => {
        try {
            setLoading (true);
            const data = await getWhiteboardDetails(id);
            setBoard(data);
            setWhiteboardData(data);
            setLoading(false);
            setOwner(data.owner);
        }
        catch (error) {
            setError("Failed to Fetch the Whiteboards Details");
            console.error(error);
        }
        finally {
            setLoading(false);
        }
    };
    fetchWhiteboard();
  }, [id])


  if (loading) {
    return <div className="text-center text-white">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div 
      className="
        max-w-4xl mx-auto p-12 rounded-xl
        bg-white/10 backdrop-blur-md shadow-lg
        border border-white/20
        bg-slate-600
      "
    >
      <h2 className="text-3xl font-bold mb-4">
        {whiteboardData? whiteboardData.name : 'Whiteboard'}
        {owner ? (
          <span className="text-3xl font-normal ml-4 text-black-200 uppercase">
            ({owner})
          </span>
        ) : null}
      </h2>
      <p className="text-xl text-indigo-300">
        Displaying content for whiteboard with ID: 
        <strong className="ml-2 font-mono text-white bg-white/20 px-2 py-1 rounded">
          {id}
        </strong>
      </p>
      
      {/* <div className="mt-8 text-slate-300">
        <h3 className="text-2xl font-semibold mb-4 text-white">Element Data</h3>
      
        <pre className="bg-slate-800 p-4 rounded-lg text-sm text-green-300 overflow-x-auto">
          {JSON.stringify(whiteboardData, null, 2)}
        </pre>
      </div> */}

      <div>
        <h2>{board.name} ({board.owner})</h2>
        <WhiteboardCanvas elements={board.elements} />
      </div>
    </div>
  );
}

export default WhiteboardPage;
