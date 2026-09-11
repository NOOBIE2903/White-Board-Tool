import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Circle } from "react-konva";
import { useParams, Link } from "react-router-dom";
import { getWhiteboardDetails } from "../api/apiService";
import toast from "react-hot-toast";
import WireframeCodeModal from "./WireframeCodeModal";

function CollaborativeWhiteboard() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [tool, setTool] = useState("rectangle"); // "rectangle", "pen", "eraser"
  const [selectedColor, setSelectedColor] = useState("#FF6B00");
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(3);
  
  const wsRef = useRef(null);
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const [newRect, setNewRect] = useState(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [, setActions] = useState([]);
  const currentDrawingId = useRef();
  const [, setRedoStack] = useState([]);
  const [copy, setCopy] = useState(false);
  const [elements, setElements] = useState([]);
  const erasingRef = useRef(false);
  const [user, setUser] = useState("");
  const chatEndRef = useRef(null);
  const stageRef = useRef(null);
  const [isCodeGenOpen, setIsCodeGenOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUser(String(storedUsername));
      return;
    }
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const rawName = parsed.username || parsed.user_id || "Anonymous";
        setUser(String(rawName));
      } catch {
        setUser("Creator");
      }
    } else {
      setUser("Anonymous");
    }
  }, []);

  const distanceToSegment = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const makeId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // 🟢 Load whiteboard details on mount
  useEffect(() => {
    if (!boardId) return;
    const fetchWhiteboard = async () => {
      try {
        const data = await getWhiteboardDetails(boardId);
        const normalized = (data.elements || []).map((el) => ({
          ...el,
          id: el.element_id,
        }));

        setBoard(data);
        setElements(normalized);
      } catch (err) {
        console.error("Failed to load whiteboard details:", err);
      }
    };
    fetchWhiteboard();
  }, [boardId]);

  // 🟢 Initialize WebSocket
  useEffect(() => {
    const token = localStorage.getItem("accessToken") || "";
    const envWs = import.meta.env.VITE_WS_BASE_URL;
    const envBackend = import.meta.env.VITE_BACKEND_URL || "https://white-board-tool-backend.onrender.com";

    let wsUrl = "";
    if (envWs) {
      wsUrl = `${envWs}/ws/whiteboard/${boardId}/?token=${token}`;
    } else {
      const wsProtocol = envBackend.startsWith("https") ? "wss" : "ws";
      const wsHost = envBackend.replace(/^https?:\/\//, "").replace(/\/$/, "");
      wsUrl = `${wsProtocol}://${wsHost}/ws/whiteboard/${boardId}/?token=${token}`;
    }

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log("✅ Connected to WebSocket");
    socket.onclose = () => console.log("❌ Disconnected from WebSocket");
    socket.onerror = (e) => console.error("⚠️ WebSocket error", e);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.action) {
        case "add_element":
          setElements((prev) => {
            const exists = prev.some(
              (el) => el.element_id === data.payload.element_id
            );
            return exists ? prev : [...prev, data.payload];
          });
          break;
        case "draw":
          setElements((prev) =>
            prev.map((el) =>
              el.element_id === data.payload.element_id
                ? {
                    ...el,
                    data: {
                      ...el.data,
                      points: [...el.data.points, ...data.payload.point],
                    },
                  }
                : el
            )
          );
          break;
        case "chat":
          setChatMessages((prev) => [
            ...prev,
            { user: data.user, text: data.payload.text },
          ]);
          break;
        case "chat_history":
          setChatMessages(data.payload);
          break;
        case "delete_element":
          setElements((prev) =>
            prev.filter((el) => el.element_id !== data.payload.element_id)
          );
          break;
        case "elements_history":
          setElements(
            data.payload.map((el) => ({
              ...el,
              id: el.element_id,
            }))
          );
          break;
        case "undo":
          if (data.payload.type === "delete") {
            setElements((prev) =>
              prev.filter((el) => el.element_id !== data.payload.element_id)
            );
          }
          if (data.payload.type === "add") {
            setElements((prev) => [...prev, data.payload.element]);
          }
          break;
        case "redo":
          if (data.payload.type === "add") {
            setElements((prev) => [...prev, data.payload.element]);
          }
          if (data.payload.type === "delete") {
            setElements((prev) =>
              prev.filter((el) => el.element_id !== data.payload.element_id)
            );
          }
          break;
        default:
          break;
      }
    };

    wsRef.current = socket;
    return () => socket.close();
  }, [boardId]);

  const handleMouseDown = (e) => {
    const button = e.evt.button; // 0 = left click

    // ✏️🧽 PEN / ERASER
    if (tool === "pen" || tool === "eraser") {
      isDrawing.current = true;
      const pos = e.target.getStage().getPointerPosition();
      const strokeColor = tool === "eraser" ? "#FAFAFA" : selectedColor;
      const strokeWidth = tool === "eraser" ? 24 : selectedStrokeWidth;
      const id = makeId();

      currentDrawingId.current = id;

      wsRef.current?.send(
        JSON.stringify({
          action: "add_element",
          payload: {
            element_id: id,
            type: "line",
            data: {
              points: [pos.x, pos.y],
              color: strokeColor,
              strokeWidth,
            },
          },
          user,
        })
      );
      return;
    }

    // 🟦 RECTANGLE
    if (tool === "rectangle" && button === 0) {
      const pos = e.target.getStage().getPointerPosition();
      startPos.current = pos;

      setNewRect({
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: selectedColor,
        strokeWidth: selectedStrokeWidth,
        fill: "transparent",
        cornerRadius: 6,
      });

      isDrawing.current = true;
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;

    const pos = e.target.getStage().getPointerPosition();
    setCursor({ x: pos.x, y: pos.y });

    // ✏️ PEN
    if (tool === "pen") {
      wsRef.current?.send(
        JSON.stringify({
          action: "draw",
          payload: {
            element_id: currentDrawingId.current,
            point: [pos.x, pos.y],
          },
          user,
        })
      );
    }

    // 🧽 ERASER
    else if (tool === "eraser") {
      const ERASE_RADIUS = 15;

      setElements((prev) => {
        let deleted = null;

        const remaining = prev.filter((el) => {
          if (el.type === "rectangle") {
            const hit =
              pos.x >= el.data.x &&
              pos.x <= el.data.x + el.data.width &&
              pos.y >= el.data.y &&
              pos.y <= el.data.y + el.data.height;

            if (hit) {
              deleted = el;
              return false;
            }
          }

          if (el.type === "line") {
            const pts = el.data.points;
            for (let i = 0; i < pts.length - 2; i += 2) {
              const d = distanceToSegment(
                pos.x,
                pos.y,
                pts[i],
                pts[i + 1],
                pts[i + 2],
                pts[i + 3]
              );
              if (d < ERASE_RADIUS) {
                deleted = el;
                return false;
              }
            }
          }

          return true;
        });

        if (deleted) {
          erasingRef.current = true;
          setActions((prevActions) => [
            ...prevActions,
            { type: "delete", element: deleted },
          ]);
          setRedoStack([]);

          wsRef.current?.send(
            JSON.stringify({
              action: "delete_element",
              payload: { element_id: deleted.element_id },
              user: user || "Anonymous",
            })
          );
        }

        return remaining;
      });
    }

    // 🟦 RECTANGLE
    else if (tool === "rectangle" && newRect) {
      const x = Math.min(pos.x, startPos.current.x);
      const y = Math.min(pos.y, startPos.current.y);
      const width = Math.abs(pos.x - startPos.current.x);
      const height = Math.abs(pos.y - startPos.current.y);

      setNewRect({
        ...newRect,
        x,
        y,
        width,
        height,
      });
    }
  };

  const handleMouseUp = () => {
    erasingRef.current = false;
    isDrawing.current = false;

    if (tool === "pen") {
      const finalLine = elements.find(
        (e) => e.element_id === currentDrawingId.current
      );

      if (!finalLine) return;

      wsRef.current?.send(
        JSON.stringify({
          action: "draw_end",
          payload: {
            element_id: finalLine.element_id,
            data: finalLine.data,
          },
          user: user || "Anonymous",
        })
      );

      currentDrawingId.current = null;
      setActions((prev) => [...prev, { type: "add", element: finalLine }]);
      setRedoStack([]);
    }

    if (tool === "rectangle" && newRect) {
      const rectElement = {
        id: makeId(),
        element_id: makeId(),
        type: "rectangle",
        data: newRect,
      };

      wsRef.current?.send(
        JSON.stringify({
          action: "add_element",
          payload: rectElement,
          user: user || "Anonymous",
        })
      );

      setActions((prev) => [...prev, { type: "add", element: rectElement }]);
      setRedoStack([]);
      setNewRect(null);
    }
  };

  const undoLast = () => {
    wsRef.current?.send(
      JSON.stringify({
        action: "undo",
        user: user || "Anonymous",
      })
    );
  };

  const redoLast = () => {
    wsRef.current?.send(
      JSON.stringify({
        action: "redo",
        user: user || "Anonymous",
      })
    );
  };

  const textToCopy = `${window.location.origin}/collab/${boardId}`;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success("Board link copied to clipboard!", { icon: "🔗" });
      setCopy(true);
      setTimeout(() => setCopy(false), 2000);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const sendChat = () => {
    if (message.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: "chat",
          payload: { text: message },
        })
      );
      setMessage("");
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  return (
    <div className="min-h-[92vh] bg-[#FFF8F4] text-[#1E2022] p-4 flex flex-col font-sans">
      {/* Workspace App Header Bar */}
      <div className="mb-4 bg-white rounded-3xl p-4 border border-[#FFE2D1] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="w-9 h-9 rounded-2xl bg-[#FFF0E6] text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white flex items-center justify-center font-bold text-sm transition-all border border-[#FFE2D1]"
            title="Back to Dashboard"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-[#1E2022]">
                {board?.name || "Collaborative Canvas"}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Syncing
              </span>
            </div>
            <p className="text-xs text-[#6C757D]">
              Board ID: <span className="font-mono text-[#1E2022]">{boardId}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Share Link Button */}
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-2xl bg-[#FFF0E6] hover:bg-[#FFE2D1] text-[#FF6B00] font-bold text-xs border border-[#FFE2D1] transition-all flex items-center gap-1.5"
          >
            🔗 {copy ? "Copied!" : "Share Link"}
          </button>

          {/* Toggle Live Chat Drawer */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`px-4 py-2 rounded-2xl font-bold text-xs border transition-all flex items-center gap-1.5 ${
              isChatOpen
                ? "bg-[#FF6B00] text-white border-[#FF6B00] shadow-sm"
                : "bg-white text-[#6C757D] border-[#FFE2D1] hover:text-[#FF6B00]"
            }`}
          >
            💬 Chat ({chatMessages.length})
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 relative items-start">
        {/* LEFT SIDE - Canvas & Tool Dock Container */}
        <div className="flex-1 w-full flex flex-col items-center relative">
          {/* Floating Pill Tool Dock matching Warm Orange Aesthetic */}
          <div className="z-20 mb-3 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-3xl shadow-[0_10px_30px_rgba(255,107,0,0.08)] border border-[#FFE2D1] flex flex-wrap items-center justify-center gap-3 transition-all">
            {/* Tool Selection */}
            <div className="flex items-center bg-[#FFF8F4] p-1 rounded-2xl border border-[#FFE2D1]">
              <button
                onClick={() => setTool("rectangle")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  tool === "rectangle"
                    ? "bg-[#FF6B00] text-white shadow-sm"
                    : "text-[#6C757D] hover:text-[#FF6B00]"
                }`}
              >
                🟦 Rectangle
              </button>

              <button
                onClick={() => setTool("pen")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  tool === "pen"
                    ? "bg-[#FF6B00] text-white shadow-sm"
                    : "text-[#6C757D] hover:text-[#FF6B00]"
                }`}
              >
                ✏️ Pen
              </button>

              <button
                onClick={() => setTool("eraser")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  tool === "eraser"
                    ? "bg-red-500 text-white shadow-sm"
                    : "text-[#6C757D] hover:text-red-500"
                }`}
              >
                🧽 Eraser
              </button>
            </div>

            {/* Color Swatch Picker */}
            {tool !== "eraser" && (
              <div className="flex items-center gap-1.5 px-2 border-l border-r border-[#FFE2D1]">
                {["#1E2022", "#FF6B00", "#2563EB", "#16A34A", "#DC2626"].map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      selectedColor === color ? "scale-125 ring-2 ring-[#FF6B00] ring-offset-2" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}

            {/* Stroke Width Selector */}
            {tool !== "eraser" && (
              <div className="flex items-center gap-1 bg-[#FFF8F4] p-1 rounded-xl text-xs border border-[#FFE2D1]">
                {[2, 4, 8].map((w) => (
                  <button
                    key={w}
                    onClick={() => setSelectedStrokeWidth(w)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                      selectedStrokeWidth === w
                        ? "bg-[#FF6B00] text-white"
                        : "text-[#6C757D] hover:text-[#FF6B00]"
                    }`}
                  >
                    {w === 2 ? "Thin" : w === 4 ? "Med" : "Thick"}
                  </button>
                ))}
              </div>
            )}

            {/* Undo / Redo Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={undoLast}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FFF0E6] text-[#FF6B00] hover:bg-[#FFE2D1] border border-[#FFE2D1] transition-all"
                title="Undo last action"
              >
                ↩️ Undo
              </button>
              <button
                onClick={redoLast}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FFF0E6] text-[#FF6B00] hover:bg-[#FFE2D1] border border-[#FFE2D1] transition-all"
                title="Redo action"
              >
                ↪️ Redo
              </button>
            </div>

            {/* AI Wireframe to Code Trigger Button */}
            <button
              onClick={() => setIsCodeGenOpen(true)}
              className="px-4 py-1.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] via-[#FF7A00] to-[#FF8800] hover:from-[#E05D00] hover:to-[#FF6B00] text-white text-xs font-extrabold shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95"
              title="Generate React or HTML code from this wireframe sketch"
            >
              ✨ AI Code Gen
            </button>
          </div>

          {/* Interactive Konva Whiteboard Canvas Area */}
          <div className="w-full h-[620px] rounded-3xl border border-[#FFE2D1] bg-dot-pattern shadow-sm overflow-hidden relative">
            <Stage
              ref={stageRef}
              width={window.innerWidth - (isChatOpen ? 380 : 80)}
              height={620}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <Layer>
                {elements.map((el) => {
                  if (el.type === "rectangle") {
                    return <Rect key={el.element_id} {...el.data} />;
                  }

                  if (el.type === "line") {
                    return (
                      <Line
                        key={el.element_id}
                        points={el.data.points}
                        stroke={el.data.color}
                        strokeWidth={el.data.strokeWidth}
                        lineCap="round"
                        lineJoin="round"
                      />
                    );
                  }

                  return null;
                })}

                {newRect && <Rect {...newRect} dash={[5, 5]} />}

                {tool === "eraser" && (
                  <Circle
                    x={cursor.x}
                    y={cursor.y}
                    radius={12}
                    fill="#FF6B00"
                    opacity={0.3}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* RIGHT SIDE - Live Chat Panel (Collapsible) */}
        {isChatOpen && (
          <div className="w-full md:w-[320px] h-[680px] shrink-0 flex flex-col bg-white rounded-3xl border border-[#FFE2D1] shadow-[0_10px_30px_rgba(255,107,0,0.06)] overflow-hidden transition-all">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#FFE2D1] bg-[#FFF8F4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-[#FFF0E6] text-[#FF6B00] font-bold text-sm">
                  💬
                </span>
                <h3 className="font-extrabold text-sm text-[#1E2022]">Live Team Chat</h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Online
              </span>
            </div>

            {/* Chat Stream Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FFF8F4]/30">
              {chatMessages.length === 0 ? (
                <div className="text-center text-xs text-[#6C757D] py-12">
                  No messages yet. Say hi to your team! 👋
                </div>
              ) : (
                chatMessages.map((m, i) => {
                  const isMe = m.user === user;
                  return (
                    <div
                      key={i}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[10px] font-bold text-[#6C757D] mb-1 px-1">
                        {isMe ? "You" : m.user}
                      </span>
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed break-words shadow-sm ${
                          isMe
                            ? "bg-gradient-to-r from-[#FF6B00] to-[#FF8800] text-white rounded-br-none"
                            : "bg-white text-[#1E2022] border border-[#FFE2D1] rounded-bl-none"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input Box */}
            <div className="p-3 border-t border-[#FFE2D1] bg-white flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 rounded-full bg-[#FFF8F4] border border-[#FFE2D1] text-xs text-[#1E2022] placeholder-[#A0AAB0] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30"
              />
              <button
                onClick={sendChat}
                className="w-9 h-9 rounded-full bg-[#FF6B00] hover:bg-[#E05D00] text-white flex items-center justify-center font-bold text-xs shadow-md shadow-orange-500/20 transition-all"
              >
                ➤
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Wireframe to Code Generator Modal */}
      <WireframeCodeModal
        isOpen={isCodeGenOpen}
        onClose={() => setIsCodeGenOpen(false)}
        boardId={boardId}
        stageRef={stageRef}
        elements={elements}
      />
    </div>
  );
}

export default CollaborativeWhiteboard;
