import type { BunFile } from "bun";
import type { CommandType } from "./command-type";
import type { ParsedCommand } from "./parsed-command";
import { isArithmeticCommand } from "./arithmetic-command";

export class Parser {
  private streamReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  private buffer: string = "";
  private textDecoder = new TextDecoder();
  private commandBuffer: string[] = [];
  private currentCommand?: ParsedCommand;
  static async create(file: BunFile) {
    const newParser = new Parser();
    const newStream = await file.stream();
    newParser.streamReader = newStream.getReader();
    return newParser;
  }
  private constructor() {}

  /**
   * Checks if advance can be called.
   * If hasMoreCommands
   * @returns 
   */
  public async hasMoreCommands(): Promise<boolean> {
    if (!this.streamReader) {
      throw new Error("Reader not initialized");
    }
    if (this.commandBuffer.length > 0) {
      return true;
    }
    let readerDone = false;
    const bufferHasNewline = () => {
      return this.buffer.includes("\r\n") || this.buffer.includes("\n");
    };
    while (!readerDone && !bufferHasNewline()) {
      const { value: chunk, done } = await this.streamReader.read();
      if (chunk) {
        const chunkString = this.textDecoder.decode(chunk);
        this.buffer += chunkString;
      }
      readerDone = done;
    }
    // If reader is done, and buffer is empty, we are done, no more commands
    if (this.buffer.length === 0 && readerDone) {
      return false;
    }

    // Collecting the lines except for the last chunk
    let lines = this.buffer.split(/\r?\n/);
    if (lines.length > 1) {
      this.buffer = lines.pop() ?? "";
    } else {
      // Make sure buffer is emptied
      this.buffer = "";
    }
    // Ignore all whitespace and comments
    lines = lines
      .map((line) => line.replace(/\/\/.*/, "").trim())
      .filter((line) => line.length > 0);
    // Assumption: The file is all valid commands
    // Adding all commands to the command buffer
    this.commandBuffer.push(...lines);
    return this.commandBuffer.length > 0;
  }

  public async advance(): Promise<void> {
    // Advance just puts the command buffer
    // TODO Determine if hasMoreCommands is necessary
    if (await this.hasMoreCommands()) {
      const nextCommand = this.commandBuffer.shift();
      this.currentCommand = this.parseCommand(nextCommand);
    }
  }

  public commandType(): CommandType | undefined {
    return this.currentCommand?.commandType;
  }

  public arg1(): string | undefined {
    return this.currentCommand?.arg1;
  }

  public arg2(): number | undefined {
    return this.currentCommand?.arg2;
  }

  private parseCommand(commandInput?: string): ParsedCommand | undefined {
    // Find a parser that can parse the given string
    const answer = [
      this.parseArithmeticCommand,
      this.parsePopCommand,
      this.parsePushCommand,
      this.parseLabelCommand,
      this.parseGotoCommand,
      this.parseIfGotoCommand,
      this.parseFunctionCommand,
      this.parseCallCommand,
      this.parseReturnCommand
    ].reduce<ParsedCommand | undefined>(
      (parsedCommand, parser) => parsedCommand ?? parser(commandInput),
      undefined
    );
    return answer;
  }

  private parseArithmeticCommand(
    commandInput?: string
  ): ParsedCommand | undefined {
    if (isArithmeticCommand(commandInput)) {
      return {
        commandType: "C_ARITHMETIC",
        arg1: commandInput,
        arg2: NaN,
      };
    }
    return;
  }

  // push segment i
  private parsePushCommand(commandInput?: string): ParsedCommand | undefined {
    const pushRegex = /^push\s(?<segment>[a-z]+)\s(?<index>[0-9]+)/;
    const pushMatch = commandInput?.match(pushRegex);
    if (pushMatch?.groups) {
      const { segment, index } = pushMatch.groups;
      return {
        commandType: "C_PUSH",
        arg1: segment,
        arg2: parseInt(index),
      };
    }
  }

  // pop segment i
  private parsePopCommand(commandInput?: string): ParsedCommand | undefined {
    const popRegex = /^pop\s(?<segment>[a-z]+)\s(?<index>[0-9]+)/;
    const popMatch = commandInput?.match(popRegex);
    if (popMatch?.groups) {
      const { segment, index } = popMatch.groups;
      return {
        commandType: "C_POP",
        arg1: segment,
        arg2: parseInt(index),
      };
    }
  }

  // label label
  private parseLabelCommand(commandInput?: string): ParsedCommand | undefined {
    const pattern = /^label\s(?<labelName>[^\s]+)$/;
    const match = commandInput?.match(pattern);
    if (match?.groups) {
      const { labelName } = match.groups;
      return {
        commandType: "C_LABEL",
        arg1: labelName,
        arg2: NaN,
      };
    }
  }

  // goto label
  private parseGotoCommand(commandInput?: string): ParsedCommand | undefined {
    const pattern = /^goto\s(?<labelName>[^\s]+)$/;
    const match = commandInput?.match(pattern);
    if (match?.groups) {
      const { labelName } = match.groups;
      return {
        commandType: "C_GOTO",
        arg1: labelName,
        arg2: NaN,
      };
    }
  }

  // if-goto label
  private parseIfGotoCommand(commandInput?: string): ParsedCommand | undefined {
    const pattern = /^if-goto\s(?<labelName>[^\s]+)$/;
    const match = commandInput?.match(pattern);
    if (match?.groups) {
      const { labelName } = match.groups;
      return {
        commandType: "C_IF",
        arg1: labelName,
        arg2: NaN,
      };
    }
  }

  // function function-name nLocalVars
  private parseFunctionCommand(commandInput?: string): ParsedCommand | undefined {
    const pattern = /^function\s(?<functionName>[^\s]+)\s(?<localVarCount>[0-9]+)/;
    const match = commandInput?.match(pattern);
    if (match?.groups) {
      const { functionName, localVarCount } = match.groups;
      return {
        commandType: "C_FUNCTION",
        arg1: functionName,
        arg2: parseInt(localVarCount),
      };
    }
  }

  // call function-name nArgs
  private parseCallCommand(commandInput?: string): ParsedCommand | undefined {
    const pattern = /^call\s(?<functionName>[^\s]+)\s(?<argCount>[0-9]+)/;
    const match = commandInput?.match(pattern);
    if (match?.groups) {
      const { functionName, argCount } = match.groups;
      return {
        commandType: "C_CALL",
        arg1: functionName,
        arg2: parseInt(argCount),
      };
    }
  }

  // return
  private parseReturnCommand(commandInput?: string): ParsedCommand | undefined {
    if (commandInput === "return") {
      return {
        commandType: "C_RETURN",
        arg1: commandInput,
        arg2: NaN
      }
    }
  }
}
