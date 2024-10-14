const arithCommands = [
  "add",
  "sub",
  "neg",
  "eq",
  "gt",
  "lt",
  "and",
  "or",
  "not",
] as const;

export type ArithmeticCommand = (typeof arithCommands)[number];

export function isArithmeticCommand(command?: string): command is ArithmeticCommand {
  for (const arithCommand of arithCommands) {
    if (arithCommand === command) {
      return true;
    }
  }
  return false;
}
