export interface VecCurveResult {
    variable: string;
    tValueLatex: string;
    tValueNumeric: number | null;
    tMinLatex: string;
    tMaxLatex: string;
    tMinNumeric: number | null;
    tMaxNumeric: number | null;
    rLatex: string;
    rpLatex: string;
    r0Latex: string;
    rp0Latex: string;
    x0Numeric: number | null;
    y0Numeric: number | null;
    dx0Numeric: number | null;
    dy0Numeric: number | null;
    d2x0Numeric: number | null;
    d2y0Numeric: number | null;
    speedLatex: string;
    speedNumeric: number | null;
    unitTangentLatex: string;
    unitTangentNumeric: [number | null, number | null];
    unitNormalLatex: string;
    unitNormalNumeric: [number | null, number | null];
    curvatureLatex: string;
    curvatureNumeric: number | null;
    tangentLineLatex: string;
    normalLineLatex: string;
    arcLengthNumeric: number | null;
    curvePoints: [number, number, number][];
    plotBounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  }
  
  export const VEC_CURVE_HISTORY_KEY = 'pinf.vectorcurve.history';
  
  export interface VecCurveInput {
    xExpr: string;
    yExpr: string;
    variable: string;
    tValue: string;
    tMin: string;
    tMax: string;
  }
  
  export interface VecCurveHistoryItem extends VecCurveInput {}
  
  export const VEC_CURVE_VARIABLES = ['t', 's', 'u'] as const;
  
  export const VEC_CURVE_EXAMPLES: (VecCurveInput & { label: string })[] = [
    {
      label: 'r(t) = √t i + (2−t) j',
      xExpr: 'sqrt(t)', yExpr: '2 - t',
      variable: 't', tValue: '1', tMin: '0', tMax: '5',
    },
    {
      label: 'circle',
      xExpr: 'cos(t)', yExpr: 'sin(t)',
      variable: 't', tValue: 'pi/4', tMin: '0', tMax: '2*pi',
    },
    {
      label: 'parabola',
      xExpr: 't', yExpr: 't^2',
      variable: 't', tValue: '1', tMin: '-3', tMax: '3',
    },
    {
      label: 'cubic',
      xExpr: 't^3 - 3*t', yExpr: 't^2 - 1',
      variable: 't', tValue: '1', tMin: '-2', tMax: '2',
    },
    {
      label: 'spiral',
      xExpr: 't*cos(t)', yExpr: 't*sin(t)',
      variable: 't', tValue: '2', tMin: '0', tMax: '4*pi',
    },
    {
      label: 'ellipse',
      xExpr: '3*cos(t)', yExpr: '2*sin(t)',
      variable: 't', tValue: 'pi/3', tMin: '0', tMax: '2*pi',
    },
  ];