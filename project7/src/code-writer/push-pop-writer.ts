/*
  =============================================================================
  PUSH POP WRITERS
  =============================================================================
*/

import type { MemorySegment } from "../parser/memory-segment";

type PushPopArgs = {
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
const writePopArgument = ({i}: {i: number}) =>
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
const writePushStatic = ({i}: PushPopArgs) =>
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
const writePopStatic = ({i}: PushPopArgs) =>
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

const writePush = (segment: MemorySegment, index: number) => {
  let translation;
  if (segment === "argument") {
    translation = writePushArgument({ i: index });
  } else if (segment === "constant") {
    translation = writePushConstant({ i: index });
  } else if (segment === "local") {
    translation = writePushLocal({ i: index });
  } else if (segment === "pointer" && index === 0) {
    translation = writePushPointer0();
  } else if (segment === "pointer" && index === 1) {
    translation = writePushPointer1();
  } else if (segment === "static") {
    translation = writePushStatic({ i: index });
  } else if (segment === "temp") {
    translation = writePushTemp({ i: index });
  } else if (segment === "that") {
    translation = writePushThat({ i: index });
  } else if (segment === "this") {
    translation = writePushThis({ i: index });
  }
  return translation;
};

const writePop = (segment: MemorySegment, index: number) => {
  let translation;
  if (segment === "argument") {
    translation =  writePopArgument({ i: index });
  } else if (segment === "local") {
    translation = writePopLocal({ i: index });
  } else if (segment === "pointer" && index === 0) {
    translation = writePopPointer0();
  } else if (segment === "pointer" && index === 1) { 
      translation = writePopPointer1();
  } else if (segment === "static") {
    translation = writePopStatic({ i: index });
  } else if (segment === "temp") {
    translation = writePopTemp({ i: index });
  } else if (segment === "that") {
    translation = writePopThat({ i: index });
  } else if (segment === "this") {
    translation = writePopThis({ i: index });
  }
  return translation;
};

export const writePushPop = (
  command: "C_PUSH" | "C_POP",
  segment: MemorySegment,
  index: number
): string | undefined => {
  let translation;
  if (command === "C_POP") {
    translation = writePop(segment, index);
  } else if (command === "C_PUSH") {
    translation = writePush(segment, index);
  }
  return translation;
}
