import * as z from "zod/v4";

export const providerSchema = z.enum(["claude", "codex", "cursor"]);
export const kindSchema = z.enum(["skill", "mcp", "plugin"]);
export const categorySchema = z.enum(["skill", "configured-mcp", "tool"]);
export const layerSchema = z.enum(["global", "project"]);

export const selectorSchema = z.object({
  providers: z.array(providerSchema).optional(),
  kinds: z.array(kindSchema).optional(),
  categories: z.array(categorySchema).optional(),
  layers: z.array(layerSchema).optional(),
  enabled: z.boolean().optional(),
  ids: z.array(z.string().min(1)).optional(),
});

export const listItemsInputSchema = z.object({
  selector: selectorSchema.optional(),
});

export const singleToggleInputSchema = z.object({
  provider: providerSchema,
  kind: kindSchema,
  layer: layerSchema,
  id: z.string().min(1),
  targetEnabled: z.boolean(),
});

export const singleApplyInputSchema = singleToggleInputSchema.extend({
  requireConfirmation: z.boolean().optional(),
  confirm: z.boolean().optional(),
});

export const bulkPlanInputSchema = z.object({
  selector: selectorSchema.optional(),
  targetEnabled: z.boolean(),
  allowEmptySelection: z.boolean().optional(),
});

export const bulkApplyInputSchema = bulkPlanInputSchema.extend({
  requireConfirmation: z.boolean().optional(),
  confirm: z.boolean().optional(),
  planFingerprint: z.string().min(1),
  maxItems: z.number().int().min(0),
});

export const restoreBackupInputSchema = z.object({
  backupId: z.string().min(1),
});

export type AgentScopeSelector = z.infer<typeof selectorSchema>;
export type SingleToggleInput = z.infer<typeof singleToggleInputSchema>;
export type SingleApplyInput = z.infer<typeof singleApplyInputSchema>;
export type BulkPlanInput = z.infer<typeof bulkPlanInputSchema>;
export type BulkApplyInput = z.infer<typeof bulkApplyInputSchema>;
