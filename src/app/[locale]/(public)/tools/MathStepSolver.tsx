"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "framer-motion";
import {
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  History,
  Check,
  PlusCircle,
  Play,
  HelpCircle,
  MousePointerClick,
  Sliders,
  Edit3,
  Trash2,
  Plus
} from "lucide-react";

type Phase = 1 | 2 | 3 | 4;
type TokenType = "number" | "variable" | "operator" | "parenthesis";

interface EquationToken {
  id: string;
  text: string;
  type?: TokenType;
  isTarget?: boolean;
}

interface TokenPosition {
  x: number;
  y: number;
}

interface TrajectoryMicroStep {
  label: string;
  highlightLeftIdx: number;
  highlightRightIdx: number;
  leftFlyText: string;
  rightFlyText: string;
  flyingResult: string;
  appendTokens: EquationToken[];
  note: string;
}

interface StepData {
  id: number;
  title: string;
  ruleTitle: string;
  compactFormula: string;
  explanation: string;
  isTrajectoryExpansion?: boolean;
  leftParenTokens?: string[];
  rightParenTokens?: string[];
  trajectorySteps?: TrajectoryMicroStep[];
  phase1Text: string;
  phase2Text: string;
  phase3Text: string;
  phase4Text: string;
  tokensPhase1: EquationToken[];
  tokensPhase2: EquationToken[];
  tokensPhase3: EquationToken[];
  tokensPhase4: EquationToken[];
}

const PRESET_EQUATIONS = [
  { label: "(m-1)x² - 2(m+1)x + m - 2 = 0", eq: "(m-1)x^2 - 2(m+1)x + m - 2 = 0" },
  { label: "(a+b)² = a² + 2ab + b²", eq: "(a+b)^2" },
  { label: "3x - 7 = 14", eq: "3x - 7 = 14" },
  { label: "x² - 5x + 6 = 0", eq: "x^2 - 5x + 6 = 0" }
];

const PHASE_LABELS: Record<Phase, string> = {
  1: "ამოცნობა",
  2: "გარდაქმნა",
  3: "ტრანსფორმაცია",
  4: "დაფიქსირება"
};

function buildEquationSteps(rawEq: string): StepData[] {
  const clean = rawEq.replace(/\s+/g, "").replace(/\*/g, "");

  if (clean.includes("x^2") && (clean.includes("m") || clean.includes("a") || clean.includes("k"))) {
    return [
      {
        id: 1,
        title: "კოეფიციენტების აკრეფა",
        ruleTitle: "ზოგადი სახე: ax² + bx + c = 0",
        compactFormula: "a = (m-1), b = -2(m+1), c = (m-2)",
        explanation: "განვსაზღვროთ კვადრატული განტოლების პარამეტრული კოეფიციენტები a, b და c.",
        phase1Text: "ფაზა 1: მონიშნულია ძირითადი წევრები და მათი ნიშნები.",
        phase2Text: "ფაზა 2: კოეფიციენტები იზოლირდება ცალკე ანალიზისთვის.",
        phase3Text: "ფაზა 3: ხდება მათი დაჯგუფება a, b და c ცვლადებად.",
        phase4Text: "ფაზა 4: მივიღეთ სუფთა მნიშვნელობები: a = m-1, b = -2(m+1), c = m-2.",
        tokensPhase1: [
          { id: "p1-a", text: "(m-1)", isTarget: true, type: "variable" },
          { id: "p1-x2", text: "x²", type: "variable" },
          { id: "p1-op1", text: "-", type: "operator" },
          { id: "p1-b", text: "2(m+1)", isTarget: true, type: "variable" },
          { id: "p1-x", text: "x", type: "variable" },
          { id: "p1-op2", text: "+", type: "operator" },
          { id: "p1-c", text: "(m-2)", isTarget: true, type: "variable" },
          { id: "p1-eq", text: "=", type: "operator" },
          { id: "p1-0", text: "0", type: "number" }
        ],
        tokensPhase2: [
          { id: "p1-a", text: "a = (m-1)", isTarget: true, type: "variable" },
          { id: "p1-b", text: "b = -2(m+1)", isTarget: true, type: "variable" },
          { id: "p1-c", text: "c = (m-2)", isTarget: true, type: "variable" }
        ],
        tokensPhase3: [
          { id: "p1-a", text: "a = (m-1)", isTarget: true, type: "variable" },
          { id: "p1-b", text: "b = -2(m+1)", isTarget: true, type: "variable" },
          { id: "p1-c", text: "c = (m-2)", isTarget: true, type: "variable" }
        ],
        tokensPhase4: [
          { id: "p1-a", text: "a = m-1,", isTarget: true, type: "variable" },
          { id: "p1-b", text: "b = -2(m+1),", isTarget: true, type: "variable" },
          { id: "p1-c", text: "c = m-2", isTarget: true, type: "variable" }
        ]
      },
      {
        id: 2,
        title: "დისკრიმინანტის გამოთვლა",
        ruleTitle: "ფორმულა: D = b² - 4ac",
        compactFormula: "D = [-2(m+1)]² - 4(m-1)(m-2)",
        explanation: "ჩავსვათ მიღებული კოეფიციენტები დისკრიმინანტის ზოგად ფორმულაში.",
        isTrajectoryExpansion: true,
        leftParenTokens: ["-2(m+1)", "²", "-"],
        rightParenTokens: ["4", "(m-1)", "(m-2)"],
        trajectorySteps: [
          {
            label: "1. b² კომპონენტი",
            highlightLeftIdx: 0,
            highlightRightIdx: 0,
            leftFlyText: "b²",
            rightFlyText: "4(m+1)²",
            flyingResult: "4(m+1)²",
            appendTokens: [{ id: "res-d1", text: "4(m+1)²", type: "variable", isTarget: true }],
            note: "b² კვადრატში აყვანით მივიღეთ 4(m+1)²."
          },
          {
            label: "2. -4ac კომპონენტი",
            highlightLeftIdx: 2,
            highlightRightIdx: 1,
            leftFlyText: "-4",
            rightFlyText: "ac",
            flyingResult: "- 4(m-1)(m-2)",
            appendTokens: [
              { id: "res-op-d", text: "-", type: "operator" },
              { id: "res-d2", text: "4(m-1)(m-2)", type: "variable", isTarget: true }
            ],
            note: "მრავლდება -4-ზე, a-სა და c-ს მნიშვნელობები."
          }
        ],
        phase1Text: "ფაზა 1: ავირჩიეთ დისკრიმინანტის გამოსათვლელი მოდელი.",
        phase2Text: "ფაზა 2: კოეფიციენტები გადაფრინდნენ ფორმულის სტრუქტურაში.",
        phase3Text: "ფაზა 3: გავხსნათ ფრჩხილები: 4(m² + 2m + 1) - 4(m² - 3m + 2).",
        phase4Text: "ფაზა 4: მსგავსი წევრების შეკვეცით მივიღეთ: D = 20m - 4.",
        tokensPhase1: [
          { id: "d-name", text: "D", type: "variable" },
          { id: "d-eq", text: "=", type: "operator" },
          { id: "d-b2", text: "b²", isTarget: true, type: "variable" },
          { id: "d-min", text: "-", type: "operator" },
          { id: "d-4ac", text: "4ac", isTarget: true, type: "variable" }
        ],
        tokensPhase2: [],
        tokensPhase3: [
          { id: "d-step", text: "D = 4(m²+2m+1) - 4(m²-3m+2)", isTarget: true, type: "variable" }
        ],
        tokensPhase4: [
          { id: "d-res", text: "D = 20m - 4", isTarget: true, type: "variable" }
        ]
      },
      {
        id: 3,
        title: "ამონახსნების არსებობის პირობა",
        ruleTitle: "მთავარი პირობა: D ≥ 0",
        compactFormula: "20m - 4 ≥ 0 ⟹ m ≥ 1/5",
        explanation: "განტოლებას აქვს ნამდვილი ფესვები მხოლოდ მაშინ, როცა D არ არის უარყოფითი.",
        phase1Text: "ფაზა 1: შევადგინეთ უტოლობა 20m - 4 ≥ 0.",
        phase2Text: "ფაზა 2: თავისუფალი წევრი გადავიდა მარჯვენა მხარეს.",
        phase3Text: "ფაზა 3: ორივე მხარე გავყავით 20-ზე.",
        phase4Text: "ფაზა 4: საბოლოო შეზღუდვა: m ≥ 1/5 (სადაც m ≠ 1).",
        tokensPhase1: [
          { id: "r-20m", text: "20m", type: "variable" },
          { id: "r-min", text: "-", type: "operator" },
          { id: "r-4", text: "4", isTarget: true, type: "number" },
          { id: "r-gte", text: "≥", type: "operator" },
          { id: "r-0", text: "0", type: "number" }
        ],
        tokensPhase2: [
          { id: "r-20m", text: "20m", type: "variable" },
          { id: "r-gte", text: "≥", type: "operator" },
          { id: "r-4", text: "4", isTarget: true, type: "number" }
        ],
        tokensPhase3: [
          { id: "r-m", text: "m", type: "variable" },
          { id: "r-gte", text: "≥", type: "operator" },
          { id: "r-div", text: "4 / 20", isTarget: true, type: "number" }
        ],
        tokensPhase4: [
          { id: "r-m", text: "m ≥ 1/5", isTarget: true, type: "variable" },
          { id: "r-cond", text: "(m ≠ 1)", isTarget: true, type: "variable" }
        ]
      }
    ];
  }

  if (clean.includes("a+b") && (clean.includes("^2") || clean.includes("2"))) {
    return [
      {
        id: 1,
        title: "კვადრატის გაშლა ფრჩხილებად",
        ruleTitle: "ხარისხის განმარტება",
        compactFormula: "(a+b)² = (a+b)(a+b)",
        explanation: "ნებისმიერი გამოსახულების კვადრატი ნიშნავს მის თავისთავზე გამრავლებას.",
        phase1Text: "ფაზა 1: მონიშნულია ფუძე და ხარისხის მაჩვენებელი.",
        phase2Text: "ფაზა 2: გამოსახულება მზადდება გასაშლელად.",
        phase3Text: "ფაზა 3: ხარისხი გარდაიქმნა მეორე იდენტურ ფრჩხილად.",
        phase4Text: "ფაზა 4: მივიღეთ ორი იდენტური მამრავლი.",
        tokensPhase1: [
          { id: "b1-p1", text: "(", type: "parenthesis" },
          { id: "b1-a", text: "a", isTarget: true, type: "variable" },
          { id: "b1-op", text: "+", isTarget: true, type: "operator" },
          { id: "b1-b", text: "b", isTarget: true, type: "variable" },
          { id: "b1-p2", text: ")", type: "parenthesis" },
          { id: "b1-pow", text: "2", isTarget: true, type: "number" }
        ],
        tokensPhase2: [
          { id: "b1-p1", text: "(", type: "parenthesis" },
          { id: "b1-a", text: "a", isTarget: true, type: "variable" },
          { id: "b1-op", text: "+", isTarget: true, type: "operator" },
          { id: "b1-b", text: "b", isTarget: true, type: "variable" },
          { id: "b1-p2", text: ")", type: "parenthesis" },
          { id: "b1-pow", text: "2", isTarget: true, type: "number" }
        ],
        tokensPhase3: [
          { id: "b1-p1", text: "(", type: "parenthesis" },
          { id: "b1-a", text: "a", isTarget: true, type: "variable" },
          { id: "b1-op", text: "+", isTarget: true, type: "operator" },
          { id: "b1-b", text: "b", isTarget: true, type: "variable" },
          { id: "b1-p2", text: ")", type: "parenthesis" },
          { id: "b1-p3", text: "(", type: "parenthesis" },
          { id: "b1-a2", text: "a", isTarget: true, type: "variable" },
          { id: "b1-op2", text: "+", isTarget: true, type: "operator" },
          { id: "b1-b2", text: "b", isTarget: true, type: "variable" },
          { id: "b1-p4", text: ")", type: "parenthesis" }
        ],
        tokensPhase4: [
          { id: "b1-p1", text: "(", type: "parenthesis" },
          { id: "b1-a", text: "a", isTarget: true, type: "variable" },
          { id: "b1-op", text: "+", isTarget: true, type: "operator" },
          { id: "b1-b", text: "b", isTarget: true, type: "variable" },
          { id: "b1-p2", text: ")", type: "parenthesis" },
          { id: "b1-p3", text: "(", type: "parenthesis" },
          { id: "b1-a2", text: "a", isTarget: true, type: "variable" },
          { id: "b1-op2", text: "+", isTarget: true, type: "operator" },
          { id: "b1-b2", text: "b", isTarget: true, type: "variable" },
          { id: "b1-p4", text: ")", type: "parenthesis" }
        ]
      },
      {
        id: 2,
        title: "ფრჩხილების გადამრავლება ტრაექტორიით",
        ruleTitle: "განაწილებადობის კანონი (FOIL)",
        compactFormula: "(a+b)(a+b) = a² + ab + ba + b²",
        explanation: "თითოეული მამრავლი ცალ-ცალკე ადის ჰაერში, ერწყმიან და ეშვებიან დანიშნულების ადგილას.",
        isTrajectoryExpansion: true,
        leftParenTokens: ["a", "+", "b"],
        rightParenTokens: ["a", "+", "b"],
        trajectorySteps: [
          {
            label: "1. a · a",
            highlightLeftIdx: 0,
            highlightRightIdx: 0,
            leftFlyText: "a",
            rightFlyText: "a",
            flyingResult: "a²",
            appendTokens: [{ id: "res-a2", text: "a²", type: "variable", isTarget: true }],
            note: "ორივე a ამოვიდა ზემოთ, გადაფრინდა და დაჯდა როგორც a²"
          },
          {
            label: "2. a · b",
            highlightLeftIdx: 0,
            highlightRightIdx: 2,
            leftFlyText: "a",
            rightFlyText: "b",
            flyingResult: "+ ab",
            appendTokens: [
              { id: "res-op1", text: "+", type: "operator" },
              { id: "res-ab1", text: "ab", type: "variable", isTarget: true }
            ],
            note: "a და b პარალელურად გადავიდა და შეერწყა + ab-ად"
          },
          {
            label: "3. b · a",
            highlightLeftIdx: 2,
            highlightRightIdx: 0,
            leftFlyText: "b",
            rightFlyText: "a",
            flyingResult: "+ ba",
            appendTokens: [
              { id: "res-op2", text: "+", type: "operator" },
              { id: "res-ba", text: "ba", type: "variable", isTarget: true }
            ],
            note: "b და a პარალელურად გადავიდა და შეერწყა + ba-ად"
          },
          {
            label: "4. b · b",
            highlightLeftIdx: 2,
            highlightRightIdx: 2,
            leftFlyText: "b",
            rightFlyText: "b",
            flyingResult: "+ b²",
            appendTokens: [
              { id: "res-op3", text: "+", type: "operator" },
              { id: "res-b2", text: "b²", type: "variable", isTarget: true }
            ],
            note: "ორივე b გადავიდა და დაჯდა + b²-ად"
          }
        ],
        phase1Text: "ფაზა 1: მონიშნულია გადასამრავლებელი მამრავლები.",
        phase2Text: "ფაზა 2: ელემენტები სინქრონულად ადიან და ერთიანდებიან.",
        phase3Text: "ფაზა 3: ოთხივე ნამრავლი სრულად შეგროვდა ზონაში.",
        phase4Text: "ფაზა 4: დაფიქსირდა სრული გაშლილი ჯამი.",
        tokensPhase1: [],
        tokensPhase2: [],
        tokensPhase3: [],
        tokensPhase4: []
      },
      {
        id: 3,
        title: "მსგავსი წევრების შეერთება",
        ruleTitle: "შემოკლებული გამრავლების წესი",
        compactFormula: "a² + 2ab + b²",
        explanation: "მსგავსი წევრები ab და ba ერთიანდება 2ab-ად.",
        phase1Text: "ფაზა 1: მონიშნულია მსგავსი წევრები ab და ba.",
        phase2Text: "ფაზა 2: წევრები მზადდებიან შესაერთებლად.",
        phase3Text: "ფაზა 3: მათი შეერთებით მივიღეთ 2ab.",
        phase4Text: "ფაზა 4: საბოლოო ფორმულა წარმატებით დაფიქსირდა.",
        tokensPhase1: [
          { id: "b3-a2", text: "a²", type: "variable" },
          { id: "b3-op1", text: "+", type: "operator" },
          { id: "b3-ab1", text: "ab", isTarget: true, type: "variable" },
          { id: "b3-op2", text: "+", type: "operator" },
          { id: "b3-ab2", text: "ba", type: "variable" },
          { id: "b3-op3", text: "+", type: "operator" },
          { id: "b3-b2", text: "b²", type: "variable" }
        ],
        tokensPhase2: [
          { id: "b3-a2", text: "a²", type: "variable" },
          { id: "b3-op1", text: "+", type: "operator" },
          { id: "b3-ab1", text: "ab", isTarget: true, type: "variable" },
          { id: "b3-op2", text: "+", type: "operator" },
          { id: "b3-ab2", text: "ba", type: "variable" },
          { id: "b3-op3", text: "+", type: "operator" },
          { id: "b3-b2", text: "b²", type: "variable" }
        ],
        tokensPhase3: [
          { id: "b3-a2", text: "a²", type: "variable" },
          { id: "b3-op1", text: "+", type: "operator" },
          { id: "b3-2ab", text: "2ab", isTarget: true, type: "variable" },
          { id: "b3-op3", text: "+", type: "operator" },
          { id: "b3-b2", text: "b²", type: "variable" }
        ],
        tokensPhase4: [
          { id: "b3-a2", text: "a²", type: "variable" },
          { id: "b3-op1", text: "+", type: "operator" },
          { id: "b3-2ab", text: "2ab", isTarget: true, type: "variable" },
          { id: "b3-op3", text: "+", type: "operator" },
          { id: "b3-b2", text: "b²", type: "variable" }
        ]
      }
    ];
  }

  const regex = /^([+]?\d*)x([+-]\d+)=([+-]?\d+)$/i;
  const match = clean.match(regex);
  const aStr = match ? match[1] : "3";
  const a = aStr === "" || aStr === "+" ? 1 : aStr === "-" ? -1 : parseInt(aStr, 10) || 3;
  const b = match ? parseInt(match[2], 10) : -7;
  const c = match ? parseInt(match[3], 10) : 14;
  const bSign = b >= 0 ? "+" : "-";
  const bAbs = Math.abs(b);
  const invSign = b >= 0 ? "-" : "+";
  const rightSum = b >= 0 ? c - bAbs : c + bAbs;
  const finalAnswer = rightSum / a;
  const axText = a === 1 ? "x" : a === -1 ? "-x" : `${a}x`;

  return [
    {
      id: 1,
      title: "მუდმივი წევრის გადატანა",
      ruleTitle: "ტოლობის თვისება",
      compactFormula: `${axText} = ${c} ${invSign} ${bAbs}`,
      explanation: `${bSign} ${bAbs} გადადის ტოლობის მარჯვენა მხარეს და ნიშანი ეცვლება: ხდება ${invSign}.`,
      phase1Text: `ფაზა 1: მონიშნულია ნიშანი ${bSign} და რიცხვი ${bAbs}.`,
      phase2Text: "ფაზა 2: წევრი მზადდება ტრანსპორტირებისთვის.",
      phase3Text: `ფაზა 3: გადაფრინდა მარჯვნივ და ნიშანი შეიცვალა ${invSign}-ად.`,
      phase4Text: "ფაზა 4: რბილად ჩაჯდა თავის ახალ ადგილას.",
      tokensPhase1: [
        { id: "s1-ax", text: axText, type: "variable" },
        { id: "s1-sign", text: bSign, isTarget: true, type: "operator" },
        { id: "s1-b", text: `${bAbs}`, isTarget: true, type: "number" },
        { id: "s1-eq", text: "=", type: "operator" },
        { id: "s1-c", text: `${c}`, type: "number" }
      ],
      tokensPhase2: [
        { id: "s1-ax", text: axText, type: "variable" },
        { id: "s1-sign", text: bSign, isTarget: true, type: "operator" },
        { id: "s1-b", text: `${bAbs}`, isTarget: true, type: "number" },
        { id: "s1-eq", text: "=", type: "operator" },
        { id: "s1-c", text: `${c}`, type: "number" }
      ],
      tokensPhase3: [
        { id: "s1-ax", text: axText, type: "variable" },
        { id: "s1-eq", text: "=", type: "operator" },
        { id: "s1-c", text: `${c}`, type: "number" },
        { id: "s1-sign", text: invSign, isTarget: true, type: "operator" },
        { id: "s1-b", text: `${bAbs}`, isTarget: true, type: "number" }
      ],
      tokensPhase4: [
        { id: "s1-ax", text: axText, type: "variable" },
        { id: "s1-eq", text: "=", type: "operator" },
        { id: "s1-c", text: `${c}`, type: "number" },
        { id: "s1-sign", text: invSign, isTarget: true, type: "operator" },
        { id: "s1-b", text: `${bAbs}`, isTarget: true, type: "number" }
      ]
    },
    {
      id: 2,
      title: "მარჯვენა მხარის შეკრება",
      ruleTitle: "არითმეტიკული ოპერაცია",
      compactFormula: `${axText} = ${rightSum}`,
      explanation: `მარჯვენა მხარეს ${c}, ${invSign} და ${bAbs} ერწყმიან ერთმანეთს.`,
      phase1Text: "ფაზა 1: მონიშნულია შესაკრები რიცხვები.",
      phase2Text: "ფაზა 2: ელემენტები მზადდებიან შესარწყმელად.",
      phase3Text: `ფაზა 3: ცენტრში მოხდა შერწყმა და მივიღეთ ${rightSum}.`,
      phase4Text: `ფაზა 4: შედეგი ${rightSum} დაფიქსირდა პოზიციაზე.`,
      tokensPhase1: [
        { id: "s2-ax", text: axText, type: "variable" },
        { id: "s2-eq", text: "=", type: "operator" },
        { id: "s2-c", text: `${c}`, isTarget: true, type: "number" },
        { id: "s2-sign", text: invSign, isTarget: true, type: "operator" },
        { id: "s2-b", text: `${bAbs}`, isTarget: true, type: "number" }
      ],
      tokensPhase2: [
        { id: "s2-ax", text: axText, type: "variable" },
        { id: "s2-eq", text: "=", type: "operator" },
        { id: "s2-c", text: `${c}`, isTarget: true, type: "number" },
        { id: "s2-sign", text: invSign, isTarget: true, type: "operator" },
        { id: "s2-b", text: `${bAbs}`, isTarget: true, type: "number" }
      ],
      tokensPhase3: [
        { id: "s2-ax", text: axText, type: "variable" },
        { id: "s2-eq", text: "=", type: "operator" },
        { id: "s2-sum", text: `${rightSum}`, isTarget: true, type: "number" }
      ],
      tokensPhase4: [
        { id: "s2-ax", text: axText, type: "variable" },
        { id: "s2-eq", text: "=", type: "operator" },
        { id: "s2-sum", text: `${rightSum}`, isTarget: true, type: "number" }
      ]
    },
    {
      id: 3,
      title: "განტოლების გაყოფა კოეფიციენტზე",
      ruleTitle: `გაყოფა ${Math.abs(a)}-ზე`,
      compactFormula: `x = ${rightSum} / ${a}`,
      explanation: `x-ის კოეფიციენტი ${a} გადადის მარჯვნივ მნიშვნელში.`,
      phase1Text: `ფაზა 1: მონიშნულია კოეფიციენტი ${a}.`,
      phase2Text: `ფაზა 2: ${a} მზადდება მნიშვნელში გადასასვლელად.`,
      phase3Text: `ფაზა 3: გადაფრინდა ${rightSum}-ის ქვეშ.`,
      phase4Text: `ფაზა 4: წილადი წარმატებით ჩაჯდა.`,
      tokensPhase1: [
        { id: "s3-coeff", text: `${a}`, isTarget: true, type: "number" },
        { id: "s3-x", text: "x", type: "variable" },
        { id: "s3-eq", text: "=", type: "operator" },
        { id: "s3-sum", text: `${rightSum}`, type: "number" }
      ],
      tokensPhase2: [
        { id: "s3-coeff", text: `${a}`, isTarget: true, type: "number" },
        { id: "s3-x", text: "x", type: "variable" },
        { id: "s3-eq", text: "=", type: "operator" },
        { id: "s3-sum", text: `${rightSum}`, type: "number" }
      ],
      tokensPhase3: [
        { id: "s3-x", text: "x", type: "variable" },
        { id: "s3-eq", text: "=", type: "operator" },
        { id: "s3-coeff", text: `${rightSum}/${a}`, isTarget: true, type: "number" }
      ],
      tokensPhase4: [
        { id: "s3-x", text: "x", type: "variable" },
        { id: "s3-eq", text: "=", type: "operator" },
        { id: "s3-coeff", text: `${rightSum}/${a}`, isTarget: true, type: "number" }
      ]
    },
    {
      id: 4,
      title: "საბოლოო ამონახსნი",
      ruleTitle: "შედეგის მიღება",
      compactFormula: `x = ${Number.isInteger(finalAnswer) ? finalAnswer : finalAnswer.toFixed(2)}`,
      explanation: "მივიღეთ საბოლოო შედეგი.",
      phase1Text: "ფაზა 1: მონიშნულია მიღებული წილადი.",
      phase2Text: "ფაზა 2: წილადი მზადდება გამარტივებისთვის.",
      phase3Text: "ფაზა 3: გარდაიქმნა საბოლოო რიცხვად.",
      phase4Text: "ფაზა 4: ამონახსნი სრულად დაფიქსირდა.",
      tokensPhase1: [
        { id: "s4-x", text: "x", type: "variable" },
        { id: "s4-eq", text: "=", type: "operator" },
        { id: "s4-ans", text: `${rightSum}/${a}`, isTarget: true, type: "number" }
      ],
      tokensPhase2: [
        { id: "s4-x", text: "x", type: "variable" },
        { id: "s4-eq", text: "=", type: "operator" },
        { id: "s4-ans", text: `${rightSum}/${a}`, isTarget: true, type: "number" }
      ],
      tokensPhase3: [
        { id: "s4-x", text: "x", type: "variable" },
        { id: "s4-eq", text: "=", type: "operator" },
        { id: "s4-ans", text: `${Number.isInteger(finalAnswer) ? finalAnswer : finalAnswer.toFixed(2)}`, isTarget: true, type: "number" }
      ],
      tokensPhase4: [
        { id: "s4-x", text: "x", type: "variable" },
        { id: "s4-eq", text: "=", type: "operator" },
        { id: "s4-ans", text: `${Number.isInteger(finalAnswer) ? finalAnswer : finalAnswer.toFixed(2)}`, isTarget: true, type: "number" }
      ]
    }
  ];
}

// ==========================================
// UI კომპონენტი (Fully Interactive Playground)
// ==========================================
export function MathStepSolver() {
  const [inputEquation, setInputEquation] = useState("(m-1)x^2 - 2(m+1)x + m - 2 = 0");
  const [steps, setSteps] = useState<StepData[]>(() => buildEquationSteps("(m-1)x^2 - 2(m+1)x + m - 2 = 0"));
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>(1);
  const [trajectoryIdx, setTrajectoryIdx] = useState<number>(-1);
  const [isFlying, setIsFlying] = useState(false);

  // **ხელით მართვის / ინტერაქტიული რეჟიმი**
  const [isManualPlayground, setIsManualPlayground] = useState(true);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [customTokenText, setCustomTokenText] = useState("");
  const [playgroundTokens, setPlaygroundTokens] = useState<EquationToken[]>([]);
  const [tokenPositions, setTokenPositions] = useState<Record<string, TokenPosition>>({});

  const prefersReducedMotion = useReducedMotion();

  const arenaRef = useRef<HTMLDivElement>(null);
  const leftTokensRef = useRef<(HTMLSpanElement | null)[]>([]);
  const rightTokensRef = useRef<(HTMLSpanElement | null)[]>([]);
  const targetBoxRef = useRef<HTMLDivElement>(null);
  const targetAnchorRef = useRef<HTMLSpanElement>(null);
  const playgroundRef = useRef<HTMLDivElement>(null);
  const flightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [coords, setCoords] = useState({
    leftStartX: 0,
    leftStartY: 0,
    rightStartX: 0,
    rightStartY: 0,
    targetX: 0,
    targetY: 0
  });

  const step = steps[currentStepIdx] || steps[0];
  const isFinalStep = currentStepIdx === steps.length - 1;
  const flightDuration = prefersReducedMotion ? 0.4 : 3.6;

  const activeTokens = useMemo(() => {
    if (phase === 1) return step.tokensPhase1;
    if (phase === 2) return step.tokensPhase2;
    if (phase === 3) return step.tokensPhase3;
    return step.tokensPhase4;
  }, [phase, step]);

  // როცა ვრთავთ ხელით მართვას ან ვიცვლით ფაზას/ნაბიჯს, playgroundTokens ავტომატურად ივსება აქტიური ტოკენებით
  useEffect(() => {
    setPlaygroundTokens(activeTokens);
    setSelectedTokenId(null);
    setTokenPositions({});
  }, [activeTokens, isManualPlayground, currentStepIdx, phase]);

  const overallProgress = useMemo(() => {
    const stepsDone = currentStepIdx;
    const phaseFraction = (phase - 1) / 4;
    return Math.min(100, Math.round(((stepsDone + phaseFraction) / steps.length) * 100));
  }, [currentStepIdx, phase, steps.length]);

  const measureCoordinates = useCallback(() => {
    if (!arenaRef.current || !step.isTrajectoryExpansion) return;
    const flyIdx = trajectoryIdx + 1;
    const currentFlyData = step.trajectorySteps ? step.trajectorySteps[flyIdx] : null;
    if (!currentFlyData) return;

    const arenaRect = arenaRef.current.getBoundingClientRect();
    const leftElem = leftTokensRef.current[currentFlyData.highlightLeftIdx];
    const rightElem = rightTokensRef.current[currentFlyData.highlightRightIdx];
    const anchorElem = targetAnchorRef.current;
    const boxElem = targetBoxRef.current;

    let lX = 0, lY = 0, rX = 0, rY = 0, tX = 0, tY = 0;

    if (leftElem) {
      const rect = leftElem.getBoundingClientRect();
      lX = rect.left + rect.width / 2 - arenaRect.left;
      lY = rect.top + rect.height / 2 - arenaRect.top;
    }
    if (rightElem) {
      const rect = rightElem.getBoundingClientRect();
      rX = rect.left + rect.width / 2 - arenaRect.left;
      rY = rect.top + rect.height / 2 - arenaRect.top;
    }
    if (anchorElem) {
      const rect = anchorElem.getBoundingClientRect();
      tX = rect.left + rect.width / 2 - arenaRect.left;
      tY = rect.top + rect.height / 2 - arenaRect.top;
    } else if (boxElem) {
      const rect = boxElem.getBoundingClientRect();
      tX = rect.left + 35 - arenaRect.left;
      tY = rect.top + rect.height / 2 - arenaRect.top;
    }

    setCoords({
      leftStartX: lX,
      leftStartY: lY,
      rightStartX: rX,
      rightStartY: rY,
      targetX: tX,
      targetY: tY
    });
  }, [trajectoryIdx, step]);

  useEffect(() => {
    measureCoordinates();
    window.addEventListener("resize", measureCoordinates);
    return () => window.removeEventListener("resize", measureCoordinates);
  }, [measureCoordinates]);

  useEffect(() => {
    return () => {
      if (flightTimeoutRef.current) clearTimeout(flightTimeoutRef.current);
    };
  }, []);

  const handleApplyEquation = (eqText: string) => {
    const generated = buildEquationSteps(eqText);
    setSteps(generated);
    setCurrentStepIdx(0);
    setPhase(1);
    setTrajectoryIdx(-1);
    setIsFlying(false);
    setPlaygroundTokens(generated[0].tokensPhase1);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEquation.trim()) return;
    handleApplyEquation(inputEquation);
  };

  const triggerNextTrajectory = (nextIdx: number) => {
    measureCoordinates();
    if (prefersReducedMotion) {
      setTrajectoryIdx(nextIdx);
      setIsFlying(false);
      return;
    }
    setIsFlying(true);
    flightTimeoutRef.current = setTimeout(() => {
      setTrajectoryIdx(nextIdx);
      setIsFlying(false);
    }, flightDuration * 1000);
  };

  const handleNext = () => {
    if (isFlying) return;

    if (step.isTrajectoryExpansion && phase === 2 && step.trajectorySteps) {
      if (trajectoryIdx < step.trajectorySteps.length - 1) {
        triggerNextTrajectory(trajectoryIdx + 1);
        return;
      }
    }

    if (phase < 4) {
      setPhase((prev) => (prev + 1) as Phase);
      setTrajectoryIdx(-1);
      setIsFlying(false);
    } else {
      if (!isFinalStep) {
        setCurrentStepIdx((prev) => prev + 1);
        setPhase(1);
        setTrajectoryIdx(-1);
        setIsFlying(false);
      }
    }
  };

  const handlePrev = () => {
    if (isFlying) return;

    if (step.isTrajectoryExpansion && phase === 2 && trajectoryIdx >= 0) {
      setTrajectoryIdx((p) => p - 1);
      setIsFlying(false);
    } else if (phase > 1) {
      setPhase((p) => (p - 1) as Phase);
      setTrajectoryIdx(-1);
      setIsFlying(false);
    } else if (currentStepIdx > 0) {
      setCurrentStepIdx((p) => p - 1);
      setPhase(4);
      setTrajectoryIdx(-1);
      setIsFlying(false);
    }
  };

  const handleReset = () => {
    if (flightTimeoutRef.current) clearTimeout(flightTimeoutRef.current);
    setCurrentStepIdx(0);
    setPhase(1);
    setTrajectoryIdx(-1);
    setIsFlying(false);
    setPlaygroundTokens(steps[0].tokensPhase1);
  };

  // **ხელით მართვის მექანიზმები (გასწორებული State მართვით)**
  const handleTokenSelect = (token: EquationToken) => {
    setSelectedTokenId(token.id);
    setCustomTokenText(token.text);
  };

  const handleUpdateCustomToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTokenId) return;
    setPlaygroundTokens((prev) =>
      prev.map((t) => (t.id === selectedTokenId ? { ...t, text: customTokenText } : t))
    );
  };

  const handleToggleTargetToken = (id: string) => {
    setPlaygroundTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isTarget: !t.isTarget } : t))
    );
  };

  const handleAddToken = () => {
    const newToken: EquationToken = {
      id: `custom-${Date.now()}`,
      text: "new",
      type: "variable",
      isTarget: true
    };
    setPlaygroundTokens((prev) => [...prev, newToken]);
    setSelectedTokenId(newToken.id);
    setCustomTokenText("new");
  };

  const handleDeleteToken = (id: string) => {
    setPlaygroundTokens((prev) => prev.filter((t) => t.id !== id));
    setTokenPositions((prev) => {
      const remainingPositions = { ...prev };
      delete remainingPositions[id];
      return remainingPositions;
    });
    if (selectedTokenId === id) {
      setSelectedTokenId(null);
      setCustomTokenText("");
    }
  };

  const getDefaultTokenPosition = (index: number): TokenPosition => ({
    x: 16 + (index % 3) * 100,
    y: 20 + Math.floor(index / 3) * 68
  });

  const establishedTokens =
    step.isTrajectoryExpansion && step.trajectorySteps && trajectoryIdx >= 0
      ? step.trajectorySteps.slice(0, trajectoryIdx + 1).flatMap((s) => s.appendTokens)
      : [];

  const flyIdx = trajectoryIdx + 1;
  const currentFlyData =
    step.isTrajectoryExpansion && isFlying && step.trajectorySteps ? step.trajectorySteps[flyIdx] : null;

  const isAtVeryStart = currentStepIdx === 0 && phase === 1 && trajectoryIdx <= 0;
  const canReset = currentStepIdx > 0 || phase > 1 || trajectoryIdx >= 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 font-sans select-none">
      {/* 1. ზედა პანელი: ამოცანის შეყვანა & რეჟიმის გადამრთველი */}
      <div className="rounded-3xl border border-hairline bg-white p-4 sm:p-6 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PlusCircle className="size-4 text-navy" aria-hidden="true" />
            <h3 className="text-sm font-bold text-ink">მათემატიკური ამოცანების გენერატორი</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextState = !isManualPlayground;
                setIsManualPlayground(nextState);
                if (nextState) {
                  setPlaygroundTokens(activeTokens);
                }
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl border transition shadow-xs ${
                isManualPlayground
                  ? "bg-rose-600 text-white border-rose-600 ring-2 ring-rose-200"
                  : "bg-paper text-ink border-hairline hover:border-navy/40"
              }`}
            >
              <Sliders className="size-3.5" aria-hidden="true" />
              {isManualPlayground ? "ხელით მართვა: ჩართულია" : "ხელით მართვა: გამორთულია"}
            </button>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-navy-tint text-navy">
              <Sparkles className="size-3" aria-hidden="true" />
              AI Engine v2.4
            </span>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <label htmlFor="equation-input" className="sr-only">
            განტოლება ან ფორმულა
          </label>
          <input
            id="equation-input"
            type="text"
            value={inputEquation}
            onChange={(e) => setInputEquation(e.target.value)}
            placeholder="შეიყვანეთ განტოლება ან ფორმულა..."
            className="flex-1 rounded-2xl border border-hairline bg-paper px-4 py-3 text-sm font-mono font-bold text-ink outline-none focus:ring-2 focus:ring-navy/30 transition min-w-0"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-navy px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-navy-strong transition shrink-0"
          >
            <Play className="size-3.5" aria-hidden="true" />
            გენერირება
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-muted mr-1">პრესეტები:</span>
          {PRESET_EQUATIONS.map((preset) => (
            <button
              key={preset.eq}
              type="button"
              onClick={() => {
                setInputEquation(preset.eq);
                handleApplyEquation(preset.eq);
              }}
              className="rounded-lg bg-paper px-2.5 py-1 text-[11px] font-mono font-bold text-muted hover:bg-navy-tint hover:text-navy transition"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. მთავარი 2-სვეტიანი სამუშაო სივრცე */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* მარცხენა სვეტი: ნაბიჯების ქრონოლოგია */}
        <div className="lg:col-span-4 flex flex-col rounded-3xl border border-hairline bg-white p-4 sm:p-5 shadow-sm min-h-[320px] lg:min-h-[560px]">
          <div className="flex items-center justify-between pb-3 border-b border-hairline-soft mb-3 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <History className="size-3.5 text-navy" aria-hidden="true" /> ამოხსნის ეტაპები
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-navy-tint text-navy font-mono">
              {currentStepIdx + 1} / {steps.length}
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-paper mb-3 overflow-hidden shrink-0" aria-hidden="true">
            <motion.div
              className="h-full rounded-full bg-navy"
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto pr-1 -mr-1">
            {steps.map((s, idx) => {
              const isUnlocked = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  title={`${s.title} — ${s.compactFormula}`}
                  onClick={() => {
                    if (isUnlocked && !isFlying) {
                      setCurrentStepIdx(idx);
                      setPhase(1);
                      setTrajectoryIdx(-1);
                      setIsFlying(false);
                      if (isManualPlayground) setPlaygroundTokens(s.tokensPhase1);
                    }
                  }}
                  aria-current={isCurrent ? "step" : undefined}
                  disabled={!isUnlocked}
                  className={`w-full text-left rounded-2xl p-3 border transition-all flex items-center justify-between ${
                    !isUnlocked
                      ? "opacity-40 border-dashed border-hairline bg-paper/30 cursor-not-allowed"
                      : isCurrent
                      ? "border-navy bg-navy-tint/40 shadow-sm ring-1 ring-navy/20"
                      : "border-hairline bg-paper/60 hover:border-navy/40 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isCurrent
                          ? "bg-navy text-white shadow-sm"
                          : isUnlocked
                          ? "bg-emerald-600 text-white"
                          : "bg-paper-deep text-muted"
                      }`}
                    >
                      {isUnlocked && !isCurrent ? <Check className="size-3.5" aria-hidden="true" /> : idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isCurrent ? "text-navy" : "text-ink"}`}>
                        {s.title}
                      </p>
                      <p className="text-[11px] font-mono text-muted truncate">{s.compactFormula}</p>
                    </div>
                  </div>
                  {isCurrent && <ChevronRight className="size-4 text-navy shrink-0 ml-1" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="pt-3 mt-3 border-t border-hairline-soft flex items-center justify-between shrink-0">
            <p className="text-[11px] text-muted font-medium">აირჩიეთ ეტაპი ან მიჰყევით ფაზებს</p>
            <button
              type="button"
              onClick={handleReset}
              disabled={!canReset || isFlying}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-navy disabled:opacity-30 rounded-md px-1.5 py-1 transition"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              თავიდან
            </button>
          </div>
        </div>

        {/* მარჯვენა სვეტი: მთავარი ინტერაქტიული ანიმაციური დაფა */}
        <div className="lg:col-span-8 flex flex-col rounded-3xl border border-hairline bg-white p-5 sm:p-6 shadow-sm min-h-[420px] lg:min-h-[560px]">
          <div className="flex flex-col gap-2 border-b border-hairline-soft pb-3 shrink-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="rounded-lg bg-navy px-3 py-1 text-xs font-bold text-white font-mono shrink-0">
                ნაბიჯი {currentStepIdx + 1}
              </span>
              <h4 className="text-sm font-bold text-ink leading-snug" title={step.title}>
                {step.title} {isManualPlayground && <span className="text-rose-600 font-normal">(ხელით მართვა)</span>}
              </h4>
            </div>
            <span className="inline-flex w-fit items-center gap-1 rounded-lg bg-navy-tint px-3 py-1 text-xs font-semibold text-navy">
              <HelpCircle className="size-3.5 shrink-0" aria-hidden="true" />
              {step.ruleTitle}
            </span>
          </div>

          {/* ცენტრალური ზონა */}
          <div className="flex-1 flex flex-col items-center justify-center py-4 w-full min-h-0">
            {!isManualPlayground ? (
              <>
                <div
                  className="flex flex-wrap items-center justify-center gap-2 mb-6 shrink-0"
                  role="tablist"
                  aria-label="ამონახსნის ფაზები"
                >
                  {([1, 2, 3, 4] as Phase[]).map((pNum) => (
                    <button
                      key={pNum}
                      type="button"
                      role="tab"
                      aria-selected={phase === pNum}
                      disabled={isFlying}
                      onClick={() => {
                        setPhase(pNum);
                        setTrajectoryIdx(-1);
                        setIsFlying(false);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono transition shadow-xs disabled:opacity-40 ${
                        phase === pNum
                          ? "bg-navy text-white ring-2 ring-navy/30"
                          : "bg-paper text-muted hover:text-navy hover:bg-navy-tint/30"
                      }`}
                    >
                      <span className="hidden sm:inline">ფაზა {pNum} · {PHASE_LABELS[pNum]}</span>
                      <span className="sm:hidden">ფაზა {pNum}</span>
                    </button>
                  ))}
                </div>

                {step.isTrajectoryExpansion && phase === 2 && step.trajectorySteps ? (
                  <div ref={arenaRef} className="relative w-full flex flex-col items-center justify-center py-10 min-h-[220px]">
                    <AnimatePresence>
                      {isFlying && currentFlyData && (
                        <>
                          <div
                            style={{
                              position: "absolute",
                              left: `${coords.leftStartX}px`,
                              top: `${coords.leftStartY}px`
                            }}
                            className="-translate-x-1/2 -translate-y-1/2 pointer-events-none z-40"
                          >
                            <motion.div
                              key={`flight-L-${flyIdx}`}
                              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                              animate={{
                                x: [0, 0, 0, coords.targetX - coords.leftStartX, coords.targetX - coords.leftStartX, coords.targetX - coords.leftStartX],
                                y: [0, -65, -65, -65, -65, -65],
                                opacity: [1, 1, 1, 1, 1, 0],
                                scale: [1, 1.25, 1.25, 1.25, 1.25, 0]
                              }}
                              transition={{ times: [0, 0.15, 0.32, 0.55, 0.68, 0.72], duration: flightDuration, ease: "easeInOut" }}
                              className="font-mono font-black text-rose-600 text-2xl sm:text-3xl drop-shadow-sm flex items-center justify-center whitespace-nowrap"
                            >
                              {currentFlyData.leftFlyText}
                            </motion.div>
                          </div>

                          <div
                            style={{
                              position: "absolute",
                              left: `${coords.rightStartX}px`,
                              top: `${coords.rightStartY}px`
                            }}
                            className="-translate-x-1/2 -translate-y-1/2 pointer-events-none z-40"
                          >
                            <motion.div
                              key={`flight-R-${flyIdx}`}
                              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                              animate={{
                                x: [0, 0, 0, coords.targetX - coords.rightStartX, coords.targetX - coords.rightStartX, coords.targetX - coords.rightStartX],
                                y: [0, -65, -65, -65, -65, -65],
                                opacity: [1, 1, 1, 1, 1, 0],
                                scale: [1, 1.25, 1.25, 1.25, 1.25, 0]
                              }}
                              transition={{ times: [0, 0.15, 0.32, 0.55, 0.68, 0.72], duration: flightDuration, ease: "easeInOut" }}
                              className="font-mono font-black text-rose-600 text-2xl sm:text-3xl drop-shadow-sm flex items-center justify-center whitespace-nowrap"
                            >
                              {currentFlyData.rightFlyText}
                            </motion.div>
                          </div>

                          <div
                            style={{
                              position: "absolute",
                              left: `${coords.targetX}px`,
                              top: `${coords.targetY}px`
                            }}
                            className="-translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
                          >
                            <motion.div
                              key={`flight-Res-${flyIdx}`}
                              initial={{ x: 0, y: -65, opacity: 0, scale: 0 }}
                              animate={{
                                x: [0, 0, 0, 0, 0],
                                y: [-65, -65, -65, -65, 0],
                                opacity: [0, 0, 1, 1, 1],
                                scale: [0, 0, 1.35, 1.35, 1]
                              }}
                              transition={{ times: [0, 0.68, 0.72, 0.85, 1.0], duration: flightDuration, ease: "easeInOut" }}
                              className="font-mono font-black text-rose-600 text-2xl sm:text-3xl drop-shadow-md flex items-center justify-center whitespace-nowrap"
                            >
                              {currentFlyData.flyingResult}
                            </motion.div>
                          </div>
                        </>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-wrap items-center justify-center gap-3 w-full relative z-10 max-w-full overflow-x-auto overflow-y-visible px-2">
                      <div className="flex items-center gap-1.5 pr-2">
                        <span className="text-xl sm:text-2xl font-bold text-ink">(</span>
                        {step.leftParenTokens?.map((tok, i) => {
                          const activeStep = isFlying
                            ? step.trajectorySteps![flyIdx]
                            : trajectoryIdx >= 0
                            ? step.trajectorySteps![trajectoryIdx]
                            : null;
                          const isHigh = activeStep && i === activeStep.highlightLeftIdx;
                          return (
                            <motion.span
                              key={`l-${i}`}
                              ref={(el) => {
                                leftTokensRef.current[i] = el;
                              }}
                              animate={{ scale: isHigh ? 1.35 : 1, color: isHigh ? "#e11d48" : "#0f172a" }}
                              transition={{ duration: 0.4 }}
                              className="font-mono text-xl sm:text-2xl font-black inline-block"
                            >
                              {tok}
                            </motion.span>
                          );
                        })}
                        <span className="text-xl sm:text-2xl font-bold text-ink">)</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-2">
                        <span className="text-xl sm:text-2xl font-bold text-ink">(</span>
                        {step.rightParenTokens?.map((tok, i) => {
                          const activeStep = isFlying
                            ? step.trajectorySteps![flyIdx]
                            : trajectoryIdx >= 0
                            ? step.trajectorySteps![trajectoryIdx]
                            : null;
                          const isHigh = activeStep && i === activeStep.highlightRightIdx;
                          return (
                            <motion.span
                              key={`r-${i}`}
                              ref={(el) => {
                                rightTokensRef.current[i] = el;
                              }}
                              animate={{ scale: isHigh ? 1.35 : 1, color: isHigh ? "#e11d48" : "#0f172a" }}
                              transition={{ duration: 0.4 }}
                              className="font-mono text-xl sm:text-2xl font-black inline-block"
                            >
                              {tok}
                            </motion.span>
                          );
                        })}
                        <span className="text-xl sm:text-2xl font-bold text-ink">)</span>
                      </div>

                      <span className="text-2xl sm:text-3xl font-black font-mono text-muted pl-1 pr-3">=</span>

                      <div
                        ref={targetBoxRef}
                        className="flex flex-wrap items-center min-h-[50px] min-w-[120px] px-3 py-1 rounded-2xl border-2 border-dashed border-rose-400 bg-rose-50/20"
                      >
                        {establishedTokens.length === 0 && (
                          <span className="text-xs font-semibold text-rose-300 px-2">შედეგი გამოჩნდება აქ</span>
                        )}
                        {establishedTokens.map((tok, idx) => (
                          <motion.span
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 120, damping: 15 }}
                            key={`${tok.id}-${idx}`}
                            className="font-mono font-black flex items-center justify-center text-rose-600 text-xl sm:text-2xl px-1"
                          >
                            {tok.text}
                          </motion.span>
                        ))}
                        <span ref={targetAnchorRef} className="inline-block w-1 h-6" />
                      </div>
                    </div>

                    <p className="mt-6 text-xs font-bold text-rose-900 bg-rose-100/80 px-4 py-2 rounded-full border border-rose-300 shadow-xs text-center max-w-full" aria-live="polite">
                      {trajectoryIdx >= 0
                        ? step.trajectorySteps[trajectoryIdx].note
                        : "დააჭირეთ ღილაკს მამრავლების ეტაპობრივი გადამრავლებისთვის"}
                    </p>
                  </div>
                ) : (
                  <LayoutGroup id={`step-layout-${currentStepIdx}`}>
                    <motion.div
                      layout
                      transition={{ type: "spring", stiffness: 60, damping: 18 }}
                      className="flex flex-wrap items-center justify-center gap-2 max-w-full px-4 py-4"
                    >
                      {activeTokens.map((token) => {
                        const isTarget = token.isTarget;
                        const isOperator = token.type === "operator";

                        const getAnimatedStyles = () => {
                          if (!isTarget) {
                            return {
                              color: isOperator ? "#64748b" : "#334155",
                              scale: 1,
                              y: 0,
                              opacity: phase === 2 || phase === 3 ? 0.4 : 1
                            };
                          }
                          if (phase === 1) return { color: "#ea580c", scale: 1.12, y: 0, opacity: 1 };
                          if (phase === 2) return { color: "#ea580c", scale: 1.15, y: 0, opacity: 1 };
                          if (phase === 3) return { color: "#9333ea", scale: 1.2, y: 0, opacity: 1 };
                          return { color: "#059669", scale: 1.05, y: 0, opacity: 1 };
                        };

                        return (
                          <motion.div
                            layout
                            key={token.id}
                            animate={getAnimatedStyles()}
                            transition={{
                              layout: { type: "spring", stiffness: 60, damping: 18 },
                              color: { duration: 0.6, ease: "easeInOut" },
                              scale: { duration: 0.6, ease: "easeInOut" },
                              y: { type: "spring", stiffness: 70, damping: 18 },
                              opacity: { duration: 0.5, ease: "easeInOut" }
                            }}
                            className={`relative flex items-center justify-center font-mono font-black px-1 sm:px-2 ${
                              token.text.length > 8 ? "text-base sm:text-xl" : isOperator ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                            }`}
                          >
                            {token.text}
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </LayoutGroup>
                )}

                <div className="mt-6 text-center w-full max-w-xl px-2 shrink-0">
                  <p
                    className="text-xs sm:text-sm font-bold text-navy bg-navy-tint/60 px-5 py-3 rounded-2xl border border-navy/10 leading-relaxed shadow-xs"
                    aria-live="polite"
                  >
                    {phase === 1 && step.phase1Text}
                    {phase === 2 && step.phase2Text}
                    {phase === 3 && step.phase3Text}
                    {phase === 4 && step.phase4Text}
                  </p>
                </div>
              </>
            ) : (
              /* ==========================================
                 PLAYGROUND / ხელით მართვის სრულად მუშა რეჟიმი
                 ========================================== */
              <div className="w-full space-y-6">
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between text-rose-800 text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <MousePointerClick className="size-4" aria-hidden="true" />
                      გადაათრიეთ სიმბოლოები ველში ან დააკლიკეთ მათ შესაცვლელად:
                    </span>
                    <button
                      type="button"
                      onClick={handleAddToken}
                      className="inline-flex items-center gap-1 bg-rose-600 text-white px-3 py-1 rounded-lg text-xs shadow-xs hover:bg-rose-700 transition"
                    >
                      <Plus className="size-3.5" aria-hidden="true" /> ელემენტის დამატება
                    </button>
                  </div>
                  <div
                    ref={playgroundRef}
                    className="relative min-h-64 overflow-hidden rounded-xl border border-hairline bg-white shadow-xs touch-none"
                  >
                    {playgroundTokens.map((token, index) => {
                      const isSelected = selectedTokenId === token.id;
                      const position = tokenPositions[token.id] ?? getDefaultTokenPosition(index);
                      return (
                        <motion.div
                          key={token.id}
                          drag
                          dragConstraints={playgroundRef}
                          dragElastic={0}
                          dragMomentum={false}
                          style={{ left: position.x, top: position.y }}
                          onDragEnd={(_, info) => {
                            setTokenPositions((prev) => {
                              const currentPosition = prev[token.id] ?? getDefaultTokenPosition(index);
                              return {
                                ...prev,
                                [token.id]: {
                                  x: currentPosition.x + info.offset.x,
                                  y: currentPosition.y + info.offset.y
                                }
                              };
                            });
                          }}
                          className="absolute group cursor-grab active:cursor-grabbing touch-none"
                        >
                          <button
                            type="button"
                            onClick={() => handleTokenSelect(token)}
                            className={`font-mono font-black px-3.5 py-2.5 rounded-xl border transition-all ${
                              isSelected
                                ? "bg-rose-600 text-white border-rose-600 ring-2 ring-rose-300 scale-110 shadow-sm"
                                : token.isTarget
                                ? "bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400"
                                : "bg-paper text-ink border-hairline hover:border-navy/40"
                            }`}
                          >
                            {token.text}
                          </button>
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteToken(token.id);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-xs"
                            title="წაშლა"
                          >
                            <Trash2 className="size-3" aria-hidden="true" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {selectedTokenId ? (
                  <div className="rounded-2xl border border-hairline bg-paper p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                        <Edit3 className="size-3.5 text-navy" aria-hidden="true" />
                        არჩეული ელემენტი ID: <span className="font-mono text-rose-600 font-bold">{selectedTokenId}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedTokenId(null)}
                        className="text-[11px] font-semibold text-muted hover:text-ink"
                      >
                        დახურვა
                      </button>
                    </div>
                    <form onSubmit={handleUpdateCustomToken} className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={customTokenText}
                        onChange={(e) => setCustomTokenText(e.target.value)}
                        className="flex-1 rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-mono font-bold text-ink outline-none"
                        placeholder="შეცვალეთ ტექსტი..."
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-navy-strong transition"
                      >
                        განახლება
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleTargetToken(selectedTokenId)}
                        className="rounded-xl border border-hairline bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-paper-deep transition"
                      >
                        მონიშვნა (Target)
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-paper-deep/50 rounded-2xl border border-dashed border-hairline">
                    <p className="text-xs text-muted font-medium">
                      👆 დააჭირეთ ზემოთ მოცემული ფორმულის რომელიმე სიმბოლოს, რომ გახსნათ მისი რედაქტორი.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ქვედა მართვის ღილაკები */}
          <div className="flex items-center justify-between pt-3 border-t border-hairline-soft shrink-0">
            <button
              type="button"
              disabled={isAtVeryStart || isFlying || isManualPlayground}
              onClick={handlePrev}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-muted hover:text-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 transition disabled:opacity-30"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              წინა ფაზა
            </button>

            {isFinalStep && phase === 4 && !isManualPlayground ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-2.5 text-xs font-bold text-emerald-700 shadow-xs">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                ამოხსნა დასრულებულია
              </span>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={isFlying || isManualPlayground}
                className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-navy-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 transition disabled:opacity-50"
              >
                {isManualPlayground
                  ? "ხელით მართვის რეჟიმი აქტიურია"
                  : phase === 1
                  ? "2. გარდაქმნა →"
                  : step.isTrajectoryExpansion && phase === 2 && step.trajectorySteps && trajectoryIdx < step.trajectorySteps.length - 1
                  ? `შემდეგი წევრი (${trajectoryIdx + 2}/${step.trajectorySteps.length}) →`
                  : phase === 2
                  ? "3. ტრანსფორმაცია →"
                  : phase === 3
                  ? "4. დაფიქსირება →"
                  : "შემდეგი ნაბიჯი →"}
                {!isManualPlayground && <ChevronRight className="size-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
