import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { generateCodeFromWireframe } from "../api/apiService";
import { exportElementsToSVG, downloadSVGFile } from "../utils/svgExport";

export default function WireframeCodeModal({
  isOpen,
  onClose,
  boardId,
  stageRef,
  elements,
}) {
  const [framework, setFramework] = useState("react-tailwind");
  const [customPrompt, setCustomPrompt] = useState("");
  const [canvasImage, setCanvasImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState("preview"); // "preview" or "code"
  const [deviceView, setDeviceView] = useState("desktop"); // "desktop", "tablet", "mobile"
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Capture canvas snapshot whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      if (stageRef?.current) {
        try {
          const dataUrl = stageRef.current.toDataURL({ pixelRatio: 1.5 });
          setCanvasImage(dataUrl);
        } catch (err) {
          console.warn("Could not capture stage snapshot:", err);
        }
      }
    }
  }, [isOpen, stageRef]);

  // Handle step animation during loading
  useEffect(() => {
    let timer;
    if (loading) {
      setLoadingStep(0);
      timer = setInterval(() => {
        setLoadingStep((prev) => (prev < 2 ? prev + 1 : prev));
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const loadingMessages = [
    "🔍 Scanning wireframe geometry and canvas snapshot...",
    "📐 Analyzing spatial hierarchy, headers, and UI elements...",
    "✨ Generating clean, responsive Tailwind CSS code...",
  ];

  const handleGenerate = async () => {
    if ((!elements || elements.length === 0) && !canvasImage) {
      toast.error("Please draw some shapes or lines on the canvas first!");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        elements: elements || [],
        image: canvasImage,
        framework,
        custom_prompt: customPrompt,
      };

      const response = await generateCodeFromWireframe(boardId, payload);
      setResult(response);
      setActiveTab("preview");
      toast.success("UI code successfully generated!", { icon: "🚀" });
    } catch (err) {
      console.error(err);
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        "Failed to generate code. Please check your Gemini API key on backend.";
      toast.error(errorMsg, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!result?.code) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      toast.success("Code copied to clipboard!", { icon: "📋" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code.");
    }
  };

  const handleDownload = () => {
    if (!result?.code) return;
    const extension = framework === "react-tailwind" ? "jsx" : "html";
    const filename = `GeneratedWireframe.${extension}`;
    const blob = new Blob([result.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`, { icon: "💾" });
  };

  // Export SVG from generated code/HTML or whiteboard elements
  const handleExportSVG = useCallback(() => {
    try {
      // 1. Check if generated preview or code contains SVG markup
      const svgMatch =
        result?.preview_html?.match(/<svg[\s\S]*?<\/svg>/i) ||
        result?.code?.match(/<svg[\s\S]*?<\/svg>/i);

      if (svgMatch && svgMatch[0]) {
        let svgStr = svgMatch[0];
        if (!svgStr.includes("xmlns=")) {
          svgStr = svgStr.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        downloadSVGFile(svgStr, `wireframe-design-${boardId || "export"}.svg`);
        toast.success("Vector SVG downloaded successfully!", { icon: "🎨" });
        return;
      }

      // 2. Fallback: Export whiteboard elements directly to SVG
      const svgString = exportElementsToSVG(elements);
      downloadSVGFile(svgString, `whiteboard-${boardId || "sketch"}.svg`);
      toast.success("Whiteboard SVG exported successfully!", { icon: "🎨" });
    } catch (err) {
      console.error("Export SVG error:", err);
      toast.error("Failed to export SVG.");
    }
  }, [result, elements, boardId]);

  // Listen for SVG export requests forwarded from inside the preview iframe
  useEffect(() => {
    if (!isOpen) return;
    const handleWindowMessage = (event) => {
      if (event.data?.type === "EXPORT_SVG_REQUEST") {
        handleExportSVG();
      }
    };
    window.addEventListener("message", handleWindowMessage);
    return () => window.removeEventListener("message", handleWindowMessage);
  }, [isOpen, handleExportSVG]);

  // Enhances preview HTML with SVG download handling and prevents sandbox alert exceptions
  const preparePreviewHtml = (rawHtml) => {
    if (!rawHtml) return "<html><body>No preview available</body></html>";

    const interceptorScript = `
<script>
(function() {
  // Prevent alert() from crashing in sandbox and provide friendly log
  window.alert = function(msg) {
    console.log("[Preview Notification]:", msg);
  };

  function triggerSvgDownload(svgContent, filename) {
    try {
      const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "wireframe-vector-export.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("Iframe direct download failed, delegating to parent window:", err);
      window.parent.postMessage({ type: "EXPORT_SVG_REQUEST" }, "*");
    }
  }

  // Intercept any click on buttons or links containing "export svg"
  document.addEventListener("click", function(e) {
    const target = e.target.closest("button, a");
    if (!target) return;

    const text = (target.innerText || target.textContent || "").trim().toLowerCase();
    const aria = (target.getAttribute("aria-label") || "").toLowerCase();
    const title = (target.getAttribute("title") || "").toLowerCase();
    const id = (target.id || "").toLowerCase();

    if (
      text.includes("export svg") ||
      text.includes("export as svg") ||
      aria.includes("export svg") ||
      title.includes("export svg") ||
      id.includes("export-svg") ||
      id.includes("btn-svg")
    ) {
      e.preventDefault();
      e.stopPropagation();

      const svgEl = document.querySelector("svg");
      if (svgEl) {
        try {
          const serializer = new XMLSerializer();
          let svgStr = serializer.serializeToString(svgEl);
          if (!svgStr.includes("xmlns=")) {
            svgStr = svgStr.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
          }
          triggerSvgDownload(svgStr, "wireframe-vector-export.svg");
          return;
        } catch (err) {
          console.warn("Could not serialize inner SVG:", err);
        }
      }

      // Delegate to parent container
      window.parent.postMessage({ type: "EXPORT_SVG_REQUEST" }, "*");
    }
  }, true);
})();
</script>
`;

    if (rawHtml.includes("</body>")) {
      return rawHtml.replace("</body>", interceptorScript + "</body>");
    }
    return rawHtml + interceptorScript;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white border border-[#FFE2D1] rounded-3xl shadow-[0_25px_60px_rgba(255,107,0,0.15)] text-[#1E2022] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#FFE2D1] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#FF8800] text-white flex items-center justify-center text-xl font-bold shadow-md shadow-orange-500/20">
              ✨
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1E2022] flex items-center gap-2">
                Wireframe to Code Generator
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FFF0E6] text-[#FF6B00] border border-[#FFE2D1] font-bold">
                  AI Powered
                </span>
              </h2>
              <p className="text-xs text-[#6C757D] font-medium">
                Turn your whiteboard sketch into responsive Tailwind components with live preview
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6C757D] hover:text-[#1E2022] hover:bg-[#FFF0E6] transition-colors font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="px-6 py-3.5 bg-[#FFF9F5] border-b border-[#FFE2D1] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Framework selector */}
            <div className="flex items-center bg-white p-1 rounded-2xl border border-[#FFE2D1] text-xs shadow-sm">
              <button
                type="button"
                onClick={() => setFramework("react-tailwind")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  framework === "react-tailwind"
                    ? "bg-[#FF6B00] text-white shadow-sm"
                    : "text-[#6C757D] hover:text-[#FF6B00]"
                }`}
              >
                ⚛️ React + Tailwind
              </button>
              <button
                type="button"
                onClick={() => setFramework("html-tailwind")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  framework === "html-tailwind"
                    ? "bg-[#FF6B00] text-white shadow-sm"
                    : "text-[#6C757D] hover:text-[#FF6B00]"
                }`}
              >
                🌐 HTML + Tailwind
              </button>
            </div>

            {/* Custom prompt instructions */}
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Design tweaks (e.g. warm orange cards, e-commerce layout)..."
              className="w-72 sm:w-96 px-4 py-2 text-xs rounded-2xl bg-white border border-[#FFE2D1] text-[#1E2022] placeholder-[#A0AAB0] font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FF8800] hover:from-[#E05D00] hover:to-[#FF6B00] text-white text-xs font-bold shadow-md shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Generating Code...
                </>
              ) : (
                <>✨ {result ? "Regenerate Code" : "Generate Code"}</>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FFF8F4] flex flex-col min-h-[420px]">
          
          {/* Loading Animation */}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 gap-6">
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-[#FF6B00]/20 border-t-[#FF6B00] animate-spin" />
                <span className="absolute text-2xl animate-pulse">✨</span>
              </div>
              <div className="text-center space-y-2">
                <h4 className="text-base font-bold text-[#1E2022]">
                  {loadingMessages[loadingStep]}
                </h4>
                <p className="text-xs text-[#6C757D]">
                  Gemini AI is analyzing layout spatial boundaries and compiling Tailwind components...
                </p>
              </div>
            </div>
          )}

          {/* Initial Snapshot Preview */}
          {!loading && !result && (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              {canvasImage ? (
                <div className="flex flex-col items-center gap-4 max-w-md">
                  <div className="p-3 bg-white border border-[#FFE2D1] rounded-3xl shadow-lg max-h-56 overflow-hidden">
                    <img
                      src={canvasImage}
                      alt="Canvas Snapshot"
                      className="max-h-48 object-contain rounded-2xl border border-[#FFE2D1]"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#1E2022]">
                      Wireframe Snapshot Ready
                    </h3>
                    <p className="text-xs text-[#6C757D] mt-1 font-medium">
                      Captured {elements?.length || 0} element(s). Click{" "}
                      <strong className="text-[#FF6B00]">Generate Code</strong> to transform your sketch into production code!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-[#6C757D] text-xs font-medium bg-white p-6 rounded-3xl border border-[#FFE2D1]">
                  Sketch containers, cards, headers, or buttons on your whiteboard, then click Generate Code.
                </div>
              )}
            </div>
          )}

          {/* Result View */}
          {!loading && result && (
            <div className="flex-1 flex flex-col gap-4">
              
              {/* Result Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-[#FFE2D1] shadow-sm">
                
                {/* Tabs */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab("preview")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === "preview"
                        ? "bg-[#FF6B00] text-white shadow-sm"
                        : "text-[#6C757D] hover:text-[#FF6B00]"
                    }`}
                  >
                    🖥️ Live Preview
                  </button>
                  <button
                    onClick={() => setActiveTab("code")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === "code"
                        ? "bg-[#FF6B00] text-white shadow-sm"
                        : "text-[#6C757D] hover:text-[#FF6B00]"
                    }`}
                  >
                    💻 Source Code
                  </button>
                </div>

                {/* Device View Toggles & Export SVG for Live Preview */}
                {activeTab === "preview" && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#FFF8F4] p-1 rounded-xl border border-[#FFE2D1] text-xs">
                      <button
                        onClick={() => setDeviceView("desktop")}
                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                          deviceView === "desktop"
                            ? "bg-white text-[#FF6B00] shadow-sm"
                            : "text-[#6C757D] hover:text-[#FF6B00]"
                        }`}
                        title="Desktop View"
                      >
                        🖥️ Desktop
                      </button>
                      <button
                        onClick={() => setDeviceView("tablet")}
                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                          deviceView === "tablet"
                            ? "bg-white text-[#FF6B00] shadow-sm"
                            : "text-[#6C757D] hover:text-[#FF6B00]"
                        }`}
                        title="Tablet View (768px)"
                      >
                        📱 Tablet
                      </button>
                      <button
                        onClick={() => setDeviceView("mobile")}
                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                          deviceView === "mobile"
                            ? "bg-white text-[#FF6B00] shadow-sm"
                            : "text-[#6C757D] hover:text-[#FF6B00]"
                        }`}
                        title="Mobile View (375px)"
                      >
                        📲 Mobile
                      </button>
                    </div>

                    <button
                      onClick={handleExportSVG}
                      className="px-3.5 py-1.5 rounded-xl bg-[#FFF0E6] hover:bg-[#FFE2D1] text-[#FF6B00] font-bold text-xs flex items-center gap-1.5 border border-[#FFE2D1] transition-all shadow-sm"
                      title="Export design as vector SVG file"
                    >
                      🎨 Export SVG
                    </button>
                  </div>
                )}

                {/* Code actions */}
                {activeTab === "code" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="px-3.5 py-1.5 rounded-xl bg-[#FFF0E6] hover:bg-[#FFE2D1] text-[#FF6B00] font-bold text-xs flex items-center gap-1.5 border border-[#FFE2D1] transition-all"
                    >
                      {copied ? "✅ Copied" : "📋 Copy Code"}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-3.5 py-1.5 rounded-xl bg-[#FFF0E6] hover:bg-[#FFE2D1] text-[#FF6B00] font-bold text-xs flex items-center gap-1.5 border border-[#FFE2D1] transition-all"
                    >
                      💾 Download Code
                    </button>
                    <button
                      onClick={handleExportSVG}
                      className="px-3.5 py-1.5 rounded-xl bg-[#FFF0E6] hover:bg-[#FFE2D1] text-[#FF6B00] font-bold text-xs flex items-center gap-1.5 border border-[#FFE2D1] transition-all shadow-sm"
                      title="Export design as vector SVG file"
                    >
                      🎨 Export SVG
                    </button>
                  </div>
                )}
              </div>

              {/* AI Explanation banner */}
              {result.explanation && (
                <div className="px-4 py-3 rounded-2xl bg-[#FFF0E6] border border-[#FFE2D1] text-xs text-[#C85000] flex items-start gap-2.5 shadow-sm">
                  <span className="text-base">💡</span>
                  <div>
                    <span className="font-extrabold text-[#FF6B00]">Layout Interpretation: </span>
                    <span className="font-medium">{result.explanation}</span>
                  </div>
                </div>
              )}

              {/* Tab 1: Live Preview */}
              {activeTab === "preview" && (
                <div className="flex-1 flex justify-center items-start min-h-[460px] bg-white rounded-2xl p-3 border border-[#FFE2D1] overflow-auto shadow-inner">
                  <div
                    className={`transition-all duration-300 bg-white rounded-2xl shadow-xl overflow-hidden border border-[#FFE2D1] ${
                      deviceView === "desktop"
                        ? "w-full h-[520px]"
                        : deviceView === "tablet"
                        ? "w-[768px] h-[520px]"
                        : "w-[375px] h-[520px]"
                    }`}
                  >
                    <iframe
                      title="Live Wireframe Preview"
                      srcDoc={preparePreviewHtml(result.preview_html)}
                      className="w-full h-full border-none"
                      sandbox="allow-scripts allow-same-origin allow-modals allow-downloads allow-popups allow-forms"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Code Viewer */}
              {activeTab === "code" && (
                <div className="relative flex-1 rounded-2xl bg-[#1E2022] border border-slate-700 overflow-hidden flex flex-col shadow-inner">
                  <pre className="flex-1 p-5 text-xs font-mono text-emerald-400 overflow-auto whitespace-pre leading-relaxed select-all">
                    <code>{result.code}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
