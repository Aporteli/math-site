import { absoluteValueParametricProblem } from "./absolute-value-parametric";
import { compositionOfFunctionsProblem } from "./composition";
import { inverseFunctionsProblem } from "./inverse-functions";
import { graphicalTransformationsProblem } from "./graphical-transformations";
import { polynomialFunctionsProblem } from "./polynomial-functions";
import { exponentialFunctionsProblem } from "./exponential-functions";
import { logarithmicFunctionsProblem } from "./logarithmic-functions";
import { arithmeticProgressionsProblem } from "./arithmetic-progressions";
import { geometricProgressionsProblem } from "./geometric-progressions";
import { infiniteGeometricSeriesProblem } from "./infinite-geometric-series";
import { binomialExpansionProblem } from "./binomial-expansion";
import { domainRangeProblem } from "./domain-range";
import { higherDegreeEquationsInequalitiesProblem } from "./higher-degree-equations";
import { linearEquationsInequalitiesProblem } from "./linear-equations";
import { linearLcdDynamicProblem } from "./linear";
import { numericalSimplificationProblem } from "./numerical-simplification";
import { orderOfOperationsProblem } from "./order-of-operations";
import { polynomialFactoringProblem } from "./polynomial-factoring";
import { polynomialInterpolationProblem } from "./polynomial-interpolation";
import { polynomialSimplificationProblem } from "./polynomial-simplification";
import { quadraticEquationsInequalitiesProblem } from "./quadratic-equations";
import { radicalEquationsInequalitiesProblem } from "./radical-equations";
import { rationalEquationsInequalitiesProblem } from "./rational-equations";
import { proportionsRatiosProblem } from "./proportions";
import { rootFindingAlgorithmsProblem } from "./root-finding";
import { syntheticDivisionProblem } from "./synthetic-division";
import { wordProblemsProblem } from "./word-problems";
import { basicGraphingProblem } from "./basic-graphing";
import type { ProblemAlgorithm } from "../types";

/** Algebra generators — sampled by id so a batch mixes task types. */
export const algebraAlgorithms: readonly ProblemAlgorithm[] = [
  orderOfOperationsProblem,
  numericalSimplificationProblem,
  linearEquationsInequalitiesProblem,
  quadraticEquationsInequalitiesProblem,
  higherDegreeEquationsInequalitiesProblem,
  rationalEquationsInequalitiesProblem,
  radicalEquationsInequalitiesProblem,
  absoluteValueParametricProblem,
  domainRangeProblem,
  compositionOfFunctionsProblem,
  inverseFunctionsProblem,
  graphicalTransformationsProblem,
  polynomialFunctionsProblem,
  exponentialFunctionsProblem,
  logarithmicFunctionsProblem,
  arithmeticProgressionsProblem,
  geometricProgressionsProblem,
  infiniteGeometricSeriesProblem,
  rootFindingAlgorithmsProblem,
  linearLcdDynamicProblem,
  binomialExpansionProblem,
  polynomialSimplificationProblem,
  polynomialFactoringProblem,
  syntheticDivisionProblem,
  polynomialInterpolationProblem,
  proportionsRatiosProblem,
  wordProblemsProblem,
  basicGraphingProblem,
];