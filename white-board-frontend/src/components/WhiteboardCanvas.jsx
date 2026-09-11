import React, { useState, useEffect } from "react";
import { Stage, Rect, Layer, Text, Line } from "react-konva";

const WhiteboardCanvas = ({ elements = [] }) => {
  const [size, setSize] = useState({
    width: 800,
    height: 500,
  });

  useEffect(() => {
    const handleResize = () =>
      setSize({
        width: Math.min(window.innerWidth - 80, 1000),
        height: 550,
      });

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[#FFE2D1] bg-dot-pattern shadow-inner flex justify-center">
      <Stage width={size.width} height={size.height}>
        <Layer>
          {(elements || []).map((el, idx) => {
            const type = el.element_type || el.type;
            const elementId = el.element_id || el.id || idx;
            switch (type) {
              case "rectangle":
                return (
                  <React.Fragment key={elementId}>
                    <Rect
                      x={el.data?.x || 0}
                      y={el.data?.y || 0}
                      width={el.data?.width || 100}
                      height={el.data?.height || 100}
                      fill={el.data?.fill || "transparent"}
                      stroke={el.data?.stroke || "#FF6B00"}
                      strokeWidth={el.data?.strokeWidth || 2}
                      cornerRadius={6}
                    />
                    {el.data?.text && (
                      <Text
                        text={el.data.text}
                        x={(el.data?.x || 0) + 10}
                        y={(el.data?.y || 0) + 10}
                        fontSize={el.data.fontSize || 14}
                        fontFamily={el.data.fontFamily || "Plus Jakarta Sans"}
                        fill={el.data.textColor || "#1E2022"}
                        width={(el.data?.width || 100) - 20}
                      />
                    )}
                  </React.Fragment>
                );

              case "line":
                return (
                  <Line
                    key={elementId}
                    points={el.data?.points || []}
                    stroke={el.data?.color || el.data?.stroke || "#FF6B00"}
                    strokeWidth={el.data?.strokeWidth || 2}
                    lineCap="round"
                    lineJoin="round"
                  />
                );

              case "text":
                return (
                  <Text
                    key={elementId}
                    text={el.data?.text || ""}
                    x={el.data?.x || 0}
                    y={el.data?.y || 0}
                    fontSize={el.data?.fontSize || 16}
                    fontFamily={el.data?.fontFamily || "Plus Jakarta Sans"}
                    fill={el.data?.fill || "#1E2022"}
                  />
                );

              default:
                return null;
            }
          })}
        </Layer>
      </Stage>
    </div>
  );
};

export default WhiteboardCanvas;
