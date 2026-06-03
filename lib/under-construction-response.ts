import { NextResponse } from "next/server";

function underConstructionHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>byte-earn | Under Construction</title>
    <style>
      :root {
        color-scheme: dark;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at top, rgba(34, 211, 238, 0.12), transparent 28rem),
          linear-gradient(180deg, #09111f 0%, #050913 100%);
        color: #f8fafc;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      main {
        width: 100%;
        max-width: 540px;
        text-align: center;
      }

      img {
        width: min(280px, 72vw);
        height: auto;
        display: block;
        margin: 0 auto 24px;
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 7vw, 3rem);
        line-height: 0.98;
        letter-spacing: -0.04em;
      }

      p {
        margin: 14px auto 0;
        max-width: 34ch;
        color: #cbd5e1;
        font-size: 0.95rem;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main>
      <img src="/under-construction-illustration.svg" alt="Construction illustration" />
      <h1>We are coming back soon.</h1>
      <p>The platform is currently under construction while we finish an update.</p>
    </main>
  </body>
</html>`;
}

export function createUnderConstructionResponse() {
  return new NextResponse(underConstructionHtml(), {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
    },
    status: 503,
  });
}

export function createUnderConstructionBlockedResponse() {
  return new NextResponse("Service unavailable while the platform is under construction.", {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
    status: 503,
  });
}
