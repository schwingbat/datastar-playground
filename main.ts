import { serve } from "bun";
import { EventEmitter, on } from "node:events";
import { eventStream, patchElements } from "./lib.js";

import counter from "./pages/counter.html";

const emitter = new EventEmitter();
let currentCount = 0;

emitter.on("update", (value) => {
  currentCount = value;
});

serve({
  port: 4000,
  routes: {
    "/counter": counter,

    "/counter/subscribe": () => {
      return eventStream(async function* () {
        // Render current count
        yield patchElements(`<p id="count">${currentCount}</p>`);

        // Subscribe to further updates
        for await (const [count] of on(emitter, "update")) {
          yield patchElements(`<p id="count">${count}</p>`);
        }
      });
    },

    "/counter/increment": () => {
      emitter.emit("update", currentCount + 1);
      return new Response("OK");
    },

    "/counter/decrement": () => {
      emitter.emit("update", currentCount - 1);
      return new Response("OK");
    },
  },
});
