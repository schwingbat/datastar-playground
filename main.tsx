import { Hono } from "hono";
import { html } from "hono/html";
import { EventEmitter, on } from "node:events";
import { eventStream, patchElements } from "./lib-hono.js";

const emitter = new EventEmitter();
let currentCount = 0;

emitter.on("update", (value) => {
  currentCount = value;
});

const app = new Hono();

interface LayoutProps {
  title: string;
  children?: any;
}

function Layout(props: LayoutProps) {
  return html`
    <!doctype html>
    <html>
      <head>
        <title>${props.title}</title>
      </head>
      <body>
        ${props.children}
      </body>

      <script
        type="module"
        src="https://cdn.jsdelivr.net/gh/starfederation/datastar@1.0.0-RC.8/bundles/datastar.js"
      ></script>
    </html>
  `;
}

// Render page on load with the latest currentCount.
app.get("/counter", (c) => {
  return c.html(
    <Layout title="Counter">
      <div data-init="@get('/counter/subscribe')">
        <p id="count">{currentCount}</p>

        <button data-on:click="@put('/counter/increment')">Increment</button>
        <button data-on:click="@put('/counter/decrement')">Decrement</button>
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
        console.log("Connection closed. Listener removed.");
      } else {
        throw error;
      }
    }
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
