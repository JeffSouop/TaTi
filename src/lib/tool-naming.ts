// Tools coming from multiple MCP servers must be uniquely named for the LLM.
// We prefix each tool with `srv{shortId}__{originalName}` and provide
// helpers to encode/decode the prefix.

export function encodeToolName(serverId: string, toolName: string): string {
  // Use first 8 hex chars of the serverId for a short, deterministic prefix
  const short = serverId.replace(/-/g, "").slice(0, 8);
  // Replace non-alphanumeric chars in toolName with _ for safety
  const safe = toolName.replace(/[^a-zA-Z0-9_]/g, "_");
  return `srv${short}__${safe}`;
}

export function decodeToolName(
  encoded: string,
): { serverShortId: string; toolName: string } | null {
  const m = encoded.match(/^srv([a-f0-9]{8})__(.+)$/);
  if (!m) return null;
  return { serverShortId: m[1], toolName: m[2] };
}

export function shortServerId(serverId: string): string {
  return serverId.replace(/-/g, "").slice(0, 8);
}
