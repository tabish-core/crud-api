const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TRIAGE_URL || 'http://localhost:3000/triage';

async function run() {
  const casesPath = path.join(__dirname, 'cases.json');
  const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

  let passed = 0;
  const failures = [];

  for (const [i, c] of cases.entries()) {
    process.stdout.write(`[${i + 1}/${cases.length}] `);
    try {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: c.input }),
      });
      const body = await res.json();
      const got = body.category;
      const ok = got === c.expected;
      console.log(ok ? 'PASS' : `FAIL (got "${got}", expected "${c.expected}")`);
      if (ok) passed++;
      else failures.push({ input: c.input, expected: c.expected, got });
    } catch (err) {
      console.log('ERROR', err.message);
      failures.push({ input: c.input, expected: c.expected, error: err.message });
    }
  }

  const score = `${passed}/${cases.length}`;
  const percent = ((passed / cases.length) * 100).toFixed(0);
  console.log(`\nScore: ${score} (${percent}%)`);
  console.log(`Date: ${new Date().toISOString().slice(0, 10)}`);
  console.log(`Prompt version: triage-v1`);

  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(` - "${f.input}" → ${f.expected} (got ${f.got || f.error})`);
  }
}

run();