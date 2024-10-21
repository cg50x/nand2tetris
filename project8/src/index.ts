import { Parser } from "../../project7/src/parser/parser";
import { CodeWriterProject8 } from "./code-writer/code-writer";
import { basename, extname } from "path";
import { isArithmeticCommand } from "../../project7/src/parser/arithmetic-command";
import { isMemorySegment } from "../../project7/src/parser/memory-segment";
import fs from "fs";

/*
  ============================================================================
  MAIN
  ============================================================================
*/

async function translateSingleFile(parser: Parser, codeWriter: CodeWriterProject8) {
  while (await parser.hasMoreCommands()) {
    await parser.advance();
 
    const commandType = parser.commandType();
    if (commandType === "C_ARITHMETIC") {
      const arg1 = parser.arg1();
      if (arg1 && isArithmeticCommand(arg1)) {
        await codeWriter.writeArithmetic(arg1);
      }
    } else if (commandType === "C_PUSH" || commandType === "C_POP") {
      const arg1 = parser.arg1();
      const arg2 = parser.arg2();
      if (arg1 && isMemorySegment(arg1) && typeof arg2 !== 'undefined') {
        await codeWriter.writePushPop(commandType, arg1, arg2);
      }
    } else if (commandType === 'C_LABEL') {
      const arg1 = parser.arg1();
      if (arg1) {
        await codeWriter.writeLabel(arg1);
      }
    } else if (commandType === 'C_GOTO') {
      const arg1 = parser.arg1();
      if (typeof arg1 !== "undefined") {
        await codeWriter.writeGoto(arg1);
      }
    } else if (commandType === 'C_IF') {
      const arg1 = parser.arg1();
      if (arg1) {
        await codeWriter.writeIf(arg1);
      }
    } else if (commandType === 'C_CALL') {
      const arg1 = parser.arg1();
      const arg2 = parser.arg2();
      if (arg1 && typeof arg2 === "number" && !Number.isNaN(arg2)) {
        await codeWriter.writeCall(arg1, arg2);
      }
    } else if (commandType === 'C_FUNCTION') {
      const arg1 = parser.arg1();
      const arg2 = parser.arg2();
      if (arg1 && typeof arg2 === "number" && !Number.isNaN(arg2)) {
        await codeWriter.writeFunction(arg1, arg2);
      }
    } else if (commandType === 'C_RETURN') {
      await codeWriter.writeReturn();
    }
  }
}

async function processSingleFile(filepath: string): Promise<string> {
  // Determining output asm file
  const srcFileName = basename(filepath ?? "Xxx", ".vm");
  const outputFile = Bun.file(`${outputDir}/${srcFileName}.asm`);
  // Initializing code writer for the output file
  const codeWriter = await CodeWriterProject8.create(outputFile);
  // Initializing parser for source VM file
  const vmFile = Bun.file(filepath);
  const parser = await Parser.create(vmFile);
  // Notifying the code writer of the name of the file being parsed
  codeWriter.setFileName(srcFileName);
  // Translating single file .vm to .asm
  console.write("Translating vm file...");
  await translateSingleFile(parser, codeWriter);
  console.log("DONE");
  // Closing the code writer since the process is done
  codeWriter.close();
  return outputFile.name ?? "";
}

async function processDirectory(dirpath: string): Promise<string> {
  const files = fs.readdirSync(dirpath);
  const vmFiles = files.filter(file => extname(file) === ".vm");
  if (vmFiles.length === 0) {
    throw new Error(`No .vm files found in ${dirpath}`);
  }
  // Determining output asm file
  const outputFileName = basename(dirpath ?? "Xxx");
  const outputFile = Bun.file(`${outputDir}/${outputFileName}.asm`);
  // Initializing code writer for the output file
  const codeWriter = await CodeWriterProject8.create(outputFile);
  // Writing the bootstrap code first
  await codeWriter.writeBootstrap();
  console.log("Translating vm files...");
  const errors = [];
  for (const file of vmFiles) {
    const filepath = `${dirpath}/${file}`;
    console.write(`  ${filepath}...`);
    try {
      const vmFile = Bun.file(filepath);
      const parser = await Parser.create(vmFile);
      const srcFileName = basename(vmFile.name ?? "", ".vm");
      codeWriter.setFileName(srcFileName);
      await translateSingleFile(parser, codeWriter);
      console.log("DONE");
    } catch (error) {
      errors.push(error);
      console.log("ERROR");
    }
  }
  if (errors.length > 0) {
    console.error("Errors occurred:");
    for (const error of errors) {
      console.error(error);
    }
  }
  codeWriter.close();
  return outputFile.name ?? "";
}


// TODO Take from CLI arg
const outputDir = './output';

const firstArg = process.argv[2];
try {
  const stats = fs.statSync(firstArg);
  if (stats.isFile()) {
    console.log(`${firstArg} is a file.`);
    const outputFileName = await processSingleFile(firstArg);
    console.log(`Successfully translated!`);
    console.log(`Output file: ${outputFileName}`);
  } else if (stats.isDirectory()) {
    console.log(`${firstArg} is a directory.`);
    const outputFileName = await processDirectory(firstArg);
    console.log('Successfully translated!');
    console.log(`Output file: ${outputFileName}`);
  } else {
    console.log(`${firstArg} is neither a file nor a directory.`);
  }
} catch (error) {
  console.log(`Error reading ${firstArg}`, error);
}
