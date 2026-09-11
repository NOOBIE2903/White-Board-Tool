import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getWhiteboardDetails } from '../api/apiService';
import WhiteboardCanvas from './WhiteboardCanvas';

function WhiteboardPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [whiteboardData, setWhiteboardData] = useState(null);
  const [owner, setOwner] = useState(null);

  useEffect(() => {
    const fetchWhiteboard = async () => {
      try {
        setLoading(true);
        const data = await getWhiteboardDetails(id);
        setWhiteboardData(data);
        setOwner(data.owner);
      } catch (err) {
        setError("Failed to fetch whiteboard details.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWhiteboard();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-[#FF6B00]/30 border-t-[#FF6B00] rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#6C757D]">Loading whiteboard details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-red-200 shadow-sm text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-xl font-bold">
          ⚠️
        </div>
        <h3 className="text-lg font-bold text-[#1E2022] mb-1">{error}</h3>
        <Link to="/" className="inline-block mt-4 text-xs font-bold text-[#FF6B00] hover:underline">
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header Bar */}
      <div className="mb-8 p-6 bg-white rounded-3xl border border-[#FFE2D1] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-9 h-9 rounded-2xl bg-[#FFF0E6] text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white flex items-center justify-center font-bold text-sm transition-all border border-[#FFE2D1]"
              title="Back to Dashboard"
            >
              ←
            </Link>
            <h2 className="text-2xl font-extrabold text-[#1E2022]">
              {whiteboardData?.name || 'Whiteboard Detail'}
            </h2>
            {owner && (
              <span className="px-3 py-1 rounded-full bg-[#FFF0E6] text-[#FF6B00] border border-[#FFE2D1] text-xs font-bold uppercase">
                Owner: {owner}
              </span>
            )}
          </div>
          <p className="text-xs text-[#6C757D] font-medium mt-1">
            Board ID: <span className="font-mono text-[#1E2022]">{id}</span>
          </p>
        </div>

        <Link
          to={`/collab/${id}`}
          className="px-5 py-2.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05D00] text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center gap-2"
        >
          🚀 Open Live Workspace
        </Link>
      </div>

      {/* Read-only Canvas Preview Container */}
      <div className="bg-white p-6 rounded-3xl border border-[#FFE2D1] shadow-sm">
        <h3 className="text-sm font-bold text-[#1E2022] mb-4">Canvas Content Preview</h3>
        <WhiteboardCanvas elements={whiteboardData?.elements || []} />
      </div>
    </div>
  );
}

export default WhiteboardPage;
