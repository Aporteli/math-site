export interface GeometryQuantity {
  id: string;
  latex: string;
  numeric: number | null;
}

export interface GeometrySolution {
  latex: string;
  numeric: number | null;
}

export interface GeometryResult {
  mode: 'compute' | 'solve';
  shape: string;
  solutions: GeometrySolution[];
  quantities: GeometryQuantity[];
}

export const GEOMETRY_HISTORY_KEY = 'mathlab.geometry.history';

export type ShapeId =
  | 'rectangle'
  | 'square'
  | 'circle'
  | 'triangle'
  | 'rightTriangle'
  | 'trapezoid'
  | 'regularPolygon'
  | 'cube'
  | 'rectangularPrism'
  | 'triangularPrism'
  | 'cylinder'
  | 'squarePyramid'
  | 'cone'
  | 'sphere';

export const SHAPE_FIELDS: Record<ShapeId, string[]> = {
  rectangle: ['a', 'b'],
  square: ['a'],
  circle: ['r'],
  triangle: ['a', 'b', 'c'],
  rightTriangle: ['a', 'b'],
  trapezoid: ['a', 'b', 'h'],
  regularPolygon: ['n', 'a'],
  cube: ['a'],
  rectangularPrism: ['a', 'b', 'c'],
  triangularPrism: ['a', 'b', 'c', 'l'],
  cylinder: ['r', 'h'],
  squarePyramid: ['a', 'h'],
  cone: ['r', 'h'],
  sphere: ['r'],
};

export const SHAPE_TARGETS: Record<ShapeId, string[]> = {
  rectangle: ['perimeter', 'area'],
  square: ['perimeter', 'area'],
  circle: ['perimeter', 'area'],
  triangle: ['perimeter', 'area'],
  rightTriangle: ['perimeter', 'area'],
  trapezoid: ['perimeter', 'area'],
  regularPolygon: ['perimeter', 'area'],
  cube: ['surface', 'volume'],
  rectangularPrism: ['surface', 'volume'],
  triangularPrism: ['surface', 'volume', 'lateral'],
  cylinder: ['surface', 'volume', 'lateral'],
  squarePyramid: ['surface', 'volume', 'lateral'],
  cone: ['surface', 'volume', 'lateral'],
  sphere: ['surface', 'volume'],
};

export const SHAPE_GROUPS: { id: '2d' | '3d'; shapes: ShapeId[] }[] = [
  { id: '2d', shapes: ['rectangle', 'square', 'circle', 'triangle', 'rightTriangle', 'trapezoid', 'regularPolygon'] },
  { id: '3d', shapes: ['cube', 'rectangularPrism', 'triangularPrism', 'cylinder', 'squarePyramid', 'cone', 'sphere'] },
];

export const SHAPE_DEFAULTS: Record<ShapeId, Record<string, string>> = {
  rectangle: { a: '3', b: '4' },
  square: { a: '5' },
  circle: { r: '3' },
  triangle: { a: '3', b: '4', c: '5' },
  rightTriangle: { a: '3', b: '4' },
  trapezoid: { a: '6', b: '4', h: '3' },
  regularPolygon: { n: '6', a: '2' },
  cube: { a: '2' },
  rectangularPrism: { a: '2', b: '3', c: '4' },
  triangularPrism: { a: '3', b: '4', c: '5', l: '10' },
  cylinder: { r: '2', h: '5' },
  squarePyramid: { a: '6', h: '4' },
  cone: { r: '3', h: '4' },
  sphere: { r: '3' },
};

export interface GeometryExample {
  label: string;
  shape: ShapeId;
  params: Record<string, string>;
  target: string;
  targetValue: string;
  variable: string;
}

export const GEOMETRY_EXAMPLES: GeometryExample[] = [
  { label: 'sphere r=3', shape: 'sphere', params: { r: '3' }, target: '', targetValue: '', variable: 'x' },
  { label: 'cone 3-4-5', shape: 'cone', params: { r: '3', h: '4' }, target: '', targetValue: '', variable: 'x' },
  { label: '3-4-5', shape: 'triangle', params: { a: '3', b: '4', c: '5' }, target: '', targetValue: '', variable: 'x' },
  { label: 'cube a=2', shape: 'cube', params: { a: '2' }, target: '', targetValue: '', variable: 'x' },
  { label: '2×3×4', shape: 'rectangularPrism', params: { a: '2', b: '3', c: '4' }, target: '', targetValue: '', variable: 'x' },
  { label: 'pyramid', shape: 'squarePyramid', params: { a: '6', h: '4' }, target: '', targetValue: '', variable: 'x' },
  { label: 'hexagon', shape: 'regularPolygon', params: { n: '6', a: '2' }, target: '', targetValue: '', variable: 'x' },
  { label: 'V=12π', shape: 'cone', params: { r: 'x', h: '4' }, target: 'volume', targetValue: '12*pi', variable: 'x' },
];

export interface GeometryHistoryItem extends GeometryExample {}
