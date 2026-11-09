import { Logger, LoggerOptions, pino } from "pino"; //instalar pino: npm install --save-dev pino pino-pretty

function getLogger(level: string): Logger {
  const config: LoggerOptions = {
    level: level,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: false,
        destination: `logs/${level}Logs.log`,
        append: false,
        singleLine: true,
        ignore: "pid,hostname",
        translateTime: "SYS:HH:MM:ss.l",
        mkdir: true,
      },
    },
  };
  return pino(config);
}

const loggerInfo = getLogger("info");
const loggerDebug = getLogger("debug");
const loggerTrace = getLogger("trace");

export const Logs = {
  trace(message: string): void {
    loggerTrace.trace(message);
  },

  debug(message: string): void {
    loggerTrace.debug(message);
    loggerDebug.debug(message);
  },

  info(message: string): void {
    loggerTrace.info(` ${message}`);
    loggerDebug.info(` ${message}`);
    loggerInfo.info(` ${message}`);
  },

  warn(message: string): void {
    loggerTrace.warn(message);
    loggerDebug.warn(message);
    loggerInfo.warn(message);
  },

  error(message: string): void {
    loggerTrace.error(message);
    loggerDebug.error(message);
    loggerInfo.error(message);
  },

  fatal(message: string): void {
    loggerTrace.fatal(message);
    loggerDebug.fatal(message);
    loggerInfo.fatal(message);
  },
};
