import { Inject, Injectable } from '@nestjs/common';
import OpenAI from 'openai';

import { OPENAI_CLIENT } from './openai.constants';
import type { Options } from './openai.types';

@Injectable()
export class OpenAiService {
  constructor(@Inject(OPENAI_CLIENT) private readonly openai: OpenAI) {}

  async generateJson<T = unknown>(opts: Options): Promise<T> {
    const { system, user, schema, model = 'gpt-4o-mini' } = opts;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (system) {
      messages.push({
        role: 'system',
        content: system,
      });
    }

    messages.push({
      role: 'user',
      content: user,
    });

    const result = await this.openai.chat.completions.create({
      model,
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'response',
          schema,
          strict: true,
        },
      },
    });

    const content = result.choices[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI returned empty content');
    }

    return JSON.parse(content) as T;
  }
}
