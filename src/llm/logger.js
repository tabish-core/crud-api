const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const QUARANTINE_FILE = path.join(LOG_DIR, 'quarantine.jsonl');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logCall({ promptVersion, model, inputTokens, outputTokens, durationMs, repaired, success }) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    promptVersion,
    model,
    inputTokens,
    outputTokens,
    durationMs,
    repaired,
    success,
  });
  console.log('[llm]', line);
}

function quarantine({ input, rawOutput, error, promptVersion }) {
  ensureLogDir();
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    promptVersion,
    input,
    rawOutput,
    error,
  });
  fs.appendFileSync(QUARANTINE_FILE, line + '\n');
}

module.exports = { logCall, quarantine };