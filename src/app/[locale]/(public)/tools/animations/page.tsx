import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { Sparkles } from "lucide-react";
import { MathStepSolver } from "../MathStepSolver";

export const metadata: Metadata = {
  title: "ეტაპობრივი ამოხსნა | MathLab",
  description: "მათემატიკური განტოლებების ანიმირებული, ნაბიჯ-ნაბიჯ ამოხსნა",
};

export default function StepSolverPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 lg:space-y-8">
      <PageHero
        icon={Sparkles}
        eyebrow="ინტერაქტიული ხელსაწყო"
        title="განტოლების ეტაპობრივი ამოხსნა"
        description="ნახეთ როგორ იხსნება მათემატიკური განტოლებები ნაბიჯ-ნაბიჯ, ვიზუალური ანიმაციებითა და ახსნა-განმარტებებით."
      />

      <MathStepSolver />
    </div>
  );
}