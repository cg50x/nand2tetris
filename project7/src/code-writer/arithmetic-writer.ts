/*
  =============================================================================
  ARITHMETIC WRITERS
  =============================================================================
*/

import type { ArithmeticCommand } from "../parser/arithmetic-command";
import type { WriterContext } from "./writer-context";

type ArithmeticArgs = WriterContext;

/**
 * Writes code that pops two operands from the stack.
 * First operand is loaded into M.
 * Second operand is loaded into D.
 */
const popTwoOperands = () =>
`// SP--
@SP
AM=M-1
// D = RAM[SP]
D=M
// SP--
@SP
AM=M-1`;
  
/**
 * Writes code that pops one operand from the stack.
 * Operand is loaded into M.
 * @returns 
 */
const popOneOperand = () =>
`// SP--
@SP
AM=M-1`;

const incrementSP = () =>
`// SP++
@SP
M=M+1`;

const writeAdd = () =>
`//// add
${popTwoOperands()}
// RAM[SP] = RAM[SP] + D
M=D+M
${incrementSP()}
`;

const writeSub = () =>
`//// sub
${popTwoOperands()}
// RAM[SP] = RAM[SP] - D
M=M-D
${incrementSP()}
`;

const writeNeg = () =>
`//// neg
${popOneOperand()}
// RAM[SP] = -RAM[SP]
M=-M
${incrementSP()}
`;

const writeAnd = () =>
`//// and
${popTwoOperands()}
// RAM[SP] = D & RAM[SP]
M=D&M
${incrementSP()}
`;

const writeOr = () =>
`//// or
${popTwoOperands()}
// RAM[SP] = D | RAM[SP]
M=D|M
${incrementSP()}
`;

const writeNot = () =>
`//// not
${popOneOperand()}
// RAM[SP] = !RAM[SP]
M=!M
${incrementSP()}
`;

const writeEq = ({ vmFileName, uniqueIdSuffix }: ArithmeticArgs) =>
`//// eq JEQ
${popTwoOperands()}
// D = RAM[SP] - D
D=M-D
// if M-D JEQ 0, goto ${vmFileName}.EQ_TRUE_${uniqueIdSuffix}
@${vmFileName}.EQ_TRUE_${uniqueIdSuffix}
D;JEQ
// RAM[SP] = 0
@SP
A=M
M=0
// goto ${vmFileName}.EQ_END_${uniqueIdSuffix}
@${vmFileName}.EQ_END_${uniqueIdSuffix}
0;JMP
(${vmFileName}.EQ_TRUE_${uniqueIdSuffix}
// RAM[SP] = -1
@SP
A=M
M=-1
(${vmFileName}.EQ_END_${uniqueIdSuffix}
${incrementSP()}
`;

const writeGt = ({ vmFileName, uniqueIdSuffix }: ArithmeticArgs) =>
`//// gt JGT
${popTwoOperands()}
// D = RAM[SP] - D
D=M-D
// if M-D JGT 0, goto ${vmFileName}.GT_TRUE_${uniqueIdSuffix}
@${vmFileName}.GT_TRUE_${uniqueIdSuffix}
D;JGT
// RAM[SP] = 0
@SP
A=M
M=0
// goto ${vmFileName}.GT_END_${uniqueIdSuffix}
@${vmFileName}.GT_END_${uniqueIdSuffix}
0;JMP
(${vmFileName}.GT_TRUE_${uniqueIdSuffix}
// RAM[SP] = -1
@SP
A=M
M=-1
(${vmFileName}.GT_END_${uniqueIdSuffix}
${incrementSP()}
`;

const writeLt = ({ vmFileName, uniqueIdSuffix }: ArithmeticArgs) =>
`//// lt JLT
${popTwoOperands()}
// D = RAM[SP] - D
D=M-D
// if M-D JLT 0, goto ${vmFileName}.LT_TRUE_${uniqueIdSuffix}
@${vmFileName}.LT_TRUE_${uniqueIdSuffix}
D;JLT
// RAM[SP] = 0
@SP
A=M
M=0
// goto ${vmFileName}.LT_END_${uniqueIdSuffix}
@${vmFileName}.LT_END_${uniqueIdSuffix}
0;JMP
(${vmFileName}.LT_TRUE_${uniqueIdSuffix}
// RAM[SP] = -1
@SP
A=M
M=-1
(${vmFileName}.LT_END_${uniqueIdSuffix}
${incrementSP()}
`;
  
export const writeArithmetic = (command: ArithmeticCommand, context: ArithmeticArgs): string | undefined => {
  let translation;
  if (command === "add") {
    translation = writeAdd();
  } else if (command == "and") {
    translation = writeAnd();
  } else if (command == "eq") {
    translation = writeEq(context);
  } else if (command == "gt") {
    translation = writeGt(context);
  } else if (command == "lt") {
    translation = writeLt(context);
  } else if (command == "neg") {
    translation = writeNeg();
  } else if (command == "not") {
    translation = writeNot();
  } else if (command == "or") {
    translation = writeOr();
  } else if (command == "sub") {
    translation = writeSub();
  }
  return translation;
}
