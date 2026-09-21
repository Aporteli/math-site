import {
    FractionError,
    type EvalMode,
    type Fraction,
    type FractionOp,
  } from "./types";
  import { applyOp } from "./rational";
  
  const PREC: Record<FractionOp, number> = {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
  };
  
  export function evaluateChain(
    values: Fraction[],
    ops: FractionOp[],
    mode: EvalMode = "precedence",
  ): Fraction {
    if (values.length === 0) throw new FractionError("EMPTY_EXPRESSION");
    if (values.length !== ops.length + 1) {
      throw new FractionError("MISMATCHED_OPS");
    }
    if (ops.length === 0) return values[0]!;
  
    if (mode === "leftToRight") {
      let acc = values[0]!;
      for (let i = 0; i < ops.length; i++) {
        acc = applyOp(ops[i]!, acc, values[i + 1]!);
      }
      return acc;
    }
  
    const out: Fraction[] = [values[0]!];
    const outOps: FractionOp[] = [];
  
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i]!;
      while (
        outOps.length &&
        PREC[outOps[outOps.length - 1]!] >= PREC[op]
      ) {
        const b = out.pop()!;
        const a = out.pop()!;
        out.push(applyOp(outOps.pop()!, a, b));
      }
      outOps.push(op);
      out.push(values[i + 1]!);
    }
  
    while (outOps.length) {
      const b = out.pop()!;
      const a = out.pop()!;
      out.push(applyOp(outOps.pop()!, a, b));
    }
  
    return out[0]!;
  }