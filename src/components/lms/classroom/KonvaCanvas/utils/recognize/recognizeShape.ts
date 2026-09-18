// KonvaCanvas/utils/recognize/recognizeShape.ts
import { recognizeCircle, RecognizedCircle } from './recognizeCircle';
import {
  recognizeRect, RecognizedRect,
  recognizeTriangle, RecognizedTriangle,
  recognizeParallelogram, RecognizedParallelogram,
  recognizeLine, RecognizedLine,
  rectFallback,
} from './recognizePolygon';
import { detectCornersExact } from './geometry';

export type RecognizedShape =
  | { kind: 'circle'; circle: RecognizedCircle }
  | { kind: 'rect'; rect: RecognizedRect }
  | { kind: 'triangle'; triangle: RecognizedTriangle }
  | { kind: 'parallelogram'; parallelogram: RecognizedParallelogram }
  | { kind: 'line'; line: RecognizedLine };

/**
 * ერთიანი შესასვლელი.
 *
 * რიგი:
 *  1. წრე — ყველაზე სპეციფიკური.
 *  2. თუ 4 წვერო მოიძებნა — სცადე მართკუთხედი, მერე პარალელოგრამი.
 *  3. სცადე სამკუთხედი — **მანამ, სანამ** rect fallback-ს გამოიყენებ.
 *     ეს გადამწყვეტია იმ შემთხვევისთვის, როცა სამკუთხედის ერთი გვერდი
 *     ოდნავ მოხრილია: 4-კუთხედის ინტერპრეტაცია ვერ ცნობს (კუთხეები
 *     არ არის 90°, გვერდები არ არის ტოლი), მაგრამ 3-კუთხედის
 *     ინტერპრეტაცია წარმატებით ცნობს.
 *  4. მხოლოდ თუ ვერც rect/parallelogram, ვერც triangle ვერ დადასტურდა —
 *     მართკუთხედი (bbox-ით).
 *  5. სწორი ხაზი — ბოლო შანსი.
 *
 * **არ ვეყრდნობით epsilon-ების შედარებას** — ეს მყიფე იყო, რადგან
 * ხელით ხატვისას epsilon-ები მოულოდნელად შეიძლება "გადაეწონოს".
 */
export function recognizeShape(flat: number[]): RecognizedShape | null {
  // 1. წრე
  const circle = recognizeCircle(flat);
  if (circle) return { kind: 'circle', circle };

  // 2. 4-კუთხედის ინტერპრეტაცია (თუ შესაძლებელია)
  const c4 = detectCornersExact(flat, 4);
  if (c4) {
    const rect = recognizeRect(flat);
    if (rect) return { kind: 'rect', rect };

    const para = recognizeParallelogram(flat);
    if (para) return { kind: 'parallelogram', parallelogram: para };
  }

  // 3. სამკუთხედი — 4-კუთხედის ინტერპრეტაციის წარუმატებლობის შემდეგ,
  //    მაგრამ rectFallback-მდე. ეს იცავს მოხრილი გვერდის მქონე
  //    სამკუთხედებს.
  const c3 = detectCornersExact(flat, 3);
  if (c3) {
    const tri = recognizeTriangle(flat);
    if (tri) return { kind: 'triangle', triangle: tri };
  }

  // 4. 4-კუთხედი მაინც — bbox-ით, თუ არც rect/para, არც triangle.
  //    ეს არის "საუკეთესო ვარაუდი" არასტაბილური ფორმისთვის.
  if (c4) {
    return { kind: 'rect', rect: rectFallback(c4.pts) };
  }

  // 5. სწორი ხაზი
  const line = recognizeLine(flat);
  if (line) return { kind: 'line', line };

  return null;
}