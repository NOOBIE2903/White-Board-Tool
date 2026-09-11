/**
 * Converts Konva / Whiteboard canvas elements into a standard standalone SVG string.
 */
export const exportElementsToSVG = (elements = [], width = 1200, height = 800) => {
  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
  svg += `  <rect width="100%" height="100%" fill="#ffffff" />\n`;

  elements.forEach((el) => {
    const type = el.type || el.element_type;
    const data = el.data || {};

    if (type === "rectangle") {
      const x = Number(data.x) || 0;
      const y = Number(data.y) || 0;
      const w = Number(data.width) || 100;
      const h = Number(data.height) || 100;
      const stroke = data.stroke || "#FF6B00";
      const strokeWidth = Number(data.strokeWidth) || 2;
      const fill = data.fill && data.fill !== "transparent" ? data.fill : "none";
      const rx = Number(data.cornerRadius) || 6;

      svg += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />\n`;
    } else if (type === "line") {
      const points = data.points || [];
      const stroke = data.color || data.stroke || "#FF6B00";
      const strokeWidth = Number(data.strokeWidth) || 2;

      if (points.length >= 2) {
        let d = `M ${points[0]} ${points[1]}`;
        for (let i = 2; i < points.length; i += 2) {
          d += ` L ${points[i]} ${points[i + 1]}`;
        }
        svg += `  <path d="${d}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" />\n`;
      }
    } else if (type === "text") {
      const x = Number(data.x) || 0;
      const y = Number(data.y) || 0;
      const text = data.text || "";
      const fontSize = Number(data.fontSize) || 16;
      const fill = data.fill || "#1E2022";
      svg += `  <text x="${x}" y="${y + fontSize}" font-size="${fontSize}" fill="${fill}" font-family="sans-serif">${text}</text>\n`;
    }
  });

  svg += `</svg>\n`;
  return svg;
};

/**
 * Triggers browser download of an SVG string as a .svg file.
 */
export const downloadSVGFile = (svgString, filename = "whiteboard.svg") => {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

