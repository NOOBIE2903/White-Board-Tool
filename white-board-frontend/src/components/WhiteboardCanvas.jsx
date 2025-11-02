import React from "react";
import { Stage, Rect, Layer, Text, Line } from "react-konva";

const WhiteboardCanvas = ({ elements }) => {
  return (
    <Stage width={window.innerWidth} height={window.innerHeight - 100}>
      <Layer>
        {elements.map((el) => {
          switch (el.element_type) {
            case "rectangle":
              return (
                <React.Fragment key={el.element_id}>
                  <Rect
                    x={el.data.x}
                    y={el.data.y}
                    width={el.data.width}
                    height={el.data.height}
                    fill={el.data.fill}
                    stroke={el.data.stroke}
                    strokeWidth={el.data.strokeWidth}
                    cornerRadius={5}
                  />
                  {el.data.text && (
                    <Text
                      text={el.data.text}
                      x={el.data.x + 10}
                      y={el.data.y + 10}
                      fontSize={el.data.fontSize || 14}
                      fontFamily={el.data.fontFamily || "Arial"}
                      fill="#000"
                      width={el.data.width - 20}
                    />
                  )}
                </React.Fragment>
              );

            case "line":
              return (
                <Line
                  key={el.element_id}
                  points={el.data.points}
                  stroke={el.data.stroke || "black"}
                  strokeWidth={el.data.strokeWidth || 2}
                />
              );

            case "text":
              return (
                <Text
                  key={el.element_id}
                  text={el.data.text}
                  x={el.data.x}
                  y={el.data.y}
                  fontSize={el.data.fontSize || 16}
                  fontFamily={el.data.fontFamily || "Arial"}
                  fill={el.data.fill || "black"}
                />
              );

            default:
              return null;
          }
        })}
      </Layer>
    </Stage>
  );
};

export default WhiteboardCanvas;
