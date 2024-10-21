import type { BunFile } from "bun";
import { CodeWriter } from "../../../project7/src/code-writer/code-writer";
import { writeGoto, writeIf, writeLabel } from "./branching-writer";
import { writeCall, writeFunction, writeReturn } from "./function-writer";
import { writeBootstrap } from "./bootstrap-writer";

export class CodeWriterProject8 extends CodeWriter {
  /** Creates an instance of CodeWriter and opens a write stream to the BunFile. */
  static async create(file: BunFile) {
    const newCodeWriter = new CodeWriterProject8();
    newCodeWriter.fileWriter = file.writer();
    return newCodeWriter;
  }
  public writeLabel(label: string) {
    const context = this.buildContext();
    const translation = writeLabel(label, context);
    this.writeToFile(translation);
  }
  public writeGoto(label: string) {
    const context = this.buildContext();
    const translation = writeGoto(label, context);
    this.writeToFile(translation);
  }
  public writeIf(label: string) {
    const context = this.buildContext();
    const translation = writeIf(label, context);
    this.writeToFile(translation);
  }

  /**
   * Key is a string with the format `${vmFileName}.${functionName}`.
   * The value is the next available ID.
   */
  protected callSiteIds = new Map<string, number>();

  public writeFunction(functionName: string, nVars: number) {
    const context = this.buildContext();
    const translation = writeFunction(functionName, nVars, context);
    this.writeToFile(translation);
  }

  public writeCall(functionName: string, nArgs: number) {
    // Building the context
    const context = this.buildContext();
    // Calculating the call ID suffix for this function
    // Using only the function name as the key, assuming that function name
    // is already prefixed with the class or file name (e.g. Main.fibonacci)
    const callSiteIdKey = functionName;
    const callSiteId = this.callSiteIds.get(callSiteIdKey) ?? 0;
    this.callSiteIds.set(callSiteIdKey, callSiteId + 1);
    context.uniqueIdSuffix = `${callSiteId}`;
    // Translating
    const translation = writeCall(functionName, nArgs, context);
    this.writeToFile(translation);
  }

  public writeReturn() {
    // No context needed, just translate
    const translation = writeReturn();
    this.writeToFile(translation);
  }

  public writeBootstrap() {
    // Building the context
    const context = this.buildContext();
    // Sys.init is only expected to be called once so it is hardcoded to 0
    context.uniqueIdSuffix = "0";
    // Translating
    const translation = writeBootstrap(context);
    this.writeToFile(translation);
  }
}
