// app.js
// client-side: POST to Cloud Function and read streamed NDJSON
const FUNCTION_URL = "https://us-central1-minerxgloble.cloudfunctions.net/computeTeamDeposits";

const logsEl = document.getElementById("logs");
const resultsEl = document.getElementById("results");
const startBtn = document.getElementById("startBtn");
const clearBtn = document.getElementById("clearBtn");
const rootUidInput = document.getElementById("rootUid");
const passwordInput = document.getElementById("password");
const mainForm = document.getElementById("mainForm");

function appendLog(text) {
  const now = new Date().toLocaleTimeString();
  logsEl.textContent += `[${now}] ${text}\n`;
  logsEl.scrollTop = logsEl.scrollHeight;
}

function clearAll() {
  logsEl.textContent = "";
  resultsEl.innerHTML = "";
}

clearBtn.addEventListener("click", clearAll);

function setBusy(isBusy) {
  startBtn.disabled = isBusy;
  if (isBusy) startBtn.classList.add("busy"), startBtn.textContent = "Running...";
  else startBtn.classList.remove("busy"), startBtn.textContent = "Start";
}

mainForm.addEventListener("submit", (e) => {
  e.preventDefault();
  startBtn.click();
});

startBtn.addEventListener("click", async () => {
  clearAll();
  const rootUid = rootUidInput.value.trim();
  const password = passwordInput.value;

  if (!rootUid) { appendLog("Please enter Root UID"); return; }
  if (!password) { appendLog("Please enter Password"); return; }

  setBusy(true);
  appendLog("Connecting to server...");

  try {
    const resp = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rootUid, password })
    });

    if (!resp.ok && resp.status !== 200) {
      appendLog(`Server responded ${resp.status} ${resp.statusText}`);
      const txt = await resp.text();
      appendLog(`Body: ${txt}`);
      setBusy(false);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffered = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });

      const lines = buffered.split("\n");
      buffered = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        let obj;
        try { obj = JSON.parse(line); } catch (e) {
          appendLog("Invalid JSON chunk: " + line);
          continue;
        }

        if (obj.type === "log") {
          appendLog(obj.text || JSON.stringify(obj));
        } else if (obj.type === "error") {
          appendLog("ERROR: " + (obj.text || JSON.stringify(obj)));
        } else if (obj.type === "result") {
          appendLog("Received final result");
          renderResult(obj.value);
        } else if (obj.type === "done") {
          appendLog("Done. Duration: " + (obj.durationMs || "unknown") + " ms");
        } else {
          appendLog("MSG: " + JSON.stringify(obj));
        }
      }
    }

    if (buffered.trim()) {
      try {
        const obj = JSON.parse(buffered);
        if (obj.type === "result") renderResult(obj.value);
        else appendLog("Leftover: " + JSON.stringify(obj));
      } catch (e) {
        appendLog("Leftover invalid JSON: " + buffered);
      }
    }
  } catch (err) {
    appendLog("Fetch/read error: " + (err.message || err));
  } finally {
    setBusy(false);
  }
});

function renderResult(result) {
  resultsEl.innerHTML = "";
  if (!result || !result.levels || !result.levels.length) {
    resultsEl.textContent = "No results.";
    return;
  }

  const table = document.createElement("table");
  table.innerHTML = `<thead><tr><th>Level</th><th>Users</th><th>AdminDepositTotal</th><th>TotalDeposit</th></tr></thead>`;
  const tbody = document.createElement("tbody");

  result.levels.forEach(l => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${l.level}</td><td>${l.userCount}</td><td>${Number(l.adminDepositTotal).toFixed(2)}</td><td>${Number(l.totalDeposit).toFixed(2)}</td>`;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  resultsEl.appendChild(table);

  const grand = result.grand || {};
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify({
    Users: grand.userCount || 0,
    AdminDepositTotal: Number((grand.adminDepositTotal || 0)).toFixed(2),
    TotalDeposit: Number((grand.totalDeposit || 0)).toFixed(2)
  }, null, 2);

  const heading = document.createElement("h3");
  heading.textContent = "Grand Totals";
  resultsEl.appendChild(heading);
  resultsEl.appendChild(pre);
}