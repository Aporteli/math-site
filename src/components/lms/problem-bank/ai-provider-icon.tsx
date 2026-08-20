import type { AiProviderId } from "@/lib/math/problems/ai-models";

const PROVIDER_ICON_SRC: Record<AiProviderId, string> = {
  gemini: "/ai-providers/gemini.svg",
  groq: "/ai-providers/groq.svg",
  deepseek: "/ai-providers/deepseek.svg",
  openai: "/ai-providers/openai.svg",
  huggingface: "/ai-providers/huggingface.svg",
  anthropic: "/ai-providers/anthropic.svg",
  cloudflare: "/ai-providers/cloudflare.svg",
};

export function AiProviderIcon({
  provider,
  className = "size-4 shrink-0",
}: {
  provider: AiProviderId;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local brand SVG marks
    <img
      src={PROVIDER_ICON_SRC[provider]}
      alt=""
      aria-hidden="true"
      className={className}
    />
  );
}
