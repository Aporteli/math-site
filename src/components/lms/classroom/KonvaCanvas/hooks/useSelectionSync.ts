import { useEffect } from 'react';
import type { RefObject } from 'react';
import Konva from 'konva';

export function useSelectionSync(
  selectedIds: string[],
  trRef: RefObject<Konva.Transformer | null>,
  stageRef: RefObject<Konva.Stage | null>,
  mainLayerRef: RefObject<Konva.Layer | null>,
) {
  // Content-based key. `selectedIds` is a fresh array on most renders, so
  // depending on it directly re-runs this effect on every render — which,
  // combined with `tr.nodes(...)` firing Konva events, produces the
  // "Maximum update depth exceeded" loop.
  const selectionKey = selectedIds.join('|');

  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    const nodes = selectionKey
      ? selectionKey
          .split('|')
          .map((id) => stage.findOne('#' + id))
          .filter((n): n is Konva.Node => Boolean(n))
      : [];

    // Skip redundant writes: if the transformer already holds exactly
    // these nodes, re-setting them can trigger internal Konva events and
    // feed the loop.
    const current = tr.nodes();
    const same =
      current.length === nodes.length &&
      current.every((n, i) => n === nodes[i]);
    if (!same) {
      tr.nodes(nodes);
    }

    mainLayerRef.current?.batchDraw();
  }, [selectionKey, trRef, stageRef, mainLayerRef]);
}