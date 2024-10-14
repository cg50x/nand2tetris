/*
  =============================================================================
  ARITHMETIC WRITERS
  =============================================================================
*/

import type { ArithmeticCommand } from "../parser/arithmetic-command";

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
  
  const writeEq = ({ id }: { id: string }) =>
  `//// eq JEQ
  ${popTwoOperands()}
  // D = RAM[SP] - D
  D=M-D
  // if M-D JEQ 0, goto EQ_${id}_TRUE
  @EQ_${id}_TRUE
  D;JEQ
  // RAM[SP] = 0
  @SP
  A=M
  M=0
  // goto EQ_${id}_END
  @EQ_${id}_END
  0;JMP
  (EQ_${id}_TRUE)
  // RAM[SP] = -1
  @SP
  A=M
  M=-1
  (EQ_${id}_END)
  ${incrementSP()}
  `;
  
  const writeGt = ({ id }: { id: string }) =>
  `//// gt JGT
  ${popTwoOperands()}
  // D = RAM[SP] - D
  D=M-D
  // if M-D JGT 0, goto GT_${id}_TRUE
  @GT_${id}_TRUE
  D;JGT
  // RAM[SP] = 0
  @SP
  A=M
  M=0
  // goto GT_${id}_END
  @GT_${id}_END
  0;JMP
  (GT_${id}_TRUE)
  // RAM[SP] = -1
  @SP
  A=M
  M=-1
  (GT_${id}_END)
  ${incrementSP()}
  `;
  
  const writeLt = ({ id }: { id: string }) =>
  `//// lt JLT
  ${popTwoOperands()}
  // D = RAM[SP] - D
  D=M-D
  // if M-D JLT 0, goto LT_${id}_TRUE
  @LT_${id}_TRUE
  D;JLT
  // RAM[SP] = 0
  @SP
  A=M
  M=0
  // goto LT_${id}_END
  @LT_${id}_END
  0;JMP
  (LT_${id}_TRUE)
  // RAM[SP] = -1
  @SP
  A=M
  M=-1
  (LT_${id}_END)
  ${incrementSP()}
  `;
  
export const writeArithmetic = (command: ArithmeticCommand, context: { id: string }): string | undefined => {
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
