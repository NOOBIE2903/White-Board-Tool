import React, { act, useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Circle } from "react-konva";
import { useParams } from "react-router-dom";
import { getWhiteboardDetails } from "../api/apiService";
import toast from "react-hot-toast";

function CollaborativeWhiteboard() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  // const [elements, setElements] = useState(null);
  // const [lines, setLines] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [tool, setTool] = useState("rectangle");
  const wsRef = useRef(null);
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  // const [rectangles, setRectangles] = useState([]);
  const [newRect, setNewRect] = useState(null);
  // const [history, setHistory] = useState([]);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [actions, setActions] = useState([]);
  // const [actionIndex, setActionIndex] = useState(0);
  const currentDrawingId = useRef();
  const [redoStack, setRedoStack] = useState([]);
  const [copy, setCopy] = useState(false);
  const [elements, setElements] = useState([]);
  const erasingRef = useRef(false);
  const [user, setUser] = useState("");
  const username = "";
  const chatEndRef = useRef(null);

  // const isPointInsideRect = (x, y, rect) => {
  //   return (
  //     x >= rect.x &&
  //     x <= rect.x + rect.width &&
  //     y >= rect.y &&
  //     y <= rect.y + rect.height
  //   );
  // };

  useEffect(() => {
    const username = localStorage.getItem("username");
    setUser(username || "Anonymous");
  }, []);

  const getKey = (el) => el.element_id;

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
      const data = await getWhiteboardDetails(boardId);

      const normalized = (data.elements || []).map((el) => ({
        ...el,
        id: el.element_id,
      }));

      setBoard(data);
      setElements(normalized);
    };
    fetchWhiteboard();
  }, [boardId]);

  // 🟢 Initialize WebSocket
  useEffect(() => {
    const WS_BASE = import.meta.env.VITE_WS_BASE_URL;
    const token = localStorage.getItem("accessToken");
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(
      `${wsProtocol}://white-board-tool-backend.onrender.com/ws/whiteboard/${boardId}/?token=${token}`
    );

    socket.onopen = () => console.log("✅ Connected to WebSocket");
    socket.onclose = () => console.log("❌ Disconnected from WebSocket");
    socket.onerror = (e) => console.error("⚠️ WebSocket error", e);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 Received:", data);

      switch (data.action) {
        case "add_element":
          // if (data.user === user) return;
          // setElements(prev => {
          //   const exists = prev.some(
          //     el => el.element_id === data.payload.element_id
          //   );
          //   return exists ? prev : [...prev, data.payload];
          // });
          setElements((prev) => {
            const exists = prev.some(
              (el) => el.element_id === data.payload.element_id
            );
            return exists ? prev : [...prev, data.payload];
          });
          break;
        case "draw":
          // if (data.user === user) return;
          // setElements(prev =>
          //   prev.map(el =>
          //     el.element_id === data.payload.element_id
          //       ? data.payload
          //       : el
          //   )
          // );
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
          // setUser(data.user);
          setChatMessages((prev) => [
            ...prev,
            { user: data.user, text: data.payload.text },
          ]);
          break;
        case "chat_history":
          setChatMessages(data.payload);
          break;
        case "delete_element":
          // setElements(prev =>
          //   prev.filter(el => el.element_id !== data.payload.element_id)
          // );
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
          if (data.payload.type == "delete") {
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
  const button = e.evt.button; // 0 = left, 2 = right

  // ✏️🧽 PEN / ERASER → RIGHT CLICK ONLY
  if ((tool === "pen" || tool === "eraser") && button === 2) {
    isDrawing.current = true;

    const pos = e.target.getStage().getPointerPosition();
    const strokeColor = tool === "eraser" ? "#1e293b" : "#ffffff";
    const strokeWidth = tool === "eraser" ? 20 : 2;
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

  // 🟦 RECTANGLE → LEFT CLICK ONLY
  if (tool === "rectangle" && button === 0) {
    const pos = e.target.getStage().getPointerPosition();
    startPos.current = pos;

    setNewRect({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      stroke: "#00ff88",
      strokeWidth: 2,
    });

    isDrawing.current = true;
  }
};

  const handleMouseMove = (e) => {
  // 🚨 STOP drawing if right button is NOT pressed
  if (
    !isDrawing.current ||
    ((tool === "pen" || tool === "eraser") && e.evt.buttons !== 2)
  ) {
    isDrawing.current = false;
    return;
  }

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
    const ERASE_RADIUS = 10;

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

      // ✅ KEEP redoStack + actions LOGIC UNCHANGED
      if (deleted) {
        erasingRef.current = true;

        setActions((prevActions) => [
          ...prevActions,
          {
            type: "delete",
            element: deleted,
          },
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

  // const newAction = {
  //   id: actionIndex + 1,
  //   type: tool,
  //   // data: tool == "rectangle" ? newRect : lines[lines.length - 1],
  // };
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

    setActions((prev) => [
      ...prev,
      {
        type: "add",
        element: finalLine,
      },
    ]);

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

    setActions((prev) => [
      ...prev,
      {
        type: "add",
        element: rectElement,
      },
    ]);

    setRedoStack([]);

    setNewRect(null);
  }
};

  // const undoLast = () => {
  //   if (!actions.length) return;

  //   const last = actions[actions.length - 1];

  //   setActions((prev) => prev.slice(0, -1));
  //   setRedoStack((prev) => [...prev, last]);

  //   if (last.type === "add") {
  //     setElements((prev) => prev.filter((el) => el.element_id !== last.element.element_id));
  //   }

  //   if (last.type === "delete") {
  //     setElements((prev) => [...prev, last.element]);
  //   }
  // };

  const undoLast = () => {
    wsRef.current?.send(
      JSON.stringify({
        action: "undo",
        user: user || "Anonymous",
      })
    );
  };

  // const redoLast = () => {
  //   if (!redoStack.length) return;

  //   const last = redoStack[redoStack.length - 1];

  //   setRedoStack((prev) => prev.slice(0, -1));
  //   setActions((prev) => [...prev, last]);

  //   if (last.type === "add") {
  //     setElements((prev) => [...prev, last.element]);
  //   }

  //   if (last.type === "delete") {
  //     setElements((prev) =>
  //       prev.filter((el) => el.element_id !== last.element.element_id)
  //     );
  //   }
  // };
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

      toast.success("Link copied to clipboard!", {
        icon: "🔗",
        style: {
          border: "1px solid #10B981",
          padding: "16px",
          color: "#047857",
        },
      });

      setCopy(true);
      setTimeout(() => setCopy(false), 1500);
    } catch (err) {
      console.error("Failed to copy text: ", err);

      toast.error("Could not copy link. Please try again.", {
        duration: 5000,
      });
    }
  };

  // console.log(redoStack);
  // console.log(actionIndex);

  // 🟢 Chat Sending
  const sendChat = () => {
    if (message.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("----------------INSIDE------------------");
      wsRef.current.send(
        JSON.stringify({
          action: "chat",
          payload: {
            text: message,
          },
        })
      );
      setMessage("");
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);
  // console.log(currentUsername)

  // 🟢 Loading state
  if (!board && elements.length === 0)
    return <div className="text-white text-center">Loading...</div>;

  return (
    <div className="p-4 bg-slate-800 rounded-xl text-white min-h-screen">
      <div className="flex gap-4">
        {/* LEFT SIDE - Whiteboard (Responsive) */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Toolbar */}
          <div className="mb-2 flex flex-wrap gap-2">
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

            <button
              onClick={redoLast}
              className="px-3 py-1 rounded bg-orange-600"
            >
              ↪️ Redo
            </button>

            <button onClick={handleCopy}>
              {copy ? "Copied!" : "Copy Link"}
            </button>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-hidden rounded-lg border border-slate-600">
            <Stage
              width={window.innerWidth - 380}
              height={window.innerHeight - 160}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onContextMenu={(e) => e.evt.preventDefault()}
              style={{ background: "#1e293b" }}
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
                    radius={10}
                    fill="#1e993b"
                    opacity={0.8}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* RIGHT SIDE - Chat (FIXED SIZE) */}
        <div className="w-[300px] h-[600px] shrink-0 flex flex-col bg-slate-700 rounded-xl shadow-xl">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-600 flex justify-between">
            <h3 className="font-semibold">💬 Live Chat</h3>
            <span className="text-xs text-emerald-400">Online</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {chatMessages.map((m, i) => {
              const isMe = m.user === user;

              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[85%] bg-slate-600 px-4 py-2 rounded-xl shadow">
                    <div className="text-[11px] font-semibold opacity-80 mb-1">
                      {isMe ? `(me) ${m.user}` : m.user}
                    </div>
                    <div className="break-words">{m.text}</div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-600 flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 rounded-full bg-slate-800 text-white focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={sendChat}
              className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-500"
            >
              ➤
            </button>
          </div>
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
