import { Hono } from "hono";
import { html } from "hono/html";
import { serveStatic } from "hono/bun";
import { EventEmitter, on } from "node:events";
import { eventStream, executeScript, patchElements } from "./lib-hono.js";
import { Layout } from "./components/layout.js";

const emitter = new EventEmitter();
let currentCount = 0;

emitter.on("update", (value) => {
  currentCount = value;
});

const app = new Hono();

app.use("/*", serveStatic({ root: "./public" }));

// Render page on load with the latest currentCount.
app.get("/counter", (c) => {
  return c.html(
    <Layout title="Counter">
      <div data-init="@get('/counter/subscribe')">
        <p id="count">{currentCount}</p>

        <button data-on:click="@put('/counter/increment')">Increment</button>
        <button data-on:click="@put('/counter/decrement')">Decrement</button>

        <button data-on:click="@put('/counter/test')">Send Script</button>
      </div>
    </Layout>,
  );
});

app.get("/counter/subscribe", (c) => {
  return eventStream(c, async function* (signal) {
    // Render current count
    yield patchElements(<p id="count">{currentCount}</p>);

    // Subscribe to further updates until the connection closes.
    try {
      for await (const [count] of on(emitter, "update", { signal })) {
        yield patchElements(<p id="count">{count}</p>);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Connection closed. Listener removed.
      } else {
        throw error;
      }
    }
  });
});

app.put("/counter/test", (c) => {
  return eventStream(c, async function* () {
    // Run arbitrary JS on the client
    yield executeScript(`
      console.log("HELLO FROM THE SERVER");
    `);
  });
});

// Increment; the event emitter will trigger updates for subscribers.
app.put("/counter/increment", (c) => {
  emitter.emit("update", currentCount + 1);
  return c.text("OK");
});

// Decrement; the event emitter will trigger updates for subscribers.
app.put("/counter/decrement", (c) => {
  emitter.emit("update", currentCount - 1);
  return c.text("OK");
});

export default {
  fetch: app.fetch,
  idleTimeout: 60,
};
