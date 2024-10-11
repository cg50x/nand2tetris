import type { BunFile, FileSink } from "bun";

type CommandType =
| 'C_ARITHMETIC'
| 'C_PUSH'
| 'C_POP'
| 'C_LABEL'
| 'C_GOTO'
| 'C_IF'
| 'C_FUNCTION'
| 'C_RETURN'
| 'C_CALL';

const arithCommands = [
  'add', 'sub', 'neg', 'eq', 'gt', 'lt', 'and', 'or', 'not'
];

class Parser {
  private streamReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  private buffer: string = '';
  private textDecoder = new TextDecoder();
  private commandBuffer: string[] = [];
  private currentCommand: {
    commandType: CommandType;
    arg1: string;
    arg2: number;
  } | undefined;
  static async create(file: BunFile) {
    const newParser = new Parser();
    const newStream = await file.stream();
    newParser.streamReader = newStream.getReader();
    return newParser;
  }
  private constructor() {}

  public async hasMoreCommands(): Promise<boolean> {
    if (!this.streamReader) {
      throw new Error('Reader not initialized');
    }
    if (this.commandBuffer.length > 0) {
      return true;
    }
    let readerDone = false;
    const bufferHasNewline = () => {
      return !(this.buffer.includes('\r\n') || this.buffer.includes('\n'));
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
      return false
    }

    // Collecting the lines except for the last chunk
    let lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? '';
    // Ignore all whitespace and comments
    lines = lines
      .map((line) => line.replace(/\/\/.*/, ''))
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
      if (arithCommands.includes(nextCommand ?? '')) {
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
          arg2: parseInt(index)
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
          arg2: parseInt(index)
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

  static async create(file: BunFile) {
    const newCodeWriter = new CodeWriter();
    newCodeWriter.fileWriter = file.writer();
    return newCodeWriter;
  }
  private constructor() {}

  public writeArithmetic(command: string): void {
    // impl
    /*
    'add', = D+(AM)
    'sub', = D-AM
    'neg', = -D/-A
    'eq', = Use JEQ
    'gt', = Use JGT
    'lt', = Use JLT
    'and', = D&A (ends up either 0 or -1)
    'or', = D|A
    'not' = -D/-A

    Compute field of the C-instruction
    0
    1
    -1
    D
    A
    !D
    !A
    -D
    -A
    D+1
    A+1
    D-1
    A-1
    D+A
    D-A
    A-D
    D&A
    D|A
    */
  }

  public writePushPop(command: "C_PUSH" | "C_POP", segment: string, index: number): void {
    /*
      Eight memory segments:
      - local (@LCL)
      - argument (@ARG)
      - static (use @Foo.i)
      - constant (use @i)
      - this (@THIS)
      - that (@THAT)
      - pointer (pointer 0 = @THIS, pointer 1 = @THAT)
      - temp (Use @5 - @12 (0-7))
    */
    /*
      push constant i
      // RAM[SP] = i
      @i
      D=A
      @SP
      A=M
      M=D
      // SP++
      @SP
      M=M+1
      
      push local i
      // addr = segmentPointer + i
      @i
      D=A
      @LCL
      D=D+A
      // RAM[SP] = RAM[addr]
      @SP
      A=M
      M=D
      // SP++
      @SP
      M=M+1

      pop local i
      // addr = segmentPointer + i
      @i
      D=A
      @LCL
      D=A+D
      @addr
      M=D
      // SP--
      @SP
      M=M-1
      // RAM[addr] = RAM[SP]
      A=M
      D=M
      @addr
      M=D

      push argument i
      Same as push local i but use @ARG
      pop argument i
      Same as pop local i but use @ARG

      push this i
      Same as push local i but use @THIS
      pop this i
      Same as pop local i but use @THIS
      push that i
      Same as push local i but use @THAT
      pop that i
      Same as pop local i but use @THAT

      // push static i
      // RAM[SP] = Foo.i
      @Foo.i
      D=M
      @SP
      A=M
      M=D
      // SP++
      @SP
      M=M+1

      pop static i
      // SP--
      @SP
      AM=M-1
      // Foo.i = RAM[SP]
      D=M
      @Foo.i
      M=D

      push pointer 0
      // RAM[SP] = THIS
      @THIS
      D=M
      @SP
      A=M
      M=D
      // SP++
      @SP
      M=M+1

      pop pointer 0
      // SP--
      @SP
      M=M-1
      // THIS = RAM[SP]
      A=M
      D=M
      @THIS
      M=D

      push pointer 1
      Same as push pointer 0 but with THAT
      pop pointer 1
      Same as pop pointer 0 but with THAT

      push temp i
      Same as push local i but use @5
      pop temp i
      Same as pop local i but use @5
    */
  }
  public close() {
    this.fileWriter?.end();
  }
}

const file = Bun.file('./package.json');
const stream = file.stream();
const reader = stream.getReader();
const {value: chunk, done} = await reader.read();
const textDecoder = new TextDecoder();
const stringChunk = textDecoder.decode(chunk);
console.log(stringChunk);