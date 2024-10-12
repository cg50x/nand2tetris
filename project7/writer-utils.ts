/*
  =============================================================================
  PUSH POP WRITERS
  =============================================================================
*/

type PushPopArgs = {
  /** memory segment index */
  i: number
};

export const writePushConstant = ({i}: PushPopArgs) =>
`//// push constant ${i}
// RAM[SP] = ${i}
@${i}
D=A
@SP
A=M
M=D
// SP++
@SP
M=M+1
`;

const pushSegment = (segment: 'LCL'|'ARG'|'THIS'|'THAT', i: number) =>
`// addr = ${segment} + ${i}
@${i}
D=A
@${segment}
A=D+M
D=M
// RAM[SP] = RAM[addr]
@SP
A=M
M=D
// SP++
@SP
M=M+1`;

const popSegment = (segment: 'LCL'|'ARG'|'THIS'|'THAT', i: number) =>
`// addr = ${segment} + ${i}
@${i}
D=A
@${segment}
D=D+M
@addr
M=D
// SP--
@SP
M=M-1
// RAM[addr] = RAM[SP]
A=M
D=M
@addr
A=M
M=D`;

// push local i
export const writePushLocal = ({i}: PushPopArgs) =>
`//// push local ${i}
${pushSegment("LCL", i)}
`;

// pop local i
export const writePopLocal = ({i}: PushPopArgs) =>
`//// pop local ${i}
${popSegment("LCL", i)}
`;

// push argument i
export const writePushArgument = ({i}: PushPopArgs) =>
`//// push argument ${i}
${pushSegment("ARG", i)}
`;

// pop argument i
export const writePopArgument = ({i}: {i: number}) =>
`//// pop argument ${i}
${popSegment("ARG", i)}
`;

// push this i
export const writePushThis = ({i}: PushPopArgs) =>
`//// push this ${i}
${pushSegment("THIS", i)}
`;

// pop this i
export const writePopThis = ({i}: PushPopArgs) =>
`//// pop this ${i}
${popSegment("THIS", i)}
`;

// push that i
export const writePushThat = ({i}: PushPopArgs) =>
`//// push that ${i}
${pushSegment("THAT", i)}
`;

// pop that i
export const writePopThat = ({i}: PushPopArgs) =>
`//// pop that ${i}
${popSegment("THAT", i)}
`;

// push static i
export const writePushStatic = ({i}: PushPopArgs) =>
`//// push static ${i}
// RAM[SP] = Foo.${i}
@Foo.${i}
D=M
@SP
A=M
M=D
// SP++
@SP
M=M+1
`
// pop static i
export const writePopStatic = ({i}: PushPopArgs) =>
`//// pop static ${i}
// SP--
@SP
AM=M-1
// Foo.${i} = RAM[SP]
D=M
@Foo.${i}
M=D
`;

const pushPointer = (thisOrThat: 'THIS' | 'THAT') =>
`// RAM[SP] = ${thisOrThat}
@${thisOrThat}
D=M
@SP
A=M
M=D
// SP++
@SP
M=M+1`;

const popPointer = (thisOrThat: 'THIS' | 'THAT') =>
`// SP--
@SP
M=M-1
// ${thisOrThat} = RAM[SP]
A=M
D=M
@${thisOrThat}
M=D`;

// push pointer 0
export const writePushPointer0 = () =>
`//// push pointer 0
${pushPointer('THIS')}
`;

// pop pointer 0
export const writePopPointer0 = () =>
`//// pop pointer 0
${popPointer('THIS')}
`;

// push pointer 1
export const writePushPointer1 = () =>
`//// push pointer 1
${pushPointer('THAT')}
`;

// pop pointer 1
export const writePopPointer1 = () =>
`//// pop pointer 1
${popPointer('THAT')}
`;

// push temp i
export const writePushTemp = ({i}: PushPopArgs) =>
`//// push temp ${i}
// RAM[SP] = 5 + ${i}
@${i}
D=A
@5
A=D+A
D=M
@SP
A=M
M=D
// SP++
@SP
M=M+1
`;

// pop temp i
export const writePopTemp = ({i}: PushPopArgs) =>
`//// pop temp ${i}
// addr = 5 + ${i}
@${i}
D=A
@5
D=D+A
@addr
M=D
// SP--
@SP
M=M-1
// RAM[addr] = RAM[SP]
A=M
D=M
@addr
A=M
M=D
`;

/*
  =============================================================================
  ARITHMETIC WRITERS
  =============================================================================
*/

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

export const writeAdd = () =>
`//// add
${popTwoOperands()}
// RAM[SP] = RAM[SP] + D
M=D+M
${incrementSP()}
`;

export const writeSub = () =>
`//// sub
${popTwoOperands()}
// RAM[SP] = RAM[SP] - D
M=M-D
${incrementSP()}
`;

export const writeNeg = () =>
`//// neg
${popOneOperand()}
// RAM[SP] = -RAM[SP]
M=-M
${incrementSP()}
`;

export const writeAnd = () =>
`//// and
${popTwoOperands()}
// RAM[SP] = D & RAM[SP]
M=D&M
${incrementSP()}
`;

export const writeOr = () =>
`//// or
${popTwoOperands()}
// RAM[SP] = D | RAM[SP]
M=D|M
${incrementSP()}
`;

export const writeNot = () =>
`//// not
${popOneOperand()}
// RAM[SP] = !RAM[SP]
M=!M
${incrementSP()}
`;

export const writeEq = ({ id }: { id: string }) =>
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

export const writeGt = ({ id }: { id: string }) =>
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

export const writeLt = ({ id }: { id: string }) =>
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
