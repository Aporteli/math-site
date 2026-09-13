'use server';

import { getAiModel, envValue, type AiModelId } from '@/lib/math/problems/ai-models';
import { assertModelAvailable, recordModelUse } from '@/lib/math/problems/ai-limits';

export interface RawAiInput {
  modelId: AiModelId;
  prompt: string;
  image?: {
    mimeType: string;
    base64Data: string;
  };
}

export type RawAiResponse =
  | { ok: true; text: string }
  | { ok: false; error: string };

export async function askRawAiAction(input: RawAiInput): Promise<RawAiResponse> {
  try {
    const model = getAiModel(input.modelId);
    if (!model) {
      return { ok: false, error: 'მოდელი ვერ მოიძებნა' };
    }

    // შევამოწმოთ ლიმიტები
    await assertModelAvailable(input.modelId);

    const apiKeyName = model.env[0];
    const apiKey = apiKeyName ? envValue(apiKeyName) : '';
    if (!apiKey) {
      return { ok: false, error: 'API გასაღები არ არის კონფიგურირებული' };
    }

    let resultText = '';

    // სუფთა base64 მონაცემის ამოღება
    let cleanBase64 = input.image?.base64Data || '';
    if (cleanBase64.includes('base64,')) {
      cleanBase64 = cleanBase64.split('base64,')[1];
    }

    // 1. Google Gemini
    if (model.provider === 'gemini') {
      const parts: any[] = [{ text: input.prompt }];
      if (cleanBase64 && input.image?.mimeType) {
        parts.unshift({
          inlineData: {
            mimeType: input.image.mimeType,
            data: cleanBase64,
          },
        });
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.apiModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        return { ok: false, error: `Gemini API შეცდომა: ${errText}` };
      }

      const data = await res.json();
      resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    // 2. OpenAI-თან თავსებადი პროვაიდერები (OpenAI, Groq, DeepSeek)
    else if (model.provider === 'openai' || model.provider === 'groq' || model.provider === 'deepseek') {
      let endpoint = 'https://api.openai.com/v1/chat/completions';
      if (model.provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      if (model.provider === 'deepseek') endpoint = 'https://api.deepseek.com/chat/completions';

      const content: any[] = [{ type: 'text', text: input.prompt }];
      if (cleanBase64 && input.image?.mimeType) {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${input.image.mimeType};base64,${cleanBase64}`,
          },
        });
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model.apiModel,
          messages: [{ role: 'user', content: cleanBase64 ? content : input.prompt }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { ok: false, error: `${model.provider.toUpperCase()} API შეცდომა: ${errText}` };
      }

      const data = await res.json();
      resultText = data?.choices?.[0]?.message?.content || '';
    }
    // 3. Anthropic (Claude)
    else if (model.provider === 'anthropic') {
      const content: any[] = [];
      if (cleanBase64 && input.image?.mimeType) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: input.image.mimeType,
            data: cleanBase64,
          },
        });
      }
      content.push({ type: 'text', text: input.prompt });

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model.apiModel,
          max_tokens: 4096,
          messages: [{ role: 'user', content }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { ok: false, error: `Anthropic API შეცდომა: ${errText}` };
      }

      const data = await res.json();
      resultText = data?.content?.[0]?.text || '';
    } else {
      return { ok: false, error: 'მხარდაუჭერელი პროვაიდერი' };
    }

    // ჩავწეროთ გამოყენება
    await recordModelUse(input.modelId);

    return { ok: true, text: resultText };
  } catch (err: any) {
    return { ok: false, error: err.message || 'დაფიქსირდა შეცდომა' };
  }
}