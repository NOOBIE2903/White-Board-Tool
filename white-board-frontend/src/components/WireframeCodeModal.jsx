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

  // Enhances preview HTML with Lucide icons, CDN dependencies, and SVG download handling
  const preparePreviewHtml = (rawHtml) => {
    if (!rawHtml) return "<html><body>No preview available</body></html>";

    let html = rawHtml;

    // Strip any vanilla lucide CDN script tags that overwrite our React components with raw object descriptors
    html = html.replace(/<script[^>]*src=["'][^"']*lucide[^"']*["'][^>]*>\s*<\/script>/gi, "");

    // Transform any ES module imports in preview HTML to global destructuring
    html = html
      .replace(/import\s+\{([^}]+)\}\s+from\s+['"][^'"]*lucide[^'"]*['"];?/g, "const { $1 } = window.lucide || {};")
      .replace(/import\s+\*\s+as\s+([A-Za-z0-9_]+)\s+from\s+['"][^'"]*lucide[^'"]*['"];?/g, "const $1 = window.lucide;")
      .replace(/import\s+([A-Za-z0-9_]+)\s+from\s+['"][^'"]*lucide[^'"]*['"];?/g, "const $1 = window.lucide;")
      .replace(/import\s+React,?\s*\{?([^}]*)\}?\s+from\s+['"]react['"];?/g, (match, p1) => (p1.trim() ? `const { ${p1} } = React;` : "// React imported"))
      .replace(/import\s+ReactDOM\s+from\s+['"]react-dom['"];?/g, "// ReactDOM imported");

    const headPolyfills = `
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script>
(function() {
  window.alert = function(msg) {
    console.log("[Preview Notification]:", msg);
  };

  // Preview error boundary
  window.addEventListener("error", function(e) {
    console.warn("[Preview Runtime Warning]:", e.message);
    var root = document.getElementById("root");
    if (root && root.children.length === 0) {
      root.innerHTML = '<div style="padding:24px;margin:24px;border-radius:16px;background:#FFF0E6;border:1px solid #FFE2D1;color:#C85000;font-family:sans-serif;">' +
        '<div style="font-weight:bold;margin-bottom:8px;font-size:14px;">⚡ Preview Rendering Notice</div>' +
        '<div style="font-size:12px;opacity:0.9;line-height:1.5;">' + (e.message || "Initializing component...") + '</div>' +
        '</div>';
    }
  });

  var iconPaths = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    layout: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
    barchart: '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
    barchart2: '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
    barchart3: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    piechart: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    trendingup: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    trendingdown: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    trash2: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    chevronright: '<path d="m9 18 6-6-6-6"/>',
    chevrondown: '<path d="m6 9 6 6 6-6"/>',
    chevronup: '<path d="m18 15-6-6-6 6"/>',
    chevronleft: '<path d="m15 18-6-6 6-6"/>',
    arrowright: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    arrowleft: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    sliders: '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
    share2: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    shoppingcart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    creditcard: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    dollarsign: '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.5-8.58 3.9a2 2 0 0 1-1.66 0L2 12.5"/><path d="m22 17.5-8.58 3.9a2 2 0 0 1-1.66 0L2 17.5"/>'
  };

  function createIconComponent(name) {
    var key = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    var path = iconPaths[key] || '<circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/>';

    var DynamicLucideIcon = function(props) {
      props = props || {};
      var size = props.size || 20;
      var strokeWidth = props.strokeWidth || 2;
      var color = props.color || "currentColor";
      var className = props.className || "";

      if (window.React && window.React.createElement) {
        var cleanProps = Object.assign({}, props);
        delete cleanProps.size;
        delete cleanProps.color;
        delete cleanProps.strokeWidth;
        delete cleanProps.className;

        return window.React.createElement("svg", Object.assign({
          xmlns: "http://www.w3.org/2000/svg",
          width: size,
          height: size,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: color,
          strokeWidth: strokeWidth,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          className: className,
          dangerouslySetInnerHTML: { __html: path }
        }, cleanProps));
      }
      return null;
    };

    DynamicLucideIcon.displayName = name || "LucideIcon";
    return DynamicLucideIcon;
  }

  var handler = {
    get: function(target, prop) {
      if (prop === "createIcons") {
        return function() {};
      }
      if (prop === "icons") {
        return new Proxy({}, handler);
      }
      if (typeof prop !== "string" || prop === "$$typeof" || prop === "then" || prop === "default") {
        return undefined;
      }
      return createIconComponent(prop);
    }
  };

  var lucideProxy = new Proxy({}, handler);

  try {
    Object.defineProperty(window, "lucide", {
      get: function() { return lucideProxy; },
      set: function() {},
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(window, "Lucide", {
      get: function() { return lucideProxy; },
      set: function() {},
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(window, "LucideReact", {
      get: function() { return lucideProxy; },
      set: function() {},
      configurable: true,
      enumerable: true
    });
  } catch(e) {
    window.lucide = lucideProxy;
    window.Lucide = lucideProxy;
    window.LucideReact = lucideProxy;
  }
})();
</script>
`;

    // Inject head polyfills immediately after <head> or at beginning
    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>${headPolyfills}`);
    } else if (html.includes("<html>")) {
      html = html.replace("<html>", `<html><head>${headPolyfills}</head>`);
    } else {
      html = `<head>${headPolyfills}</head>${html}`;
    }

    const interceptorScript = `
<script>
(function() {
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

    if (html.includes("</body>")) {
      return html.replace("</body>", interceptorScript + "</body>");
    }
    return html + interceptorScript;
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
