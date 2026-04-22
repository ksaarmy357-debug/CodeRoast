// API key is stored in localStorage for security — never hardcoded
let OPENROUTER_API_KEY = localStorage.getItem("coderoast_api_key") || "";

const examples = {
  python: `def calculate(l):
    s = 0
    for i in range(0, len(l), 1):
        s = s + l[i]
    x = s / len(l)
    return x

data = [1,2,3,4,5,6,7,8,9,10]
print(calculate(data))`,

  js: `function getData() {
  var data = null;
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "https://api.example.com/data", false);
  xhr.send();
  if (xhr.status == 200) {
    data = JSON.parse(xhr.responseText);
  }
  return data;
}
var result = getData();
console.log(result);`,

  java: `public class Calculator {
    public static void main(String[] args) {
        int a = 10;
        int b = 0;
        int c = a / b;
        System.out.println(c);
    }
    public int add(int x, int y) {
        return x + y;
    }
    public int add(int x, int y, int z) {
        return x + y + z;
    }
}`
};

function loadExample(lang) {
  const langMap = { python: "Python", js: "JavaScript", java: "Java" };
  document.getElementById("codeInput").value = examples[lang];
  document.getElementById("lang").value = langMap[lang];
  updateCount();
}

function updateCount() {
  const len = document.getElementById("codeInput").value.length;
  document.getElementById("charCount").textContent = len + " chars";
}

function extractScore(text) {
  const match = text.match(/(\d+)\/10/);
  return match ? match[1] + "/10" : null;
}

function getScoreClass(score) {
  if (!score) return "score-bad";
  const num = parseInt(score);
  if (num >= 7) return "score-good";
  if (num >= 4) return "score-mid";
  return "score-bad";
}

// Prompt user for API key if not set
function ensureApiKey() {
  if (OPENROUTER_API_KEY) return true;
  const key = prompt("Enter your OpenRouter API key:\n(Get one free at openrouter.ai/keys)");
  if (key && key.trim()) {
    OPENROUTER_API_KEY = key.trim();
    localStorage.setItem("coderoast_api_key", OPENROUTER_API_KEY);
    // Hide the API notice
    const notice = document.querySelector(".api-notice");
    if (notice) notice.style.display = "none";
    return true;
  }
  return false;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Hide API notice if key already stored
document.addEventListener("DOMContentLoaded", () => {
  if (OPENROUTER_API_KEY) {
    const notice = document.querySelector(".api-notice");
    if (notice) notice.style.display = "none";
  }
});

async function roastCode() {
  const code = document.getElementById("codeInput").value.trim();
  const lang = document.getElementById("lang").value;

  if (!code) {
    alert("Paste some code first!");
    return;
  }

  if (!ensureApiKey()) {
    return;
  }

  const btn = document.getElementById("roastBtn");
  btn.disabled = true;
  btn.textContent = "🔥 Roasting...";

  const resultCard = document.getElementById("resultCard");
  const resultBody = document.getElementById("resultBody");
  const actionRow = document.getElementById("actionRow");
  const scoreBadge = document.getElementById("scoreBadge");

  resultCard.style.display = "block";
  actionRow.style.display = "none";
  scoreBadge.textContent = "";
  scoreBadge.className = "score-badge";
  resultBody.innerHTML = '<div class="loading-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';

  try {
    const selectedModel = document.getElementById("modelSelect").value;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.href,
        "X-Title": "CodeRoast"
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: `You are a brutally honest senior software engineer doing a code roast. Be savage, sarcastic, and funny — but ALWAYS educational.

Structure your response exactly like this:

🔥 FIRST REACTION
[One savage, funny one-liner about the code overall]

💀 THE CRIMES
[List 3-5 specific issues, each with a witty roast line + explanation of why it's bad]

✨ REDEMPTION ARC
[2-3 genuine, helpful tips to fix the worst issues]

📊 VERDICT: [X]/10 — [funny one-liner rating]

Keep it under 350 words. Plain text only, no markdown symbols.`
          },
          {
            role: "user",
            content: `Roast this ${lang} code:\n\n${code}`
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      // If auth error, clear the stored key
      if (data.error.code === 401 || data.error.message?.includes("auth")) {
        localStorage.removeItem("coderoast_api_key");
        OPENROUTER_API_KEY = "";
        const notice = document.querySelector(".api-notice");
        if (notice) notice.style.display = "block";
      }
      throw new Error(data.error.message || "API request failed");
    }

    const text = data.choices?.[0]?.message?.content || "Something went wrong. Even our roaster gave up.";

    const score = extractScore(text);
    if (score) {
      scoreBadge.textContent = score;
      scoreBadge.className = "score-badge " + getScoreClass(score);
    }

    // Use escapeHtml to prevent XSS from API output
    resultBody.innerHTML = `<div class="result-body">${escapeHtml(text)}</div>`;
    actionRow.style.display = "flex";

  } catch (err) {
    resultBody.innerHTML = `<div class="result-body" style="color:#ef4444;">Error: ${escapeHtml(err.message)}</div>`;
  }

  btn.disabled = false;
  btn.textContent = "🔥 Roast My Code";
}

function copyRoast() {
  const text = document.querySelector(".result-body")?.textContent;
  if (text) {
    navigator.clipboard.writeText(text);
    const btn = event.target;
    btn.textContent = "✅ Copied!";
    setTimeout(() => btn.textContent = "📋 Copy roast", 1500);
  }
}
