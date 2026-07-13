/**
 * Central Claude model config for all AI features.
 *
 * Change the model in ONE place here, or override at runtime with the
 * ANTHROPIC_MODEL env var (no code change / redeploy needed) — so a model
 * update or retirement never breaks AI features across the app.
 *
 * Use the BARE ALIAS (no date suffix). Aliases are the stable identifiers;
 * dated snapshots (e.g. claude-sonnet-4-20250514) get retired and then 404.
 * Current options: claude-sonnet-5 (fast/cheap, good default for these
 * utility calls), claude-opus-4-8 (most capable), claude-haiku-4-5 (cheapest).
 */
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
