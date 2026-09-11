import json
import os
import re
import time
import requests


def _clean_base64(data_url: str):
    """
    Extracts raw base64 data and mime type from a data URL string.
    Example: 'data:image/png;base64,iVBORw0KGgo...' -> ('image/png', 'iVBORw0KGgo...')
    """
    if not data_url:
        return None, None
    if ";base64," in data_url:
        header, b64_str = data_url.split(";base64,", 1)
        mime = header.replace("data:", "") if header.startswith("data:") else "image/png"
        return mime, b64_str.strip()
    return "image/png", data_url.strip()


def _build_svg_path_from_points(points, max_points=120):
    """
    Converts a flat list of coordinates [x1, y1, x2, y2, ...] into an SVG path 'd' attribute string.
    Smoothly downsamples if the point count is high to keep payload sizes fast and clean.
    """
    if not points or len(points) < 2:
        return ""

    total_pts = len(points) // 2
    if total_pts <= max_points:
        sampled = points
    else:
        step = max(1, total_pts // max_points)
        sampled = []
        for i in range(0, total_pts, step):
            idx = i * 2
            if idx + 1 < len(points):
                sampled.extend([points[idx], points[idx + 1]])
        # Ensure the final point is included
        if len(points) >= 2 and [sampled[-2], sampled[-1]] != [points[-2], points[-1]]:
            sampled.extend([points[-2], points[-1]])

    d = f"M {round(sampled[0], 1)} {round(sampled[1], 1)}"
    for i in range(2, len(sampled), 2):
        d += f" L {round(sampled[i], 1)} {round(sampled[i + 1], 1)}"
    return d


def generate_board_svg(elements, width=1200, height=800):
    """
    Generates a clean standalone SVG string representing all elements drawn on the whiteboard.
    """
    if not elements:
        return (
            f'<svg id="board-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
            f'width="100%" height="100%"><rect width="100%" height="100%" fill="transparent"/></svg>'
        )

    svg_parts = [
        f'<svg id="board-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="100%" height="100%" className="w-full h-full">'
    ]

    for el in elements:
        el_type = el.get("type") or el.get("element_type", "unknown")
        data = el.get("data") or {}

        if el_type == "rectangle":
            x = round(float(data.get("x", 0)), 1)
            y = round(float(data.get("y", 0)), 1)
            w = round(float(data.get("width", 100)), 1)
            h = round(float(data.get("height", 100)), 1)
            stroke = data.get("stroke") or "#FF6B00"
            stroke_width = data.get("strokeWidth", 2)
            fill = data.get("fill") if data.get("fill") and data.get("fill") != "transparent" else "none"
            rx = round(float(data.get("cornerRadius", 6)), 1)
            svg_parts.append(
                f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
                f'stroke="{stroke}" strokeWidth="{stroke_width}" fill="{fill}" />'
            )
        elif el_type == "line":
            pts = data.get("points", [])
            stroke = data.get("color") or data.get("stroke") or "#FF6B00"
            stroke_width = data.get("strokeWidth", 2)
            path_d = _build_svg_path_from_points(pts)
            if path_d:
                svg_parts.append(
                    f'  <path d="{path_d}" stroke="{stroke}" strokeWidth="{stroke_width}" '
                    f'fill="none" strokeLinecap="round" strokeLinejoin="round" />'
                )
        elif el_type == "text":
            x = round(float(data.get("x", 0)), 1)
            y = round(float(data.get("y", 0)), 1)
            text = str(data.get("text", "")).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            font_size = data.get("fontSize", 16)
            fill = data.get("fill") or "#1E2022"
            svg_parts.append(
                f'  <text x="{x}" y="{y + font_size}" fontSize="{font_size}" fill="{fill}" '
                f'fontFamily="sans-serif">{text}</text>'
            )

    svg_parts.append("</svg>")
    return "\n".join(svg_parts)


def generate_fallback_board_code(elements, framework="react-tailwind", custom_prompt=""):
    """
    Deterministic fallback that renders the whiteboard canvas and the user's vector
    drawing/design directly over it when AI model requests fail or hit quota.
    """
    board_svg = generate_board_svg(elements)

    if framework == "react-tailwind":
        code = f"""import React, {{ useState }} from 'react';

export default function WhiteboardDesign() {{
  const handleExportSVG = () => {{
    const svgEl = document.getElementById('board-svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);
    if (!source.match(/^<svg[^>]+xmlns="/)) {{
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }}
    const blob = new Blob([source], {{ type: 'image/svg+xml;charset=utf-8' }});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'whiteboard-drawing.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }};

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {{/* Header Bar */}}
      <header className="h-14 border-b border-slate-800 bg-slate-900/70 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
          <h1 className="font-semibold text-sm text-slate-200">Whiteboard Canvas</h1>
          <span className="text-xs text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">Live Design</span>
        </div>
        <button
          onClick={{handleExportSVG}}
          className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-sm transition"
        >
          <span>🎨 Export SVG</span>
        </button>
      </header>

      {{/* Whiteboard Screen with Drawing Over It */}}
      <main className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />

        <div className="relative w-full h-full max-w-6xl max-h-[760px] bg-slate-900/40 rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden flex items-center justify-center">
          {board_svg}
        </div>
      </main>
    </div>
  );
}}
"""
        preview_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Whiteboard Screen</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="bg-slate-950 m-0 p-0 overflow-hidden">
  <div id="root"></div>
  <script type="text/babel">
    {code}
    ReactDOM.createRoot(document.getElementById('root')).render(<WhiteboardDesign />);
  </script>
</body>
</html>"""
    else:
        # HTML + Tailwind
        code = f"""<div class="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
  <header class="h-14 border-b border-slate-800 bg-slate-900/70 backdrop-blur px-6 flex items-center justify-between shrink-0">
    <div class="flex items-center space-x-3">
      <div class="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
      <h1 class="font-semibold text-sm text-slate-200">Whiteboard Canvas</h1>
      <span class="text-xs text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">Live Design</span>
    </div>
    <button
      onclick="downloadSvg()"
      class="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-sm transition"
    >
      <span>🎨 Export SVG</span>
    </button>
  </header>

  <main class="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center p-6">
    <div class="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-70"></div>
    <div class="relative w-full h-full max-w-6xl max-h-[760px] bg-slate-900/40 rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden flex items-center justify-center">
      {board_svg.replace('className=', 'class=')}
    </div>
  </main>
</div>
<script>
function downloadSvg() {{
  const svgEl = document.getElementById('board-svg');
  if (!svgEl) return;
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgEl);
  if (!source.match(/^<svg[^>]+xmlns="/)) {{
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }}
  const blob = new Blob([source], {{ type: 'image/svg+xml;charset=utf-8' }});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'whiteboard-drawing.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}}
</script>"""
        preview_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Whiteboard Screen</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 m-0 p-0 overflow-hidden">
  {code}
</body>
</html>"""

    return {
        "framework": framework,
        "explanation": "A clean, modern collaborative whiteboard screen rendering the board's drawing and design directly over the canvas without extra panels.",
        "code": code,
        "preview_html": preview_html,
    }


def _sanitize_elements(elements):
    """
    Sorts and filters elements into a structured summary for spatial and vector context.
    """
    if not elements or not isinstance(elements, list):
        return []

    processed = []
    for el in elements:
        el_type = el.get("type") or el.get("element_type", "unknown")
        data = el.get("data") or {}

        entry = {"type": el_type}
        if el_type == "rectangle":
            entry["x"] = round(float(data.get("x", 0)), 1)
            entry["y"] = round(float(data.get("y", 0)), 1)
            entry["width"] = round(float(data.get("width", 0)), 1)
            entry["height"] = round(float(data.get("height", 0)), 1)
            entry["stroke"] = data.get("stroke") or "#FF6B00"
            entry["fill"] = data.get("fill") if data.get("fill") and data.get("fill") != "transparent" else "none"
            entry["stroke_width"] = data.get("strokeWidth", 2)
            entry["corner_radius"] = data.get("cornerRadius", 6)
        elif el_type == "line":
            pts = data.get("points", [])
            entry["points_count"] = len(pts) // 2
            entry["color"] = data.get("color") or data.get("stroke") or "#FF6B00"
            entry["stroke_width"] = data.get("strokeWidth", 2)
            if pts:
                xs = pts[0::2]
                ys = pts[1::2]
                entry["x"] = round(min(xs), 1) if xs else 0
                entry["y"] = round(min(ys), 1) if ys else 0
                entry["svg_path_d"] = _build_svg_path_from_points(pts)
        elif el_type == "text":
            entry["text"] = data.get("text", "")
            entry["x"] = round(float(data.get("x", 0)), 1)
            entry["y"] = round(float(data.get("y", 0)), 1)
            entry["font_size"] = data.get("fontSize", 16)
            entry["color"] = data.get("fill") or "#1E2022"
        else:
            entry["details"] = str(data)[:100]

        processed.append(entry)

    # Sort primarily top-to-bottom, secondarily left-to-right
    processed.sort(key=lambda item: (item.get("y", 0), item.get("x", 0)))
    return processed


def generate_ui_from_wireframe(elements, image_data_url=None, framework="react-tailwind", custom_prompt=""):
    """
    Interprets the whiteboard elements and canvas snapshot and generates clean frontend code
    rendering the whiteboard screen with the design and drawing directly over it.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not configured in backend environment. "
            "Please add GEMINI_API_KEY=your_key to white_board_backend/.env"
        )

    sanitized_elements = _sanitize_elements(elements)
    board_svg = generate_board_svg(elements)
    mime_type, base64_image = _clean_base64(image_data_url)

    target_desc = (
        "a self-contained React functional component (JSX) using modern Tailwind CSS classes"
        if framework == "react-tailwind"
        else "semantic HTML5 markup styled with modern Tailwind CSS classes"
    )

    system_instructions = f"""You are an expert Frontend Engineer and Canvas UI Developer.
A user has created a drawing / design on a collaborative whiteboard.
Your task is to generate clean, modern frontend code that renders the WHITEBOARD SCREEN with the user's DESIGN AND DRAWING DIRECTLY OVER IT.

CRITICAL DESIGN RULES:
1. ONLY THE BOARD AND THE DESIGN OVER IT:
   - Generate code representing the whiteboard screen: a modern canvas/board workspace with Tailwind CSS styling (e.g. sleek dark or light canvas with subtle dot-grid background, and a minimal header bar with title and "Export SVG" download button).
   - Render the user's actual drawing, vector paths, shapes, and layout DIRECTLY OVER THE BOARD SCREEN.
   - If the user drew UI wireframe components (e.g. buttons, inputs, cards), render them cleanly as styled, functional Tailwind components at their designated positions over the board.
   - If the user drew freehand sketches, lines, connections, or diagrams, render them cleanly as vector SVG paths overlaid directly on the board.

2. ABSOLUTELY NO HALLUCINATED PANELS ("NO PANEL FOR EACH"):
   - NEVER create arbitrary dashboard panels or widgets (NO "System Status" panel, NO "Topology Layers" panel, NO "Time Horizon" panel, NO fake metrics cards like "98.4 GB/s", "12 Routes", "64 Pods", "Packet Efficiency").
   - NEVER create a separate panel for each scribble or idea.
   - The user specifically requested: "only need simple board's drawing over the screen, no panel for each". Keep the screen unified, clean, and faithful to the actual board.

3. Interactivity & Functionality:
   - Target: {target_desc}.
   - Include an Export SVG button that downloads the vector SVG.
   - Use standard inline SVG or safe window.lucide icons (e.g. const {{ Download }} = window.lucide || {{}};).
   - NEVER call alert(), confirm(), or prompt() because modals are disabled in sandboxed iframes.
   - NEVER write raw ES module import statements inside preview_html scripts.

Exact Board Vector SVG Elements:
{board_svg}

Required JSON Structure:
{{
  "framework": "{framework}",
  "explanation": "1-2 concise sentences explaining the board screen and the design drawn over it.",
  "code": "The full source code of the component.",
  "preview_html": "A complete standalone HTML document string starting with <!DOCTYPE html> containing <script src=\\"https://cdn.tailwindcss.com\\"></script> in the head, and the rendered UI inside the body, ready to display in a sandboxed iframe."
}}
"""

    user_text_parts = [
        f"Whiteboard Elements Metadata (sorted top-to-bottom):\n{json.dumps(sanitized_elements, indent=2)}\n"
    ]
    if custom_prompt:
        user_text_parts.append(f"User Design Instructions: {custom_prompt}\n")
    if base64_image:
        user_text_parts.append("Refer closely to the attached whiteboard canvas snapshot for colors, visual hierarchy, and annotations.")

    parts = [{"text": system_instructions + "\n" + "\n".join(user_text_parts)}]

    if base64_image:
        parts.append({
            "inline_data": {
                "mime_type": mime_type or "image/png",
                "data": base64_image
            }
        })

    payload = {
        "contents": [
            {
                "parts": parts
            }
        ],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.1
        }
    }

    configured_model = os.getenv("GEMINI_MODEL")
    default_models = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.1-flash-lite"]
    if configured_model:
        models_to_try = [configured_model] + [m for m in default_models if m != configured_model]
    else:
        models_to_try = default_models

    last_error = None

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        # Retry transient 503/429 spikes up to 2 times
        for attempt in range(2):
            try:
                resp = requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    data=json.dumps(payload),
                    timeout=60
                )

                if resp.status_code == 200:
                    result_json = resp.json()
                    candidates = result_json.get("candidates", [])
                    if not candidates:
                        raise ValueError("No generation candidate returned by Gemini.")

                    content_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")

                    # Parse structured JSON from model
                    try:
                        parsed = json.loads(content_text)
                        return parsed
                    except json.JSONDecodeError:
                        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content_text)
                        if match:
                            return json.loads(match.group(1))
                        raise ValueError(f"Could not parse response as JSON: {content_text[:200]}")

                elif resp.status_code in (503, 429):
                    last_error = f"Model {model} is experiencing high demand (status {resp.status_code})."
                    if attempt == 0:
                        time.sleep(2)
                        continue
                    break

                elif resp.status_code in (404, 400):
                    last_error = f"Gemini API returned status {resp.status_code}: {resp.text}"
                    break
                else:
                    resp.raise_for_status()

            except Exception as e:
                last_error = str(e)
                if attempt == 0 and ("503" in str(e) or "429" in str(e)):
                    time.sleep(2)
                    continue
                break

    # If all remote models hit rate limits or failed, return the high-fidelity board fallback
    print(f"[AI Service] All Gemini models failed or reached quota limit ({last_error}). Using deterministic board generator.")
    return generate_fallback_board_code(elements, framework=framework, custom_prompt=custom_prompt)
