import { ToolDefinition } from '@gordon/shared-types';

export interface HelloWorldInput {
  name?: string;
  repeat?: number;
}

export interface HelloWorldOutput {
  greeting: string;
  timestamp: number;
  echoCount: number;
}

export const HelloWorldTool: ToolDefinition<HelloWorldInput, HelloWorldOutput> = {
  name: 'hello_world',
  description: 'Deterministic Hello World verification tool for M0 foundation testing',
  version: '1.0.0',
  capabilities: ['system:exec'],
  isDeterministic: true,
  inputSchema: {
    type: 'object',
    description: 'Parameters for Hello World execution',
    properties: {
      name: { type: 'string', description: 'Name to greet' },
      repeat: { type: 'number', description: 'Number of times to repeat greeting' },
    },
  },
  execute: async (input, context) => {
    const name = input.name || 'Gordon Analytics';
    const repeat = Math.max(1, Math.min(input.repeat || 1, 10));
    const greetings = Array.from({ length: repeat }, () => `Hello, ${name}!`);

    return {
      success: true,
      data: {
        greeting: greetings.join(' '),
        timestamp: context.invokedAt,
        echoCount: repeat,
      },
      durationMs: 1,
    };
  },
};
