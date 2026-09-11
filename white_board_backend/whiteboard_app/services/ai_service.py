import json
import os
import re
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


def _sanitize_elements(elements):
    """
    Sorts and filters elements into a structured summary for spatial context.
    """
    if not elements or not isinstance(elements, list):
        return []

    processed = []
    for el in elements:
        el_type = el.get("type") or el.get("element_type", "unknown")
        data = el.get("data") or {}
        
        entry = {"type": el_type}
        if el_type == "rectangle":
            entry["x"] = round(data.get("x", 0), 1)
            entry["y"] = round(data.get("y", 0), 1)
            entry["width"] = round(data.get("width", 0), 1)
            entry["height"] = round(data.get("height", 0), 1)
        elif el_type == "line":
            pts = data.get("points", [])
            entry["points_count"] = len(pts) // 2
            if pts:
                xs = pts[0::2]
                ys = pts[1::2]
                entry["x"] = round(min(xs), 1) if xs else 0
                entry["y"] = round(min(ys), 1) if ys else 0
                entry["approx_start"] = [round(pts[0], 1), round(pts[1], 1)]
                entry["approx_end"] = [round(pts[-2], 1), round(pts[-1], 1)]

        elif el_type == "text":
            entry["text"] = data.get("text", "")
            entry["x"] = round(data.get("x", 0), 1)
            entry["y"] = round(data.get("y", 0), 1)
        else:
            entry["details"] = str(data)[:100]

        processed.append(entry)

    # Sort primarily top-to-bottom, secondarily left-to-right
    processed.sort(key=lambda item: (item.get("y", 0), item.get("x", 0)))
    return processed


def generate_ui_from_wireframe(elements, image_data_url=None, framework="react-tailwind", custom_prompt=""):
    """
    Calls Google Gemini Multimodal API to interpret the wireframe layout and generate
    production-ready frontend code with an interactive HTML preview.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not configured in backend environment. "
            "Please add GEMINI_API_KEY=your_key to white_board_backend/.env"
        )

    sanitized_elements = _sanitize_elements(elements)
    mime_type, base64_image = _clean_base64(image_data_url)

    target_desc = (
        "a self-contained React functional component (JSX) using modern Tailwind CSS classes"
        if framework == "react-tailwind"
        else "semantic HTML5 markup styled with modern Tailwind CSS classes"
    )

    system_instructions = f"""You are a world-class Senior UI/UX Engineer and Frontend Architect.
A user has sketched a UI wireframe on a collaborative whiteboard.
Your task is to analyze the wireframe's visual layout and geometric structure, and generate high quality, production-ready frontend code.

Output Specification:
1. Target: {target_desc}.
2. Interpretation:
   - Identify header/navigation bars, sidebars, hero sections, card grids, forms, inputs, and action buttons based on relative positions and dimensions.
   - Use beautiful modern Tailwind CSS styling (responsive flexbox/grid, elegant borders, shadows, subtle gradients, accessible padding and typography).
   - If interactive (e.g. React), include useState hooks for common interactive elements (active tab, search input, button clicks).
   - Use clean, semantic tags (nav, aside, main, header, section, button, input).
   - DO NOT include markdown code fence formatting (like ```json or ```jsx) in the JSON strings. The response must be pure valid JSON.

Required JSON Structure:
{{
  "framework": "{framework}",
  "explanation": "2-3 sentences explaining how the wireframe was interpreted into UI sections.",
  "code": "The full source code of the component.",
  "preview_html": "A complete standalone HTML document string starting with <!DOCTYPE html> containing <script src=\\"https://cdn.tailwindcss.com\\"></script> in the head, and the rendered UI inside the body, ready to display in a sandboxed iframe."
}}
"""

    user_text_parts = [
        f"Wireframe Elements Metadata (sorted top-to-bottom):\n{json.dumps(sanitized_elements, indent=2)}\n"
    ]
    if custom_prompt:
        user_text_parts.append(f"User Design Instructions: {custom_prompt}\n")
    if base64_image:
        user_text_parts.append("Refer closely to the attached wireframe canvas snapshot for visual hierarchy, layout boundaries, and annotations.")

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
            "temperature": 0.2
        }
    }

    # Try gemini-2.5-flash first, fallback to gemini-1.5-flash
    models_to_try = ["gemini-2.5-flash", "gemini-1.5-flash"]
    last_error = None

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            resp = requests.post(
                url,
                headers={"Content-Type": "application/json"},
                data=json.dumps(payload),
                timeout=45
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
                    # If model returned text wrapped with markdown fences, strip them
                    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content_text)
                    if match:
                        return json.loads(match.group(1))
                    raise ValueError(f"Could not parse response as JSON: {content_text[:200]}")

            elif resp.status_code in (404, 400):
                last_error = f"Gemini API returned status {resp.status_code}: {resp.text}"
                continue
            else:
                resp.raise_for_status()

        except Exception as e:
            last_error = str(e)
            continue

    raise RuntimeError(f"Failed to generate code with Gemini: {last_error}")
