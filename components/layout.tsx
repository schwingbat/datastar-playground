import { html } from "hono/html";

export interface LayoutProps {
  title: string;
  children?: any;
}

export function Layout(props: LayoutProps) {
  return html`
    <!doctype html>
    <html>
      <head>
        <title>${props.title}</title>
        <link rel="stylesheet" href="/site.css" />
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
