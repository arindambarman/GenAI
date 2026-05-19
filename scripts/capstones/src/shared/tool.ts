import { z } from "zod";

export interface ToolDefinition<TArgs = unknown, TResult = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TArgs>;
  handler: (args: TArgs) => Promise<TResult>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyToolDefinition = ToolDefinition<any, any>;
export type ToolRegistry = Record<string, AnyToolDefinition>;

/**
 * Convert our ToolDefinition format to the Anthropic SDK's tool format.
 * Anthropic expects JSON Schema; we convert from Zod.
 */
export function toAnthropicTools(reg: ToolRegistry): {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}[] {
  return Object.values(reg).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: zodToJsonSchema(t.inputSchema),
  }));
}

/**
 * Minimal Zod → JSON Schema conversion for the shapes we use.
 * Handles object, string, number, boolean, array, enum, nullable, optional.
 * Not exhaustive; sufficient for capstone tool inputs.
 */
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      if (!value.isOptional()) {
        required.push(key);
      }
    }
    return { type: "object", properties, required, additionalProperties: false };
  }
  if (schema instanceof z.ZodString) {
    return { type: "string" };
  }
  if (schema instanceof z.ZodNumber) {
    return { type: "number" };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }
  if (schema instanceof z.ZodArray) {
    return { type: "array", items: zodToJsonSchema(schema.element) };
  }
  if (schema instanceof z.ZodEnum) {
    return { type: "string", enum: (schema.options as readonly string[]).slice() };
  }
  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodNullable) {
    const inner = zodToJsonSchema(schema.unwrap());
    return { ...inner, nullable: true };
  }
  if (schema instanceof z.ZodLiteral) {
    return { const: schema.value };
  }
  return { type: "string" }; // safe fallback
}
