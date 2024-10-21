/*
  =============================================================================
  PUSH POP WRITERS
  =============================================================================
*/

import type { MemorySegment } from "../parser/memory-segment";
import type { WriterContext } from "./writer-context";

type PushPopArgs = WriterContext & {
  /** memory segment index */
  i: number
};

const writePushConstant = ({i}: PushPopArgs) =>
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
const writePushLocal = ({i}: PushPopArgs) =>
`//// push local ${i}
${pushSegment("LCL", i)}
`;

// pop local i
const writePopLocal = ({i}: PushPopArgs) =>
`//// pop local ${i}
${popSegment("LCL", i)}
`;

// push argument i
const writePushArgument = ({i}: PushPopArgs) =>
`//// push argument ${i}
${pushSegment("ARG", i)}
`;

// pop argument i
const writePopArgument = ({i}: PushPopArgs) =>
`//// pop argument ${i}
${popSegment("ARG", i)}
`;

// push this i
const writePushThis = ({i}: PushPopArgs) =>
`//// push this ${i}
${pushSegment("THIS", i)}
`;

// pop this i
const writePopThis = ({i}: PushPopArgs) =>
`//// pop this ${i}
${popSegment("THIS", i)}
`;

// push that i
const writePushThat = ({i}: PushPopArgs) =>
`//// push that ${i}
${pushSegment("THAT", i)}
`;

// pop that i
const writePopThat = ({i}: PushPopArgs) =>
`//// pop that ${i}
${popSegment("THAT", i)}
`;

// push static i
const writePushStatic = ({i, vmFileName}: PushPopArgs) =>
`//// push static ${i}
// RAM[SP] = ${vmFileName}.${i}
@${vmFileName}.${i}
D=M
@SP
A=M
M=D
// SP++
@SP
M=M+1
`
// pop static i
const writePopStatic = ({i, vmFileName}: PushPopArgs) =>
`//// pop static ${i}
// SP--
@SP
AM=M-1
// ${vmFileName}.${i} = RAM[SP]
D=M
@${vmFileName}.${i}
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
const writePushPointer0 = () =>
`//// push pointer 0
${pushPointer('THIS')}
`;

// pop pointer 0
const writePopPointer0 = () =>
`//// pop pointer 0
${popPointer('THIS')}
`;

// push pointer 1
const writePushPointer1 = () =>
`//// push pointer 1
${pushPointer('THAT')}
`;

// pop pointer 1
const writePopPointer1 = () =>
`//// pop pointer 1
${popPointer('THAT')}
`;

// push temp i
const writePushTemp = ({i}: PushPopArgs) =>
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
const writePopTemp = ({i}: PushPopArgs) =>
`//// pop temp ${i}
// R13 = 5 + ${i}
@${i}
D=A
@5
D=D+A
@R13
M=D
// SP--
@SP
M=M-1
// RAM[R13] = RAM[SP]
A=M
D=M
@R13
A=M
M=D
`;

const writePush = (segment: MemorySegment, index: number, context: WriterContext) => {
  const args = {
    ...context,
    i: index
  };
  let translation;
  if (segment === "argument") {
    translation = writePushArgument(args);
  } else if (segment === "constant") {
    translation = writePushConstant(args);
  } else if (segment === "local") {
    translation = writePushLocal(args);
  } else if (segment === "pointer" && index === 0) {
    translation = writePushPointer0();
  } else if (segment === "pointer" && index === 1) {
    translation = writePushPointer1();
  } else if (segment === "static") {
    translation = writePushStatic(args);
  } else if (segment === "temp") {
    translation = writePushTemp(args);
  } else if (segment === "that") {
    translation = writePushThat(args);
  } else if (segment === "this") {
    translation = writePushThis(args);
  }
  return translation;
};

const writePop = (segment: MemorySegment, index: number, context: WriterContext) => {
  const args = {
    ...context,
    i: index
  }
  let translation;
  if (segment === "argument") {
    translation =  writePopArgument(args);
  } else if (segment === "local") {
    translation = writePopLocal(args);
  } else if (segment === "pointer" && index === 0) {
    translation = writePopPointer0();
  } else if (segment === "pointer" && index === 1) { 
      translation = writePopPointer1();
  } else if (segment === "static") {
    translation = writePopStatic(args);
  } else if (segment === "temp") {
    translation = writePopTemp(args);
  } else if (segment === "that") {
    translation = writePopThat(args);
  } else if (segment === "this") {
    translation = writePopThis(args);
  }
  return translation;
};

export const writePushPop = (
  command: "C_PUSH" | "C_POP",
  segment: MemorySegment,
  index: number,
  context: WriterContext
): string | undefined => {
  let translation;
  if (command === "C_POP") {
    translation = writePop(segment, index, context);
  } else if (command === "C_PUSH") {
    translation = writePush(segment, index, context);
  }
  return translation;
}
