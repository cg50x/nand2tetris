import type { BunFile, FileSink } from "bun";
import { write } from "bun";
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

  public async writeArithmetic(command: ArithmeticCommand) {
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
    await this.writeToFile(translation);
  }

  public async writePushPop(
    command: "C_PUSH" | "C_POP",
    segment: MemorySegment,
    index: number
  ) {
    // Build the context
    let context: WriterContext = {
      vmFileName: this.currentFileName,
      uniqueIdSuffix: ''
    };
    const translation = writePushPop(command, segment, index, context);
    await this.writeToFile(translation);
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

  protected codeLinesWritten = 0;
  protected shouldPrintLineNumbers = true;
  protected async writeToFile(translation: string | undefined) {
    if (translation) {
      let processedTranslation = translation;
      if (this.shouldPrintLineNumbers) {
        processedTranslation = translation.split('\n').map((line) => {
          // Line is actual code and not just a comment or empty line
          if (line.trim().length > 0 && !line.startsWith("(") && !line.startsWith("//")) {
            return `${line}\t\t\t\t\t\t\t\t// line ${this.codeLinesWritten++}`;
          } else {
            return line;
          }
        }).join('\n');
      }
      this.fileWriter?.write(processedTranslation);
    }
  }
}
