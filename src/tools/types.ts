export type ToolOk<T> = { ok: true; data: T };
export type ToolErr = { ok: false; error: string };
export type ToolResult<T> = ToolOk<T> | ToolErr;