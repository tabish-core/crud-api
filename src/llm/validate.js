const fs = require('fs');
const path = require('path');
const { getClient } = require('./client');
const { TriageSchema } = require('./schema');
const { logCall, quarantine } = require('./logger');

const PROMPT_PATH = path.join(__dirname, '..', '..', 'prompts', 'triage-v1.md');
const PROMPT_VERSION = 'triage-v1';

function stripToJSON(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model output');
  return cleaned.slice(start, end + 1);
}

function parseAndValidate(rawOutput) {
  let value;
  try {
    const cleaned = stripToJSON(rawOutput);
    value = JSON.parse(cleaned);
  } catch (cause) {
    const error = new Error('LLM response was not valid JSON', { cause });
    error.status = 422;
    throw error;
  }

  const parsed = TriageSchema.safeParse(value);
  if (!parsed.success) {
    const error = new Error('LLM response did not match the triage schema', {
      cause: parsed.error,
    });
    error.status = 422;
    throw error;
  }
  return parsed.data;
}

async function requestCompletion(client, model, systemPrompt, userContent) {
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0,
  });
  const content = response.choices && response.choices[0] && response.choices[0].message
    ? response.choices[0].message.content
    : null;
  if (typeof content !== 'string' || content.trim() === '') {
    const error = new Error('LLM returned an empty response');
    error.status = 422;
    throw error;
  }
  return { content: content.trim(), usage: response.usage || {} };
}

async function classify(text) {
  const startedAt = Date.now();
  const model = process.env.LLM_MODEL || 'openrouter/free';
  const systemPrompt = fs.readFileSync(PROMPT_PATH, 'utf8');
  const client = getClient();
  let rawOutput = '';
  let repaired = false;

  try {
    let completion = await requestCompletion(client, model, systemPrompt, text);
    rawOutput = completion.content;

    try {
      const result = parseAndValidate(rawOutput);
      logCall({
        promptVersion: PROMPT_VERSION,
        model,
        inputTokens: completion.usage.prompt_tokens,
        outputTokens: completion.usage.completion_tokens,
        durationMs: Date.now() - startedAt,
        repaired,
        success: true,
      });
      return result;
    } catch (firstError) {
      repaired = true;
      completion = await requestCompletion(
        client,
        model,
        `${systemPrompt}\n\nYour previous response was invalid. Return only a corrected JSON object matching the required schema.`,
        `Original customer message:\n${text}\n\nInvalid response to repair:\n${rawOutput}`
      );
      rawOutput = completion.content;
      const result = parseAndValidate(rawOutput);
      logCall({
        promptVersion: PROMPT_VERSION,
        model,
        inputTokens: completion.usage.prompt_tokens,
        outputTokens: completion.usage.completion_tokens,
        durationMs: Date.now() - startedAt,
        repaired,
        success: true,
      });
      return result;
    }
  } catch (error) {
    try {
      quarantine({
        input: text,
        rawOutput,
        error: error.message,
        promptVersion: PROMPT_VERSION,
      });
    } catch (loggingError) {
      console.error('[llm] failed to quarantine invalid response:', loggingError);
    }
    logCall({
      promptVersion: PROMPT_VERSION,
      model,
      durationMs: Date.now() - startedAt,
      repaired,
      success: false,
    });
    throw error;
  }
}

module.exports = { classify };
