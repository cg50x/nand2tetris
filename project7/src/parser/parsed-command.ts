import type { CommandType } from "./command-type";

export interface ParsedCommand {
  commandType: CommandType;
  arg1: string;
  arg2: number;
}
