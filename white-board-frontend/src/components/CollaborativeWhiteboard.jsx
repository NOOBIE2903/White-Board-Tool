import React, { act, useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Circle } from "react-konva";
import { useParams } from "react-router-dom";
import { getWhiteboardDetails } from "../api/apiService";

function CollaborativeWhiteboard() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [elements, setElements] = useState(null);
  const [lines, setLines] = useState([]); 
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [tool, setTool] = useState("rectangle"); 
  const wsRef = useRef(null);
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const [rectangles, setRectangles] = useState([]);
  const [newRect, setNewRect] = useState(null);
  const [history, setHistory] = useState([]);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [actions, setActions] = useState([]);

  // 🟢 Load whiteboard details on mount
  useEffect(() => {
    if (!boardId) return;
    const fetchWhiteboard = async () => {
      const data = await getWhiteboardDetails(boardId);
      setBoard(data);
      setElements(data.elements || []);
    };
    fetchWhiteboard();
  }, [boardId]);

  // 🟢 Initialize WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(
      `${protocol}://localhost:8000/ws/whiteboard/${boardId}/`
    );

    socket.onopen = () => console.log("✅ Connected to WebSocket");
    socket.onclose = () => console.log("❌ Disconnected from WebSocket");
    socket.onerror = (e) => console.error("⚠️ WebSocket error", e);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 Received:", data);

      switch (data.action) {
        case "add_element":
          setElements((prev) => [...prev, data.payload]);
          break;
        case "draw":
          setLines((prev) => [...prev, data.payload]);
          break;
        case "chat":
          setChatMessages((prev) => [
            ...prev,
            { user: data.user, text: data.payload },
          ]);
          break;
        default:
          break;
      }
    };

    wsRef.current = socket;
    return () => socket.close();
  }, [boardId]);

  // 🟢 Rectangle Tool
  const addRectangle = () => {
    const newElement = {
      id: Date.now(),
      element_id: crypto.randomUUID(),
      element_type: "rectangle",
      data: {
        x: Math.random() * 400,
        y: Math.random() * 300,
        width: 100,
        height: 100,
        fill: "#4f46e5",
        stroke: "#fff",
        strokeWidth: 2,
      },
    };
    setRectangles((prev) => [...prev, newElement]);
    setActions((prev) => [
      ...prev,
      { type: "rectangle", index: rectangles.length },
    ]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ action: "add_element", element: newElement })
      );
    }
  };

  const handleMouseDown = (e) => {
    if (tool === "pen" || tool === "eraser") {
      isDrawing.current = true;
      const pos = e.target.getStage().getPointerPosition();
      const strokeColor = tool === "eraser" ? "#1e293b" : "#ffffff";
      setLines([
        ...lines,
        {
          points: [pos.x, pos.y],
          color: strokeColor,
          strokeWidth: tool === "eraser" ? 20 : 2,
        },
      ]);
    } else if (tool === "rectangle") {
      const pos = e.target.getStage().getPointerPosition();
      startPos.current = pos;
      setNewRect({ x: pos.x, y: pos.y, width: 0, height: 0, color: "#00ff88" });
      isDrawing.current = true;
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;

    const pos = e.target.getStage().getPointerPosition();
    setCursor({ x: pos.x, y: pos.y });

    if (tool === "pen" || tool === "eraser") {
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();
      const lastLine = lines[lines.length - 1];
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      lines.splice(lines.length - 1, 1, lastLine);
      setLines(lines.concat());
    } else if (tool === "rectangle" && newRect) {
      const pos = e.target.getStage().getPointerPosition();
      const width = pos.x - startPos.current.x;
      const height = pos.y - startPos.current.y;
      setNewRect({
        ...newRect,
        width,
        height,
      });
    }
  };

  const handleMouseUp = () => {
    if (tool === "pen" || tool === "eraser") {
      setActions((prev) => [...prev, { type: "line", index: lines.length }]);
      isDrawing.current = false;
    } else if (tool === "rectangle" && newRect) {
      setRectangles((prev) => [...prev, newRect]);
      setActions((prev) => [
        ...prev,
        { type: "rectangle", index: rectangles.length },
      ]);
      setNewRect(null);
      isDrawing.current = false;
    }
  };

  const undoLast = () => {
    setActions((prevActions) => {
      if (prevActions.length === 0) return prevActions;

      const lastAction = prevActions[prevActions.length - 1];
      const newActions = prevActions.slice(0, -1);

      if (lastAction.type === "line") {
        setLines((prevLines) => prevLines.slice(0, -1));
      } else if (lastAction.type === "rectangle") {
        setRectangles((prevRects) => prevRects.slice(0, -1));
      }

      return newActions;
    });
  };
  console.log(actions);

  // 🟢 Chat Sending
  const sendChat = () => {
    if (message.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ action: "chat", message: message, user: "User1" })
      );
      setMessage("");
    }
  };

  // 🟢 Loading state
  if (!board) return <div className="text-white text-center">Loading...</div>;

  return (
    <div className="p-4 bg-slate-800 rounded-xl text-white grid grid-cols-3 gap-4">
      {/* LEFT SIDE - Whiteboard */}
      <div className="col-span-2">
        <div className="mb-2 flex gap-2">
          <button
            onClick={() => setTool("rectangle")}
            className={`px-3 py-1 rounded ${
              tool === "rectangle" ? "bg-indigo-600" : "bg-slate-600"
            }`}
          >
            🟦 Rect
          </button>
          <button
            onClick={() => setTool("pen")}
            className={`px-3 py-1 rounded ${
              tool === "pen" ? "bg-green-600" : "bg-slate-600"
            }`}
          >
            ✏️ Pen
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`px-3 py-1 rounded ${
              tool === "eraser" ? "bg-red-600" : "bg-slate-600"
            }`}
          >
            🧽 Eraser
          </button>
          <button
            onClick={undoLast}
            className="px-3 py-1 rounded bg-yellow-600"
          >
            ↩️ Undo
          </button>
        </div>

        <Stage
          width={800}
          height={600}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          style={{ border: "2px solid #444", background: "#1e293b" }}
        >
          <Layer>
            {rectangles.map((rect, i) => (
              <Rect
                key={i}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                stroke={rect.color}
                strokeWidth={2}
              />
            ))}

            {newRect && (
              <Rect
                x={newRect.x}
                y={newRect.y}
                width={newRect.width}
                height={newRect.height}
                stroke={newRect.color}
                strokeWidth={2}
                dash={[5, 5]} // preview while drawing
              />
            )}

            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
              />
            ))}

            {tool === "eraser" && (
              <Circle
                x={cursor.x}
                y={cursor.y}
                radius={10}
                fill="#1e993b"
                opacity={0.8}
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* RIGHT SIDE - Chat */}
      <div
        className="flex flex-col bg-slate-700 p-4 rounded-lg h-[600px] w-[300px]"
        style={{ position: "relative", zIndex: 10 }}
      >
        <div className="flex-1 overflow-y-auto">
          {chatMessages.map((m, i) => (
            <p key={i}>
              <b>{m.user}:</b> {m.text}
            </p>
          ))}
        </div>

        <div className="flex mt-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 p-2 rounded text-black"
            placeholder="Type message..."
          />
          <button
            onClick={sendChat}
            className="ml-2 bg-indigo-500 px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default CollaborativeWhiteboard;




// fix the undo button logic
// save the chats 
// add redo button
// add other shoaes 
// add pen cursor
// add colors and stroke width options
// add size for eraser and for pen
