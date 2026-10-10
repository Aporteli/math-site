import { Library } from 'lucide-react';
import { PageHero } from '@/components/ui/PageHero';
import type { ProblemBankCopy } from '@/lib/math/problems';
import { StatRow } from './StatRow';

type ProblemBankHeroProps = {
  copy: ProblemBankCopy;
  title: string;
  subtitle: string;
  showSaveToLab: boolean;
  labCount: number;
  bankCount: number;
  lessonSetCount: number;
  generatedCount: number;
};

export function ProblemBankHero({
  copy,
  title,
  subtitle,
  showSaveToLab,
  labCount,
  bankCount,
  lessonSetCount,
  generatedCount,
}: ProblemBankHeroProps) {
  return (
    <PageHero
      icon={Library}
      eyebrow={copy.eyebrow}
      title={title}
      description={subtitle}
      aside={
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-1">
          <StatRow label={showSaveToLab ? copy.stats.inLab : copy.stats.inBank} value={showSaveToLab ? labCount : bankCount} />
          <StatRow label={copy.stats.selected} value={lessonSetCount} />
          <StatRow label={copy.stats.generated} value={generatedCount} />
        </div>
      }
    />
  );
}
