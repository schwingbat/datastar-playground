interface EventStreamOptions {}

export async function eventStream(
  generator: () => AsyncGenerator<string, string | void>,
  options?: EventStreamOptions,
) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const event of generator()) {
        console.log(event);
        controller.enqueue(encoder.encode(event));
      }
      controller.close();
    },
    async cancel(reason) {
      // TODO: Handle stream cancellation.
    },
  });

  const headers = new Headers([["Content-Type", "text/event-stream"]]);

  // TODO: Handle options

  return new Response(stream, { headers });
}

/*================================*\
||            Utilities           ||
\*================================*/

/**
 * Formats a name and data object as an event stream message.
 */
function _formatEvent(name: string, data: Record<string, any>): string {
  return [
    `event: ${name}\n`,
    Object.entries(data).map(
      ([key, value]) =>
        `data: ${key} ${typeof value === "string" && value.startsWith("<") ? value : JSON.stringify(value)}\n`,
    ),
    "\n",
  ].join("");
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readSignals<T = Record<string, any>>(
  req: Request,
): Promise<T> {
  let signals = {} as T;

  if (req.method === "GET") {
    const datastar = new URL(req.url).searchParams.get("datastar");
    if (datastar) {
      signals = JSON.parse(datastar);
    } else {
      throw new Error(`No signals in request.`);
    }
  } else if (req.headers.get("Content-Type") === "application/json") {
    signals = await req.json();
  } else {
    throw new Error(`No signals in request.`);
  }

  return signals;
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
  namespace?: "svg" | "mathml";
  useViewTransition?: boolean;
}

export function patchElements(
  elements: string,
  options?: PatchElementsOptions,
): string {
  return _formatEvent("datastar-patch-elements", { elements, ...options });
}

export interface RemoveElementsOptions {
  useViewTransition?: boolean;
}

export function removeElements(
  selector: string,
  options?: RemoveElementsOptions,
): string {
  return _formatEvent("datastar-patch-elements", {
    selector,
    ...options,
    mode: "remove",
  });
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
