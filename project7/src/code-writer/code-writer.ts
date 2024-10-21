import type { BunFile, FileSink } from "bun";
import type { ArithmeticCommand } from "../parser/arithmetic-command";
import type { MemorySegment } from "../parser/memory-segment";
import { writeArithmetic } from "./arithmetic-writer";
import { writePushPop } from "./push-pop-writer";
import type { WriterContext } from "./writer-context";

export class CodeWriter {
  /** Creates an instance of CodeWriter and opens a write stream to the BunFile. */
  static async create(file: BunFile) {
    const newCodeWriter = new CodeWriter();
    newCodeWriter.fileWriter = file.writer();
    return newCodeWriter;
  }
  /** Used to write to the output file */
  protected fileWriter: FileSink | undefined;
  /** Used to create identifier for eq jump labels */
  protected nextEqId = 0;
  /** Used to create identifier for gt jump labels */
  protected nextGtId = 0;
  /** Used to create identifier for lt jump labels */
  protected nextLtId = 0;
  /** Used to keep track of the current .vm file being processed. */
  protected currentFileName: string = "Xxx"; // TODO Find a good default

  /** Cannot be instantiated with new. */
  protected constructor() {}

  /** Sets the current .vm file being processed */
  public setFileName(newFileName: string): void {
    if (this.currentFileName !== newFileName) {
      this.currentFileName = newFileName;
      // Reset all unique ID suffixes since this is a new file
      this.resetState();
    }
  }

  public writeArithmetic(command: ArithmeticCommand): void {
    // Build the context
    let context: WriterContext = {
      vmFileName: this.currentFileName,
      uniqueIdSuffix: ''
    };
    if (command === 'eq') {
      context.uniqueIdSuffix = `${this.nextEqId++}`;
    } else if (command === 'gt') {
      context.uniqueIdSuffix = `${this.nextGtId++}`;
    } else if (command === 'lt') {
      context.uniqueIdSuffix = `${this.nextLtId++}`;
    }
    // Pass the context to the writer
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
    // Build the context
    let context: WriterContext = {
      vmFileName: this.currentFileName,
      uniqueIdSuffix: ''
    };
    const translation = writePushPop(command, segment, index, context);
    if (translation) {
      this.fileWriter?.write(translation);
    }
  }
  public close() {
    this.fileWriter?.end();
  }

  /**
   * Builds the context object and initializes it.
   */
  protected buildContext(): WriterContext {
    return {
      vmFileName: this.currentFileName,
      uniqueIdSuffix: ''
    };
  }

  protected resetState() {
    this.resetJumpLabelIds();
  }

  protected resetJumpLabelIds() {
    // Reset all unique ID suffixes since this is a new file
    this.nextEqId = 0;
    this.nextGtId = 0;
    this.nextLtId = 0;
  }
}
