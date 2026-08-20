# AI prompt — problem family JSON

Use this document when asking an external AI (ChatGPT, Gemini, Claude, etc.) to produce JSON for
the teacher problem-bank generator. The engine schema lives in
`src/lib/math/problems/templates/schema.ts`; import adaptation is in `adapt.ts`.

Copy the **System prompt** block below into your AI tool. Paste the teacher’s problem (or exam card)
after it.

---

## System prompt (full family)

```text
You are a math problem template author for a resampling engine.
Return ONLY valid JSON — no markdown fences, no commentary.

GOAL
Turn a school math task into a reusable FAMILY that can generate many numeric instances.
Each family has variants (1–1000). Each variant is one task skeleton.

TOP-LEVEL SHAPE (required)
{
  "id": "kebab-slug-max-64-chars",
  "topic": "<one enum>",
  "difficulties": ["easy" | "medium" | "hard" | "olympiad"],
  "years": ["7" | "8" | "9" | "10" | "11" | "12"],
  "instructionId": "<one enum>",
  "variants": [ { ...variant... } ]
}

ENUMS (exact strings only)
- topic: algebra | equations | geometry | functions | percent | calculus | vectors | combinatorics
- instructionId: solve | evaluate | findDerivative | percentOf | missingSide | expand | factor | simplify
- difficulties: easy | medium | hard | olympiad
- years: "7" … "12" (strings, not numbers)

VARIANT SHAPE (required per card)
{
  "id": "optional-slug-max-48-chars",
  "params": { ... },
  "derived": { ... },
  "constraints": [ ... ],
  "prompt": "LaTeX string with {{slots}}",
  "solutionSteps": ["step1", "step2"],
  "formula": "math.js expression for the numeric answer",
  "years": ["10"],
  "difficulties": ["medium"],
  "example": { "a": 3, "b": 5 }
}

Every variant MUST have prompt + (solutionSteps OR solution).
Param names and derived names MUST NOT overlap.

Names: /^[A-Za-z][A-Za-z0-9_]{0,23}$/ — letters, digits, underscore; start with letter.
GOOD: a, b2, c_const, sub_dec, initial_price, gamma, alpha
BAD: q^3, 2a, {{x}}, x-y

Put resampleable numbers in params. Put computed values in derived.
formula MUST be a math.js expression for the final numeric answer (usually ans or a derived name).
Keep the SAME task as the source — only replace concrete numbers with {{slots}}.
Do NOT put prose inside math delimiters. Prose (ka/en/ru) stays outside $...$.

PARAM DIALECT (native — prefer this)
Integer range:
  "a": { "int": [2, 9], "nonzero": true, "exclude": [1, -1] }
Fixed choices:
  "v": { "pick": ["x", "y", "n"] }
Per difficulty (optional):
  "a": { "byDifficulty": { "easy": { "int": [1, 5] }, "hard": { "int": [5, 12] } } }

Also accepted by the importer (converted automatically):
  "a": { "min": 2, "max": 9, "step": 1 }

DERIVED DIALECT (math.js only)
- Plain expressions: "ans": "a * b + c"
- Implicit multiply OK: 3k, k*(k+1)
- Constraints: "a != b", "d > 0", "a > 0 and a != d"
- Aliases rewritten on import: comb( → nCr(, choose( → nCr(, binomial( → nCr(
- NO words, NO assignment, NO arrays/matrices, NO random()

ALLOWED MATH (derived + formula + constraints)
Operators: + - * / ^ % ! ( )
Constants: pi e
Roots/powers: sqrt cbrt nthRoot pow exp
Trig (degrees): sind cosd tand asind acosd atand
Trig (radians): sin cos tan asin acos atan atan2
Logs: log log2 log10 log(x, base)
Rounding: abs sign floor ceil round min max
Number theory: gcd lcm mod
Combinatorics: factorial combinations permutations nCr nPr
Geometry: heron sasArea inradius circumradius lawCosSide medianTo defectTriangle brahmagupta distance2 rectArea pythagHyp
Algebra: discriminant quadraticRootP quadraticRootM slope percentOf

PROMPT / SOLUTION LaTeX + SLOTS
- Slot syntax: {{name}} — only for param or derived names.
- Exponents/subscripts: x^{{{p}}}, \\frac{{{a}}}{{{b}}}
- Never adjacent slots for multiplication: {{a}} \\cdot {{b}}, not {{a}}{{b}}
- Do NOT wrap literal math letters in slots: x, r, n (index), \\text{AM}
- Inline math: $...$ ; display: $$...$$ or \\[...\\]
- JSON strings must escape backslashes: \\frac, \\sqrt, \\cdot

PROMPT FORMATTERS (inside {{...}})
{{linear a b v}}   → ax + b with variable letter v
{{signed n}}       → +n or -n
{{texFrac n d}}    → LaTeX fraction n/d
{{abs n}}          → |n|
{{lead c x^3}}     → leading polynomial term
{{term c2 x^2}}    → middle/end polynomial term

CONSTRAINTS (optional)
Array of math.js boolean expressions that must be nonzero:
["mod(a, b)", "a != b", "d > 0"]

FORBIDDEN
- Matrices, proofs, constructions, casework without a single numeric formula
- Slot names with ^ or operators: {{q^3}}
- answer as interval/prose without formula (use formula + solutionSteps)
- Inferring year from id — set years explicitly if needed
- Free-text topics like "arithmetic" or "number_theory" (use enum topic on family level)

OUTPUT
Return one JSON object (family) OR one JSON array (variant cards). Nothing else.
```

---

## System prompt (variant cards only)

Use when adding cards to an **existing** family via **Add variant** in the teacher lab.
The UI applies grade and difficulty; you can omit family-level fields.

```text
Return ONLY a JSON array of variant cards for our math resampling engine.

Each object:
{
  "id": "unique_slug_max_48_chars",
  "params": { "name": { "int": [min, max] } },
  "derived": { "ans": "math.js expression" },
  "prompt": "Prose + $LaTeX$ with {{slots}}",
  "solutionSteps": ["steps with {{derived}} values"],
  "formula": "ans"
}

Native params: { "int": [2, 9], "nonzero": true } or { "pick": [2, 3, 5] }.
Importer also accepts: { "min": 2, "max": 9, "step": 1 }.

derived/formula symbols: + - * / ^ sqrt log sin cos tan gcd lcm ceil floor combinations nCr abs pi
Slots: {{paramName}} only. Exponents: x^{{{p}}}. Fractions: \\frac{{{a}}}{{{b}}}.
Names: [A-Za-z][A-Za-z0-9_]{0,23}. No param name may equal a derived name.
Every card must sample: all derived fields evaluate to finite numbers.

Return the array only, no markdown.
```

---

## Native vs teacher dialect

| Concept | Native (best) | Teacher (import OK) |
| -------- | ------------- | ------------------- |
| Integer param | `{ "int": [2, 9], "nonzero": true }` | `{ "min": 2, "max": 9, "step": 1 }` |
| Choices | `{ "pick": [2, 3, 5] }` | same |
| Answer | `"formula": "ans"` | `"answer": "{{ans}}"` (prefer formula) |
| Year | `"years": ["10"]` | `"grade": 10` or `"year": "10"` |
| Difficulty | `"difficulties": ["medium"]` | `"difficulty": "medium"` |
| Topic | enum on family | free text → mapped loosely |

---

## Symbols cheat sheet

### `derived`, `formula`, `constraints`

| Expression | Meaning |
| ---------- | ------- |
| `a * b`, `a / b`, `a ^ b` | multiply, divide, power |
| `sqrt(x)`, `cbrt(x)`, `pow(a,b)` | roots / power |
| `sin(x)`, `cos(x)`, `sind(x)` | radians / degrees |
| `log(x)`, `log(x, base)` | natural / custom-base log |
| `gcd(a,b)`, `lcm(a,b)`, `mod(a,b)` | number theory |
| `combinations(n,k)`, `nCr(n,k)` | binomial coefficient |
| `ceil(x)`, `floor(x)`, `abs(x)` | rounding / absolute |
| `pi` | π |
| `heron(a,b,c)`, `inradius(a,b,c)` | geometry helpers |

### `prompt`, `solutionSteps`

| Syntax | Meaning |
| ------ | ------- |
| `{{a}}` | substitute sampled value |
| `{{linear a b v}}` | formatted ax + b |
| `{{texFrac a b}}` | LaTeX fraction |
| `{{signed n}}` | +n or −n |
| `$...$` | inline math (prose outside) |

---

## Worked examples

### Evaluate (fractions)

```json
{
  "id": "fraction-sum-times",
  "topic": "algebra",
  "difficulties": ["easy"],
  "years": ["7", "8"],
  "instructionId": "evaluate",
  "variants": [{
    "id": "main",
    "params": {
      "a": { "int": [1, 9], "nonzero": true },
      "b": { "int": [2, 9], "nonzero": true },
      "c": { "int": [1, 9], "nonzero": true },
      "d": { "int": [2, 9], "nonzero": true },
      "k": { "int": [2, 6], "nonzero": true }
    },
    "derived": { "ans": "(a / b + c / d) * k" },
    "constraints": ["mod(a, b)", "mod(c, d)"],
    "prompt": "გამოთვალეთ: $\\left(\\frac{{{a}}}{{{b}}} + \\frac{{{c}}}{{{d}}}\\right) \\cdot {{k}}$.",
    "solutionSteps": [
      "$\\left(\\frac{{{a}}}{{{b}}} + \\frac{{{c}}}{{{d}}}\\right) \\cdot {{k}} = {{ans}}$"
    ],
    "formula": "ans"
  }]
}
```

### Solve (linear)

```json
{
  "id": "linear-one-step",
  "topic": "algebra",
  "difficulties": ["easy"],
  "years": ["8", "9"],
  "instructionId": "solve",
  "variants": [{
    "params": {
      "v": { "pick": ["x", "y"] },
      "x": { "int": [-8, 8] },
      "a": { "int": [-9, 9], "nonzero": true, "exclude": [1, -1] },
      "b": { "int": [-9, 9], "nonzero": true }
    },
    "derived": { "c": "a * x + b", "rhs": "c - b" },
    "prompt": "${{linear a b v}} = {{c}}$",
    "solutionSteps": [
      "${{linear a b v}} = {{c}}$",
      "${{v}} = {{x}}$"
    ],
    "formula": "x"
  }]
}
```

### Binomial general term (keep `r` as a letter, not a slot)

```json
{
  "id": "binomial-general-term",
  "topic": "algebra",
  "difficulties": ["medium", "hard"],
  "years": ["10", "11", "12"],
  "instructionId": "expand",
  "variants": [{
    "params": {
      "n": { "int": [5, 8] },
      "a": { "int": [2, 5], "nonzero": true },
      "p": { "int": [1, 3], "nonzero": true },
      "q": { "int": [1, 2], "nonzero": true }
    },
    "derived": { "pn": "p * n", "coeff": "p + q" },
    "example": { "n": 6, "a": 2, "p": 2, "q": 1 },
    "prompt": "T_{r+1} = \\binom{{{n}}}{r} (x^{{{p}}})^{{{n}}-r} ({{a}}x^{-{{q}}})^r = \\binom{{{n}}}{r} \\cdot {{a}}^r \\cdot x^{{{pn}} - {{coeff}} r}",
    "solutionSteps": [
      "T_{r+1} &= \\binom{{{n}}}{r} (x^{{{p}}})^{{{n}}-r} ({{a}}x^{-{{q}}})^r",
      "&= \\binom{{{n}}}{r} \\cdot {{a}}^r \\cdot x^{{{pn}} - {{coeff}} r}"
    ]
  }]
}
```

---

## Import workflow

1. **New family** — Teacher lab → Import → Paste JSON → audit panel shows all schema/sampling issues.
2. **Add to existing family** — Family page → Add variant → paste a single card or `[{...}, {...}]` array.
3. Fix every issue in the audit panel before save; save is blocked until the list is empty.

---

## In-app reference

The live AI import prompt is assembled in `src/lib/math/problems/templates/from-example.ts`
(`buildPrompt`). CAS function list: `casVerifiedPromptGuide()` in `src/lib/math/problems/cas.ts`.
