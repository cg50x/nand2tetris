import type { BunFile, FileSink } from "bun";

export type Segment =
  | "constant"
  | "argument"
  | "local"
  | "static"
  | "this"
  | "that"
  | "pointer"
  | "temp";

export type Command =
  | "add"
  | "sub"
  | "neg"
  | "eq"
  | "gt"
  | "lt"
  | "and"
  | "or"
  | "not";

/**
 * VMWriter
 *
 * Used by the compilation engine to write to the vm file.
 */

export class VMWriter {
  private outputFileWriter: FileSink;
  
  constructor(outputFile: BunFile) {
    this.outputFileWriter = outputFile.writer();
  }

  /**
   * Writes a VM push command
   * @param segment
   * @param index
   */
  writePush(segment: Segment, index: number) {
    this.writeLine(`push ${segment} ${index}\n`);
  }

  /**
   * Writes a VM pop command
   * @param segment
   * @param index
   */
  writePop(segment: Omit<Segment, "constant">, index: number) {
    this.writeLine(`pop ${segment} ${index}`);
  }

  /**
   * Writes a VM arithmetic-logical command.
   * @param data
   */
  writeArithmetic(command: Command) {
    this.writeLine(command);
  }

  /**
   * Writes a VM label command.
   * @param label
   */
  writeLabel(label: string) {
    this.writeLine(`label ${label}`);
  }

  /**
   * Writes a VM goto command.
   * @param label
   */
  writeGoto(label: string) {
    this.writeLine(`goto ${label}`);
  }

  /**
   * Writes a VM if command.
   * @param label
   */
  writeIf(label: string) {
    this.writeLine(`if-goto ${label}`);
  }

  /**
   * Writes a VM call command.
   * @param name 
   * @param nArgs 
   */
  writeCall(name: string, nArgs: number) {
    this.writeLine(`call ${name} ${nArgs}`);
  }

  /**
   * Writes a VM function command.
   * @param name 
   * @param nArgs 
   */
  writeFunction(name: string, nArgs: number) {
    this.writeLine(`function ${name} ${nArgs}`);
  }

  /**
   * Writes a VM return command.
   */
  writeReturn() {
    this.writeLine("return");
  }

  /**
   * Writes data to the file.
   * @param data 
   */
  private writeLine(data: string) {
    this.outputFileWriter.write(`${data}\n`);
  }
}
