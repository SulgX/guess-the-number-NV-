const BACKEND_URL = Netlify.env.get("BACKEND_URL") || "https://your-backend-server.com";

async function relayHandler(request) {
  try {
    const url = new URL(request.url);
    const targetPath = url.pathname + url.search;
    const upstreamUrl = new URL(targetPath, BACKEND_URL).toString();

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("x-forwarded-proto");
    headers.delete("x-forwarded-host");
    headers.delete("x-forwarded-for");
    headers.delete("x-nf-connection");
    headers.delete("x-nf-request-id");

    const clientIp = request.headers.get("x-nf-client-connection-ip");
    if (clientIp) {
      headers.set("x-forwarded-for", clientIp);
    }

    const upstreamRequest = new Request(upstreamUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: "manual",
    });

    const upstreamResponse = await fetch(upstreamRequest);

    const responseHeaders = new Headers();
    for (const [key, value] of upstreamResponse.headers.entries()) {
      if (!["transfer-encoding", "connection", "keep-alive"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("relay error:", error);
    return new Response("Bad Gateway", { status: 502 });
  }
}

function gamePage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guess the Number</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .game-box {
      background: rgba(255, 255, 255, 0.92);
      padding: 2.8rem;
      border-radius: 28px;
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
      text-align: center;
      max-width: 440px;
      width: 92%;
    }
    h1 {
      color: #1a202c;
      margin-bottom: 0.5rem;
      font-size: 2rem;
    }
    .subtitle {
      color: #4a5568;
      margin-bottom: 1.8rem;
      font-size: 0.95rem;
    }
    input {
      padding: 15px 18px;
      font-size: 1.1rem;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      width: 100%;
      margin-bottom: 1rem;
      outline: none;
      transition: border-color 0.2s ease;
      text-align: center;
    }
    input:focus {
      border-color: #0f3460;
    }
    .btn-row {
      display: flex;
      gap: 0.6rem;
    }
    button {
      flex: 1;
      padding: 14px;
      font-size: 1rem;
      border: none;
      border-radius: 14px;
      cursor: pointer;
      font-weight: 600;
      transition: transform 0.12s, box-shadow 0.12s;
    }
    button:active {
      transform: scale(0.96);
    }
    button.guess-btn {
      background: #0f3460;
      color: white;
    }
    button.guess-btn:hover {
      background: #1a1a2e;
      box-shadow: 0 6px 18px rgba(15, 52, 96, 0.4);
    }
    button.reset-btn {
      background: #a0aec0;
      color: white;
    }
    button.reset-btn:hover {
      background: #718096;
    }
    .feedback {
      margin: 1.4rem 0;
      font-size: 1.2rem;
      font-weight: bold;
      min-height: 2.8rem;
      line-height: 2.8rem;
    }
    .counter {
      color: #718096;
      font-size: 0.9rem;
    }
    .counter span {
      font-weight: bold;
      color: #2d3748;
    }
  </style>
</head>
<body>
  <div class="game-box">
    <h1>Guess the Number</h1>
    <p class="subtitle">Pick a number between 1 and 100</p>
    <input type="number" id="guessInput" min="1" max="100" placeholder="Your guess...">
    <div class="btn-row">
      <button class="guess-btn" onclick="makeGuess()">Guess</button>
      <button class="reset-btn" onclick="newGame()">New Game</button>
    </div>
    <div class="feedback" id="feedback"></div>
    <div class="counter">Tries: <span id="tryCount">0</span></div>
  </div>
  <script>
    let target = Math.floor(Math.random() * 100) + 1;
    let attempts = 0;

    function makeGuess() {
      const input = document.getElementById('guessInput');
      const num = parseInt(input.value);
      const msg = document.getElementById('feedback');

      if (isNaN(num) || num < 1 || num > 100) {
        msg.textContent = 'Enter a number from 1 to 100';
        msg.style.color = '#e53e3e';
        return;
      }

      attempts++;
      document.getElementById('tryCount').textContent = attempts;

      if (num === target) {
        msg.textContent = 'You win! Number was ' + target;
        msg.style.color = '#38a169';
        input.disabled = true;
      } else if (num < target) {
        msg.textContent = 'Go higher';
        msg.style.color = '#3182ce';
      } else {
        msg.textContent = 'Go lower';
        msg.style.color = '#3182ce';
      }
    }

    function newGame() {
      target = Math.floor(Math.random() * 100) + 1;
      attempts = 0;
      const input = document.getElementById('guessInput');
      input.value = '';
      input.disabled = false;
      document.getElementById('feedback').textContent = '';
      document.getElementById('tryCount').textContent = '0';
    }

    document.getElementById('guessInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') makeGuess();
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default async function handler(request, context) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/" || path === "") {
    return gamePage();
  }

  return relayHandler(request);
}
