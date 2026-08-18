import { compileTemplate } from "./engine";
import linearOneStep from "./algebra/linear-one-step.json";
import type { ProblemAlgorithm } from "../algorithms/types";

/** JSON templates compiled to the same ProblemAlgorithm contract as TS generators. */
export const templateAlgorithms: readonly ProblemAlgorithm[] = [
  compileTemplate(linearOneStep),
];
