const DEFAULT_API_BASE_URL = "https://www.bgremover.video/api/v1";
const DEFAULT_TIMEOUT_MS = 120000;

export type BgremoverConfig = {
  apiKey: string;
  apiBaseUrl: string;
  timeoutMs: number;
  nodeEnv: string;
  logLevel: string;
};

export type BaseBgremoverConfig = {
  apiBaseUrl: string;
  timeoutMs: number;
  nodeEnv: string;
  logLevel: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BgremoverConfig {
  const apiKey = env.BGREMOVER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("BGREMOVER_API_KEY is required.");
  }

  return {
    ...loadBaseConfig(env),
    apiKey,
  };
}

export function loadBaseConfig(env: NodeJS.ProcessEnv = process.env): BaseBgremoverConfig {
  const apiBaseUrl = (env.BGREMOVER_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
  const timeoutMs = Number(env.BGREMOVER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const nodeEnv = env.NODE_ENV || "development";
  const logLevel = env.LOG_LEVEL || (nodeEnv === "production" ? "info" : "debug");

  return {
    apiBaseUrl,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
    nodeEnv,
    logLevel,
  };
}
