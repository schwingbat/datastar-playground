import type { Context } from "hono";
import type { JSXNode } from "hono/jsx";
import { streamSSE } from "hono/streaming";
import type { HtmlEscapedString } from "hono/utils/html";

export async function eventStream(
  c: Context,
  fn: (abortSignal: AbortSignal) => AsyncGenerator<string, string | void>,
) {
  const encoder = new TextEncoder();
  return streamSSE(c, async (stream) => {
    for await (const message of fn(c.req.raw.signal)) {
      if (stream.aborted) return;
      await stream.write(encoder.encode(message));
    }
  });
}

/*================================*\
||            Utilities           ||
\*================================*/

/**
 * Formats a name and data object as an event stream message.
 */
function _formatEvent(name: string, data: Record<string, any>): string {
  const lines = [`event: ${name}\n`];
  for (const [key, value] of Object.entries(data)) {
    const itemLines = String(value).split("\n");
    for (const line of itemLines) {
      lines.push(`data: ${key} ${line}\n`);
    }
  }
  lines.push("\n");
  return lines.join("");
}

export async function readSignals<T = Record<string, any>>(
  c: Context,
): Promise<T> {
  let signals = {} as T;

  if (c.req.method === "GET") {
    const datastar = new URL(c.req.url).searchParams.get("datastar");
    if (datastar) {
      signals = JSON.parse(datastar);
    } else {
      throw new Error(`No signals in request.`);
    }
  } else if (c.req.header("Content-Type") === "application/json") {
    signals = await c.req.json();
  } else {
    throw new Error(`No signals in request.`);
  }

  return signals;
}

export interface PatchSignalsOptions {
  /**
   * Only update each signal if a signal with that name doesn't already exist.
   */
  onlyIfMissing?: boolean;
}

export function patchSignals(
  signals: Record<string, any>,
  options?: PatchSignalsOptions,
): string {
  return _formatEvent("datastar-patch-signals", { signals, ...options });
}

export interface PatchElementsOptions {
  mode?:
    | "outer"
    | "inner"
    | "replace"
    | "prepend"
    | "append"
    | "before"
    | "after";
  selector?: string;
  namespace?: "svg" | "mathml";
  useViewTransition?: boolean;
}

export async function patchElements(
  elements: string | HtmlEscapedString | Promise<HtmlEscapedString> | JSXNode,
  options?: PatchElementsOptions,
): Promise<string> {
  return _formatEvent("datastar-patch-elements", {
    elements: String(await elements),
    ...options,
  });
}

export interface RemoveElementsOptions {
  useViewTransition?: boolean;
}

export async function removeElements(
  selector: string,
  options?: RemoveElementsOptions,
): Promise<string> {
  return _formatEvent("datastar-patch-elements", {
    selector,
    ...options,
    mode: "remove",
  });
}

export interface ExecuteScriptOptions {}

export function executeScript(
  script: string,
  options?: ExecuteScriptOptions,
): string {
  return _formatEvent("datastar-patch-elements", {
    elements: `<script data-effect="el.remove()">${script}</script>`,
    selector: "body",
    mode: "append",
  });
}
