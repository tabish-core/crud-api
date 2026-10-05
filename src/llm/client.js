const OpenAI = require('openai');

let client;

function getClient() {
  if (client) return client;

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    const error = new Error('LLM_API_KEY is not configured');
    error.status = 503;
    throw error;
  }

  try {
    client = new OpenAI({
      baseURL: process.env.LLM_BASE_URL,
      apiKey,
      timeout: 30000,
      maxRetries: 0,
    });
  } catch (cause) {
    const error = new Error('Unable to initialize the LLM client', { cause });
    error.status = 503;
    throw error;
  }

  return client;
}

module.exports = { getClient };
