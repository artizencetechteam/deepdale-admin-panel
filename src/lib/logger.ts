type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, extra?: unknown): void {
  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;

  if (extra === undefined) {
    console[level](prefix, message);
    return;
  }

  console[level](prefix, message, extra);
}

export const logger = {
  info(message: string, extra?: unknown): void {
    log("info", message, extra);
  },
  warn(message: string, extra?: unknown): void {
    log("warn", message, extra);
  },
  error(message: string, extra?: unknown): void {
    log("error", message, extra);
  }
};
