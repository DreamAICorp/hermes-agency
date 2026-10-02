import { describe, expect, it } from "vitest";

import { agentModelId, createAgentModel, liveDelegationEnvironment } from "./model";

describe("createAgentModel", () => {
  it("defaults to gpt-6-luna on OpenAI's Responses API", () => {
    const model = createAgentModel({ OPENAI_API_KEY: "sk-test" });
    expect(agentModelId({}).model).toBe("gpt-6-luna");
    expect(model).toMatchObject({ provider: "openai.responses", modelId: "gpt-6-luna" });
  });

  it("uses chat completions for other OpenAI-compatible endpoints", () => {
    const model = createAgentModel({ AI_CHAT_BASE_URL: "http://127.0.0.1:18090/v1", AI_CHAT_MODEL: "local-model" });
    expect(model).toMatchObject({ provider: "openai.chat", modelId: "local-model" });
  });

  it("treats OpenAI's URL with trailing slashes as OpenAI", () => {
    expect(createAgentModel({ OPENAI_API_KEY: "sk-test", AI_CHAT_BASE_URL: "https://api.openai.com/v1//" })).toMatchObject({ provider: "openai.responses" });
  });

  it("needs a key to reach OpenAI", () => {
    expect(createAgentModel({})).toBeUndefined();
  });
});

describe("liveDelegationEnvironment", () => {
  it("runs live delegation on the chat model with low reasoning by default", () => {
    const environment = liveDelegationEnvironment({ OPENAI_API_KEY: "sk-test", AI_CHAT_REASONING_EFFORT: "high", AI_CHAT_INPUT_COST_PER_MILLION_TOKENS: "1", AI_CHAT_OUTPUT_COST_PER_MILLION_TOKENS: "2" });
    expect(environment).toMatchObject({ AI_CHAT_MODEL: "gpt-6-luna", AI_CHAT_REASONING_EFFORT: "low", AI_CHAT_INPUT_COST_PER_MILLION_TOKENS: "1" });
    expect(createAgentModel(environment)).toMatchObject({ provider: "openai.responses", modelId: "gpt-6-luna" });
  });

  it("takes its own model and reasoning effort, and drops the chat model's prices for another model", () => {
    const environment = liveDelegationEnvironment({ AI_CHAT_MODEL: "gpt-6-luna", AI_DELEGATION_MODEL: "gpt-6-mini", AI_DELEGATION_REASONING_EFFORT: "medium", AI_CHAT_INPUT_COST_PER_MILLION_TOKENS: "1", AI_CHAT_OUTPUT_COST_PER_MILLION_TOKENS: "2" });
    expect(environment).toMatchObject({ AI_CHAT_MODEL: "gpt-6-mini", AI_CHAT_REASONING_EFFORT: "medium" });
    expect(environment.AI_CHAT_INPUT_COST_PER_MILLION_TOKENS).toBeUndefined();
    expect(environment.AI_CHAT_OUTPUT_COST_PER_MILLION_TOKENS).toBeUndefined();
  });

  it("ignores an unknown reasoning effort", () => {
    expect(liveDelegationEnvironment({ AI_DELEGATION_REASONING_EFFORT: "fast" }).AI_CHAT_REASONING_EFFORT).toBe("low");
  });
});
