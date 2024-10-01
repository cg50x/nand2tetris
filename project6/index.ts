/**
 * Hack Assembler
 * 
 * Given an ASM file, outputs the binary code of the instructions to STDOUT.
 * 
 * TODO
 * - Consider using ReadableStream to handle large files
 * - Try processing the file in a single pass
 */
import {
  mapJumpExpressionToBitstring,
  mapCompExpressionToBitstring,
  mapDestExpressionToBitstring,
  predefinedSymbols,
  labelRegex,
  cInstructionRegex,
} from './constants.ts';
const [inputFile] = Bun.argv.slice(2);
const file = Bun.file(inputFile);
const contents = await file.text();
const lines = contents.split('\n');

// Cleaning the instructions by removing comments, empty lines and whitespace
let cleanedInstructions = lines
  .map((line) => line.replace(/\/\/.*/, ''))
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

// Building the symbol table with predefined symbols
const symbolTable = new Map<string, number>(Object.entries(predefinedSymbols));

// Adding labels to the symbol table
let instructionLineNumber = -1; // Start at -1 because the first instruction is at line 0
cleanedInstructions.forEach((line) => {
  const match = line.match(labelRegex);
  if (match?.groups) {
    // Label points to the instruction after the label
    symbolTable.set(match.groups.labelName, instructionLineNumber + 1);
  } else {
    // This is not a label, so increment the instruction line number
    instructionLineNumber += 1;
  }
});

// Removing labels from cleanedInstructions
cleanedInstructions = cleanedInstructions.filter((line) => !line.match(labelRegex));

// Adding variables to the symbol tables
let nextAvailableVariableAddress = 16;
cleanedInstructions.forEach((line) => {
  if (line.startsWith('@') && !line.match(/^@\d+$/)) {
    const variableName = line.substring(1);
    if (!symbolTable.has(variableName)) {
      symbolTable.set(variableName, nextAvailableVariableAddress++);
    }
  }
});

const processedInstructions = cleanedInstructions.map((line) => {
  if (line.startsWith('@')) {
    // Handling a-instructions
    const addressOrSymbol = line.substring(1);
    let address = symbolTable.has(addressOrSymbol) ? symbolTable.get(addressOrSymbol) : parseInt(addressOrSymbol);
    if (typeof address !== 'number' || isNaN(address)) {
      throw new Error(`Invalid address or symbol: ${addressOrSymbol}`);
    }
    const addressBitstring = address.toString(2).padStart(15, '0');
    return `0${addressBitstring}`;
  } else {
    // Handling c-instructions
    const match = line.match(cInstructionRegex);
    if (!match?.groups) {
      throw new Error(`Could not parse c-instruction: ${line}`)
    }
    const { dest, comp, jump } = match.groups;
    const jumpBitstring = mapJumpExpressionToBitstring[jump] ?? '000'; // Default to '000' if undefined
    const compBitstring = mapCompExpressionToBitstring[comp] ?? '0000000';
    const destBitstring = mapDestExpressionToBitstring[dest] ?? '000';
    const bitstring = `111${compBitstring}${destBitstring}${jumpBitstring}`;
    return bitstring;
  }
  // We should never reach this if the ASM code is valid
  return line;
});

const resultingLines = processedInstructions;
const processed = resultingLines.join('\n');
console.log(processed);
