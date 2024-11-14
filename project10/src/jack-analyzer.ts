/**
 * Usage
 * 
 * jack-analyzer input
 * input:
 * - fileName.jack: name of a single file containing a Jack class, or
 * - folderName:    name of a folder containing one or more .jack files
 * output:
 * - If the input is a single file: fileName.xml
 * - If the input is a folder: One .xml file for every .jack file, stored in that folder
 *
 */
import fs from "fs";
import { basename, dirname, join, extname} from "path";
import { CompilationEngine } from "./compilation-engine";

const outputDir = "./test-output";

async function processSingleFile(filepath: string): Promise<string> {
  const srcFileName = basename(filepath, ".jack");
  const outputDir = dirname(filepath);
  const outputFile = Bun.file(join(outputDir, `${srcFileName}_CG.xml`));
  // Clearing the contents of outputFile
  Bun.write(outputFile, "");
  const jackFile = Bun.file(filepath);
  const compiler = await CompilationEngine.create(jackFile, outputFile);
  await compiler.compileClass();
  return outputFile.name ?? "";
}

async function processDirectory(dirpath: string): Promise<string[]> {
  const files = fs.readdirSync(dirpath);
  const jackFiles = files.filter(file => extname(file) === ".jack");
  if (jackFiles.length === 0) {
    throw new Error(`No .jack files found in ${dirpath}`);
  }
  const outputFilepaths = [];
  for (const jackFilepath of jackFiles) {
    const outputFilepath = await processSingleFile(join(dirpath, jackFilepath));
    outputFilepaths.push(outputFilepath);
  }
  return outputFilepaths;
}

/*
  -----------------------------------------------------------------------------
  MAIN EXECUTION
  -----------------------------------------------------------------------------
*/

const inputArg = process.argv[2];
try {
  const stats = fs.statSync(inputArg);
  let outputFilepaths;
  if (stats.isFile()) {
    console.log(`${inputArg} is a file.`);
    const outputFilepath = await processSingleFile(inputArg);
    outputFilepaths = [outputFilepath];
  } else if (stats.isDirectory()) {
    console.log(`${inputArg} is a directory.`);
    outputFilepaths = await processDirectory(inputArg);
  } else {
    console.log(`${inputArg} is neither a file nor a directory.`);
  }
  if (Array.isArray(outputFilepaths)) {
    console.log("Finished compilation. Files generated:");
    outputFilepaths.forEach((filepath) => console.log(`  - ${filepath}`));
  }
} catch (error) {
  console.error('Error', error);
}
