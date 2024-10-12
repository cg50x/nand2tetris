import type { BunFile, FileSink } from "bun";
import {
  writeAdd,
  writeAnd,
  writeEq,
  writeGt,
  writeLt,
  writeNeg,
  writeNot,
  writeOr,
  writePopArgument,
  writePopLocal,
  writePopPointer0,
  writePopPointer1,
  writePopStatic,
  writePopTemp,
  writePopThat,
  writePopThis,
  writePushArgument,
  writePushConstant,
  writePushLocal,
  writePushPointer0,
  writePushPointer1,
  writePushStatic,
  writePushTemp,
  writePushThat,
  writePushThis,
  writeSub,
} from "./writer-utils";

type CommandType =
  | "C_ARITHMETIC"
  | "C_PUSH"
  | "C_POP"
  | "C_LABEL"
  | "C_GOTO"
  | "C_IF"
  | "C_FUNCTION"
  | "C_RETURN"
  | "C_CALL";

type ArithmeticCommand =
  | "add"
  | "sub"
  | "neg"
  | "eq"
  | "gt"
  | "lt"
  | "and"
  | "or"
  | "not";

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
];

function isArithmeticCommand(command?: string): command is ArithmeticCommand {
  return !!command && arithCommands.includes(command);
}

type MemorySegment =
  | "local"
  | "argument"
  | "static"
  | "constant"
  | "this"
  | "that"
  | "pointer"
  | "temp";
const memorySegments = [
  "local", "argument", "static", "constant", "this", "that", "pointer", "temp"
];

function isMemorySegment(segment?: string): segment is MemorySegment {
  return !!segment && memorySegments.includes(segment);
}

class Parser {
  private streamReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  private buffer: string = "";
  private textDecoder = new TextDecoder();
  private commandBuffer: string[] = [];
  private currentCommand:
    | {
        commandType: CommandType;
        arg1: string;
        arg2: number;
      }
    | undefined;
  static async create(file: BunFile) {
    const newParser = new Parser();
    const newStream = await file.stream();
    newParser.streamReader = newStream.getReader();
    return newParser;
  }
  private constructor() {}

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
    this.buffer = lines.pop() ?? "";
    // Ignore all whitespace and comments
    lines = lines
      .map((line) => line.replace(/\/\/.*/, ""))
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    // Assumption: The file is all valid commands
    // Adding all commands to the command buffer
    this.commandBuffer.push(...lines);
    return this.commandBuffer.length > 0;
  }

  public async advance(): Promise<void> {
    if (await this.hasMoreCommands()) {
      const nextCommand = this.commandBuffer.shift();
      if (arithCommands.includes(nextCommand ?? "")) {
        this.currentCommand = {
          commandType: "C_ARITHMETIC",
          arg1: nextCommand as string,
          arg2: -1,
        };
        return;
      }
      const pushRegex = /^push\s(?<segment>[a-z]+)\s(?<index>[0-9]+)/;
      const pushMatch = nextCommand?.match(pushRegex);
      if (pushMatch?.groups) {
        const { segment, index } = pushMatch.groups;
        this.currentCommand = {
          commandType: "C_PUSH",
          arg1: segment,
          arg2: parseInt(index),
        };
        return;
      }
      const popRegex = /^pop\s(?<segment>[a-z]+)\s(?<index>[0-9]+)/;
      const popMatch = nextCommand?.match(popRegex);
      if (popMatch?.groups) {
        const { segment, index } = popMatch.groups;
        this.currentCommand = {
          commandType: "C_POP",
          arg1: segment,
          arg2: parseInt(index),
        };
        return;
      }
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
}

class CodeWriter {
  private fileWriter: FileSink | undefined;

  /** Used to create identifier for eq jump labels */
  private nextEqId = 0;
  /** Used to create identifier for gt jump labels */
  private nextGtId = 0;
  /** Used to create identifier for lt jump labels */
  private nextLtId = 0;

  static async create(file: BunFile) {
    const newCodeWriter = new CodeWriter();
    newCodeWriter.fileWriter = file.writer();
    return newCodeWriter;
  }
  private constructor() {}

  public writeArithmetic(command: ArithmeticCommand): void {
    let translation;
    if (command === "add") {
      translation = writeAdd();
    } else if (command == "and") {
      translation = writeAnd();
    } else if (command == "eq") {
      translation = writeEq({ id: `${this.nextEqId++}` });
    } else if (command == "gt") {
      translation = writeGt({ id: `${this.nextGtId++}` });
    } else if (command == "lt") {
      translation = writeLt({ id: `${this.nextLtId++}` });
    } else if (command == "neg") {
      translation = writeNeg();
    } else if (command == "not") {
      translation = writeNot();
    } else if (command == "or") {
      translation = writeOr();
    } else if (command == "sub") {
      translation = writeSub();
    }
    if (translation) {
      this.fileWriter?.write(translation);
    }
  }

  public writePushPop(
    command: "C_PUSH" | "C_POP",
    segment: MemorySegment,
    index: number
  ): void {
    let translation;
    if (segment === "argument") {
      translation =
        command === "C_POP"
          ? writePopArgument({ i: index })
          : writePushArgument({ i: index });
    } else if (segment === "constant") {
      translation = writePushConstant({ i: index });
    } else if (segment === "local") {
      translation =
        command === "C_POP"
          ? writePopLocal({ i: index })
          : writePushLocal({ i: index });
    } else if (segment === "pointer") {
      if (command === "C_POP" && index === 0) {
        translation = writePopPointer0();
      } else if (command === "C_POP" && index === 1) {
        translation = writePopPointer1();
      } else if (command === "C_PUSH" && index === 0) {
        translation = writePushPointer0();
      } else if (command === "C_PUSH" && index === 1) {
        translation = writePushPointer1();
      }
    } else if (segment === "static") {
      translation =
        command === "C_POP"
          ? writePopStatic({ i: index })
          : writePushStatic({ i: index });
    } else if (segment === "temp") {
      translation =
        command === "C_POP"
          ? writePopTemp({ i: index })
          : writePushTemp({ i: index });
    } else if (segment === "that") {
      translation =
        command === "C_POP"
          ? writePopThat({ i: index })
          : writePushThat({ i: index });
    } else if (segment === "this") {
      translation =
        command === "C_POP"
          ? writePopThis({ i: index })
          : writePushThis({ i: index });
    }
    if (translation) {
      this.fileWriter?.write(translation);
    }
  }
  public close() {
    this.fileWriter?.end();
  }
}

/*
  ============================================================================
  MAIN
  ============================================================================
*/

async function compile(src: BunFile, dest: BunFile) {
  const parser = await Parser.create(src);
  const codeWriter = await CodeWriter.create(dest);
  while (await parser.hasMoreCommands()) {
    await parser.advance();
  
    const commandType = parser.commandType();
    if (commandType === "C_ARITHMETIC") {
      const arg1 = parser.arg1();
      if (arg1 && isArithmeticCommand(arg1)) {
        codeWriter.writeArithmetic(arg1);
      }
    } else if (commandType === "C_PUSH" || commandType === "C_POP") {
      const arg1 = parser.arg1();
      const arg2 = parser.arg2();
      if (arg1 && isMemorySegment(arg1) && typeof arg2 !== 'undefined') {
        codeWriter.writePushPop(commandType, arg1, arg2);
      }
    }
  }
}
const SimpleAddVm = Bun.file('./tests/SimpleAdd/SimpleAdd.vm');
const SimpleAddAsm = Bun.file("./output/SimpleAdd.asm");
const BasicTestVm = Bun.file('./tests/BasicTest/BasicTest.vm');
const BasicTestAsm = Bun.file("./output/BasicTest.asm");
const PointerTestVm = Bun.file('./tests/PointerTest/PointerTest.vm');
const PointerTestAsm = Bun.file("./output/PointerTest.asm");
const StackTestVm = Bun.file('./tests/StackTest/StackTest.vm');
const StackTestAsm = Bun.file("./output/StackTest.asm");
const StaticTestVm = Bun.file('./tests/StaticTest/StaticTest.vm');
const StaticTestAsm = Bun.file("./output/StaticTest.asm");

await compile(SimpleAddVm, SimpleAddAsm);
await compile(BasicTestVm, BasicTestAsm);
await compile(PointerTestVm, PointerTestAsm);
await compile(StackTestVm, StackTestAsm);
await compile(StaticTestVm, StaticTestAsm);
console.log("Finished translating all VM files in tests folder");