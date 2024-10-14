import type { BunFile, FileSink } from "bun";
import type { ArithmeticCommand } from "../parser/arithmetic-command";
import type { MemorySegment } from "../parser/memory-segment";
import { writeArithmetic } from "./arithmetic-writer";
import { writePushPop } from "./push-pop-writer";

export class CodeWriter {
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
    let context = { id: '' };
    if (command === 'eq') {
      context.id = `${this.nextEqId++}`;
    } else if (command === 'gt') {
      context.id = `${this.nextGtId++}`;
    } else if (command === 'lt') {
      context.id = `${this.nextLtId++}`;
    }
    const translation = writeArithmetic(command, context);
    if (translation) {
      this.fileWriter?.write(translation);
    }
  }

  public writePushPop(
    command: "C_PUSH" | "C_POP",
    segment: MemorySegment,
    index: number
  ): void {
    const translation = writePushPop(command, segment, index);
    if (translation) {
      this.fileWriter?.write(translation);
    }
  }
  public close() {
    this.fileWriter?.end();
  }
}
