import { Line, Circle, Rect, Arrow, Star, Text } from 'react-konva';
import type { CanvasElement } from '../utils/types';
import { adaptStrokeForTheme } from '../utils/theme';
import { CanvasImageElement } from './CanvasImageElement';

interface ElementRendererProps {
  elements: CanvasElement[];
  activeTool: string;
  isDark: boolean;
  strokeWidth: number;
  editingTextId: string | null;
  onElementClick: (el: CanvasElement) => void;
  onDragEnd: (id: string, e: any) => void;
  onTransformEnd: (id: string, e: any) => void;
}

export function ElementRenderer({
  elements,
  activeTool,
  isDark,
  strokeWidth,
  editingTextId,
  onElementClick,
  onDragEnd,
  onTransformEnd,
}: ElementRendererProps) {
  return (
    <>
      {elements.map((el) => {
        const isListening = activeTool === 'select';
        const displayStroke = adaptStrokeForTheme(el.stroke, isDark);

        if (el.type === 'image' && el.src) {
          return (
            <CanvasImageElement
              key={el.id}
              el={el}
              isListening={isListening}
              activeTool={activeTool}
              onClick={() => onElementClick(el)}
              onDragEnd={(e) => onDragEnd(el.id, e)}
              onTransformEnd={(e) => onTransformEnd(el.id, e)}
            />
          );
        }
        if (el.type === 'freedraw' && el.points) {
          return (
            <Line
              key={el.id}
              id={el.id}
              x={el.x || 0}
              y={el.y || 0}
              rotation={el.rotation || 0}
              scaleX={el.scaleX || 1}
              scaleY={el.scaleY || 1}
              points={el.points}
              stroke={displayStroke}
              strokeWidth={el.strokeWidth}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              hitStrokeWidth={Math.max(28, el.strokeWidth * 3)}
              perfectDrawEnabled={false}
              draggable={activeTool === 'select'}
              onClick={() => onElementClick(el)}
              onTap={() => onElementClick(el)}
              onDragEnd={(e) => onDragEnd(el.id, e)}
              onTransformEnd={(e) => onTransformEnd(el.id, e)}
            />
          );
        }
        if (el.type === 'line' && el.points) {
          return (
            <Line
              key={el.id}
              id={el.id}
              x={el.x || 0}
              y={el.y || 0}
              rotation={el.rotation || 0}
              scaleX={el.scaleX || 1}
              scaleY={el.scaleY || 1}
              points={el.points}
              stroke={displayStroke}
              strokeWidth={el.strokeWidth}
              lineCap="round"
              perfectDrawEnabled={false}
              strokeScaleEnabled={false}
              hitStrokeWidth={Math.max(28, el.strokeWidth * 3)}
              draggable={activeTool === 'select'}
              onClick={() => onElementClick(el)}
              onTap={() => onElementClick(el)}
              onDragEnd={(e) => onDragEnd(el.id, e)}
              onTransformEnd={(e) => onTransformEnd(el.id, e)}
            />
          );
        }
        if (el.type === 'arrow' && el.points) {
          return (
            <Arrow
              key={el.id}
              id={el.id}
              x={el.x || 0}
              y={el.y || 0}
              rotation={el.rotation || 0}
              scaleX={el.scaleX || 1}
              scaleY={el.scaleY || 1}
              points={el.points}
              stroke={displayStroke}
              fill={displayStroke}
              strokeWidth={el.strokeWidth}
              pointerLength={Math.max(8, strokeWidth * 3)}
              pointerWidth={Math.max(8, strokeWidth * 3)}
              perfectDrawEnabled={false}
              strokeScaleEnabled={false}
              hitStrokeWidth={Math.max(28, el.strokeWidth * 3)}
              draggable={activeTool === 'select'}
              onClick={() => onElementClick(el)}
              onTap={() => onElementClick(el)}
              onDragEnd={(e) => onDragEnd(el.id, e)}
              onTransformEnd={(e) => onTransformEnd(el.id, e)}
            />
          );
        }
        if (el.type === 'rect') {
          return (
            <Rect
              key={el.id}
              id={el.id}
              x={el.x}
              y={el.y}
              width={el.width}
              height={el.height}
              rotation={el.rotation || 0}
              scaleX={el.scaleX || 1}
              scaleY={el.scaleY || 1}
              stroke={displayStroke}
              strokeWidth={el.strokeWidth}
              perfectDrawEnabled={false}
              strokeScaleEnabled={false}
              hitStrokeWidth={24}
              draggable={activeTool === 'select'}
              onClick={() => onElementClick(el)}
              onTap={() => onElementClick(el)}
              onDragEnd={(e) => onDragEnd(el.id, e)}
              onTransformEnd={(e) => onTransformEnd(el.id, e)}
            />
          );
        }
        if (el.type === 'circle') {
          return (
            <Circle
              key={el.id}
              id={el.id}
              x={el.x}
              y={el.y}
              radius={el.radius || 10}
              rotation={el.rotation || 0}
              scaleX={el.scaleX || 1}
              scaleY={el.scaleY || 1}
              stroke={displayStroke}
              strokeWidth={el.strokeWidth}
              perfectDrawEnabled={false}
              strokeScaleEnabled={false}
              hitStrokeWidth={24}
              draggable={activeTool === 'select'}
              onClick={() => onElementClick(el)}
              onTap={() => onElementClick(el)}
              onDragEnd={(e) => onDragEnd(el.id, e)}
              onTransformEnd={(e) => onTransformEnd(el.id, e)}
            />
          );
        }
        if (el.type === 'triangle' && el.points) {
          return (
            <Line
              key={el.id}
              id={el.id}
              x={el.x || 0}
              y={el.y || 0}
              rotation={el.rotation || 0}
              scaleX={el.scaleX || 1}
              scaleY={el.scaleY || 1}
              points={el.points}
              closed={true}
              stroke={displayStroke}
              strokeWidth={el.strokeWidth}
              lineJoin="round"
              perfectDrawEnabled={false}
              strokeScaleEnabled={false}
              hitStrokeWidth={24}
              draggable={activeTool === 'select'}
              onClick={() => onElementClick(el)}
              onTap={() => onElementClick(el)}
              onDragEnd={(e) => onDragEnd(el.id, e)}
              onTransformEnd={(e) => onTransformEnd(el.id, e)}
            />
          );
        }
        if (el.type === 'diamond' && el.points) {
          return (
            <Line
              key={el.id}
              id={el.id}
              x={el.x || 0}
              y={el.y || 0}
              rotation={el.rotation || 0}
              scaleX={el.scaleX || 1}
              scaleY={el.scaleY || 1}
              points={el.points}
              closed={true}
              stroke={displayStroke}
              strokeWidth={el.strokeWidth}
              lineJoin="round"
              perfectDrawEnabled={false}
              strokeScaleEnabled={false}
              hitStrokeWidth={24}
              draggable={activeTool === 'select'}
              onClick={() => onElementClick(el)}
              onTap={() => onElementClick(el)}
              onDragEnd={(e) => onDragEnd(el.id, e)}
              onTransformEnd={(e) => onTransformEnd(el.id, e)}
            />
          );
        }
        if (el.type === 'star') {
          return (
            <Star
              key={el.id}
              id={el.id}
              x={el.x}
              y={el.y}
              numPoints={5}
              innerRadius={(el.radius || 30) * 0.4}
              outerRadius={el.radius || 30}
              rotation={el.rotation || 0}
              scaleX={el.scaleX || 1}
              scaleY={el.scaleY || 1}
              stroke={displayStroke}
              strokeWidth={el.strokeWidth}
              perfectDrawEnabled={false}
              strokeScaleEnabled={false}
              hitStrokeWidth={24}
              draggable={activeTool === 'select'}
              onClick={() => onElementClick(el)}
              onTap={() => onElementClick(el)}
              onDragEnd={(e) => onDragEnd(el.id, e)}
              onTransformEnd={(e) => onTransformEnd(el.id, e)}
            />
          );
        }
        if (el.type === 'text') {
          return (
            <Text
              key={el.id}
              id={el.id}
              x={el.x}
              y={el.y}
              width={el.width || 550}
              wrap="word"
              text={el.text || ''}
              fontSize={el.fontSize || 24}
              scaleX={el.scaleX || 1}
              scaleY={el.scaleY || 1}
              rotation={el.rotation || 0}
              fontFamily="system-ui, -apple-system, sans-serif"
              fontStyle="bold"
              lineHeight={1.4}
              fill={displayStroke}
              visible={editingTextId !== el.id}
              listening={isListening}
              draggable={activeTool === 'select'}
              onClick={() => onElementClick(el)}
              onTap={() => onElementClick(el)}
              onDragEnd={(e) => onDragEnd(el.id, e)}
              onTransformEnd={(e) => onTransformEnd(el.id, e)}
            />
          );
        }
        return null;
      })}
    </>
  );
}