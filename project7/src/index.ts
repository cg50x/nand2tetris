import type { BunFile } from "bun";
import { Parser } from "./parser/parser";
import { CodeWriter } from "./code-writer/code-writer";
import { isArithmeticCommand } from "./parser/arithmetic-command";
import { isMemorySegment } from "./parser/memory-segment";

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
const outputDir = './output';
const SimpleAddVm = Bun.file('./tests/SimpleAdd/SimpleAdd.vm');
const SimpleAddAsm = Bun.file(`${outputDir}/SimpleAdd.asm`);
const BasicTestVm = Bun.file('./tests/BasicTest/BasicTest.vm');
const BasicTestAsm = Bun.file(`${outputDir}/BasicTest.asm`);
const PointerTestVm = Bun.file('./tests/PointerTest/PointerTest.vm');
const PointerTestAsm = Bun.file(`${outputDir}/PointerTest.asm`);
const StackTestVm = Bun.file('./tests/StackTest/StackTest.vm');
const StackTestAsm = Bun.file(`${outputDir}/StackTest.asm`);
const StaticTestVm = Bun.file('./tests/StaticTest/StaticTest.vm');
const StaticTestAsm = Bun.file(`${outputDir}/StaticTest.asm`);

await compile(SimpleAddVm, SimpleAddAsm);
await compile(BasicTestVm, BasicTestAsm);
await compile(PointerTestVm, PointerTestAsm);
await compile(StackTestVm, StackTestAsm);
await compile(StaticTestVm, StaticTestAsm);
console.log("Finished translating all VM files in tests folder");