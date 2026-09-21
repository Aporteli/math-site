import { FractionError, type Fraction } from "./types";
import { frac, fromMixed } from "./rational";

const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const MIXED = /^([+-]?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/;
const SLASH = /^([+-]?\d+(?:\.\d*)?|\.\d+)\s*\/\s*([+-]?\d+(?:\.\d*)?|\.\d+)$/;

export function parseDecimal(raw: string): Fraction {
  const s = raw.trim();
  if (s === "" || s === "+" || s === "-" || s === "." || s === "-.") {
    throw new FractionError("EMPTY");
  }
  if (!DECIMAL.test(s)) throw new FractionError("INVALID_NUMBER");

  const sign = s.startsWith("-") ? -1n : 1n;
  const unsigned = s.replace(/^[+-]/, "");
  if (!unsigned.includes(".")) {
    return frac(sign * BigInt(unsigned), 1n);
  }

  const [whole = "0", fracPart = ""] = unsigned.split(".");
  const digits = `${whole || "0"}${fracPart}`;
  const scale = 10n ** BigInt(fracPart.length);
  return frac(sign * BigInt(digits || "0"), scale);
}

/** Accepts `3/4`, `1.5`, `1.5/2`, `2 1/3`, `-2 1/3`. */
export function parseFractionInput(raw: string, index?: number): Fraction {
  const s = raw.trim().replace(/,/g, ".");
  if (!s) throw new FractionError("EMPTY", undefined, index);

  const mixed = s.match(MIXED);
  if (mixed) {
    const sign = mixed[1] === "-" ? (-1 as const) : (1 as const);
    const d = BigInt(mixed[4]!);
    if (d === 0n) throw new FractionError("ZERO_DENOMINATOR", "d", index);
    return fromMixed({
      sign,
      whole: BigInt(mixed[2]!),
      n: BigInt(mixed[3]!),
      d,
    });
  }

  const slash = s.match(SLASH);
  if (slash) {
    try {
      return frac(
        parseDecimal(slash[1]!).n * parseDecimal(slash[2]!).d,
        parseDecimal(slash[1]!).d * parseDecimal(slash[2]!).n,
      );
    } catch (e) {
      if (e instanceof FractionError) {
        throw new FractionError(e.code, "d", index);
      }
      throw e;
    }
  }

  return parseDecimal(s);
}

export function parseParts(
  nRaw: string,
  dRaw: string,
  index?: number,
  wholeRaw = "",
): Fraction {
  const wholeTrim = wholeRaw.trim();
  const nTrim = nRaw.trim();
  const dTrim = dRaw.trim();

  const hasWhole = wholeTrim !== "" && wholeTrim !== "-" && wholeTrim !== "+";
  const hasN = nTrim !== "" && nTrim !== "-" && nTrim !== "+";
  const hasD = dTrim !== "" && dTrim !== "-" && dTrim !== "+";

  if (hasWhole && !hasN && !hasD) {
    return parseDecimalSafe(wholeRaw, "whole", index);
  }

  if (!hasWhole && hasN && !hasD) {
    return parseDecimalSafe(nRaw, "n", index);
  }

  if (hasWhole && hasN && hasD) {
    const whole = parseDecimalSafe(wholeRaw, "whole", index);
    const fracPart = parseFractionPair(nRaw, dRaw, index);
    const sign = whole.n < 0n || nRaw.trim().startsWith("-") ? -1n : 1n;
    const absWhole = whole.n < 0n ? -whole.n : whole.n;
    const absN = fracPart.n < 0n ? -fracPart.n : fracPart.n;
    return frac(sign * (absWhole * fracPart.d + absN), fracPart.d);
  }

  return parseFractionPair(nRaw, dRaw, index);
}

function parseFractionPair(
  nRaw: string,
  dRaw: string,
  index?: number,
): Fraction {
  const n = parseDecimalSafe(nRaw, "n", index);
  const d = parseDecimalSafe(dRaw, "d", index);
  if (d.n === 0n) throw new FractionError("ZERO_DENOMINATOR", "d", index);
  return frac(n.n * d.d, n.d * d.n);
}

function parseDecimalSafe(
  raw: string,
  field: "n" | "d" | "whole",
  index?: number,
): Fraction {
  try {
    return parseDecimal(raw);
  } catch (e) {
    if (e instanceof FractionError) {
      throw new FractionError(e.code, field, index);
    }
    throw e;
  }
}
