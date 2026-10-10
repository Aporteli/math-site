'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export const KonvaCanvas = dynamic(() => import('../../KonvaCanvas/KonvaCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-main">
      <Loader2 className="size-8 animate-spin text-navy" />
    </div>
  ),
});
