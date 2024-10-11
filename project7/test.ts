/*
  push constant i
  // RAM[SP] = i
  @i
  D=A
  @SP
  A=M
  M=D
  // SP++
  @SP
  M=M+1
*/
const pushConstant = (i: number) =>
`// push constant ${i}
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

/*
  Handles
  - local i
  - argument i
  - this i
  - that i
  - temp i

  push local i
  // addr = segmentPointer + i
  @i
  D=A
  @LCL
  D=D+A
  // RAM[SP] = RAM[addr]
  @SP
  A=M
  M=D
  // SP++
  @SP
  M=M+1
*/
const pushSegment = (segment: 'LCL'|'ARG'|'THIS'|'THAT', i: number) =>
`// addr = ${segment} + ${i}
@${i}
D=A
@${segment}
D=D+M
// RAM[SP] = RAM[addr]
@SP
A=M
M=D
// SP++
@SP
M=M+1`;

/*
  Handles
  - local i
  - argument i
  - this i
  - that i
  - temp i

  pop local i
  // addr = segmentPointer + i
  @i
  D=A
  @LCL
  D=A+D
  @addr
  M=D
  // SP--
  @SP
  M=M-1
  // RAM[addr] = RAM[SP]
  A=M
  D=M
  @addr
  M=D
*/
const popSegment = (segment: 'LCL'|'ARG'|'THIS'|'THAT', i: number) =>
`// addr = ${segment} + ${i}
@${i}
D=A
@${segment}
D=M+D
@addr
M=D
// SP--
@SP
M=M-1
// RAM[addr] = RAM[SP]
A=M
D=M
@addr
M=D`;

// push local i
const pushLocal = (i: number) =>
`// push local ${i}
${pushSegment("LCL", i)}
`;

// pop local i
const popLocal = (i: number) =>
`// pop local ${i}
${popSegment("LCL", i)}
`;

// push argument i
const pushArgument = (i: number) =>
`// push argument ${i}
${pushSegment("ARG", i)}
`;

// pop argument i
const popArgument = (i: number) =>
`// pop argument ${i}
${popSegment("ARG", i)}
`;

// push this i
const pushThis = (i: number) =>
`// push this ${i}
${pushSegment("THIS", i)}
`;

// pop this i
const popThis = (i: number) =>
`// pop this ${i}
${popSegment("THIS", i)}
`;

// push that i
const pushThat = (i: number) =>
`// push that ${i}
${pushSegment("THAT", i)}
`;

// pop that i
const popThat = (i: number) =>
`// pop that ${i}
${popSegment("THAT", i)}
`;

// push static i
const pushStatic = (i: number) =>
`// push static ${i}
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
const popStatic = (i: number) =>
`// pop static ${i}
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
const pushPointer0 = () =>
`// push pointer 0
${pushPointer('THIS')}
`;

// pop pointer 0
const popPointer0 = () =>
`// pop pointer 0
${popPointer('THIS')}
`;

// push pointer 1
const pushPointer1 = () =>
`// push pointer 1
${pushPointer('THAT')}
`;

// pop pointer 1
const popPointer1 = () =>
`// pop pointer 1
${popPointer('THAT')}
`;

// push temp i
const pushTemp = (i: number) =>
`// push temp ${i}
// RAM[SP] = 5 + ${i}
@${i}
D=A
@5
D=A+D
@SP
A=M
M=D
// SP++
@SP
M=M+1
`;

// pop temp i
const popTemp = (i: number) =>
`// pop temp ${i}
// addr = 5 + ${i}
@${i}
D=A
@5
D=A+D
@addr
M=D
// SP--
@SP
M=M-1
// RAM[addr] = RAM[SP]
A=M
D=M
@addr
M=D
`;

const commandToFunctionMap: Record<string, any> = {
  "push argument": pushArgument,
  "pop argument": popArgument,
  "push constant": pushConstant,
  "push local": pushLocal,
  "pop local": popLocal,
  "push pointer 0": pushPointer0,
  "pop pointer 0": popPointer0,
  "push pointer 1": pushPointer1,
  "pop pointer 1": popPointer1,
  "push temp": pushTemp,
  "pop temp": popTemp,
  "push that": pushThat,
  "pop that": popThat,
  "push this": pushThis,
  "pop this": popThis,
  "push static": pushStatic,
  "pop static": popStatic
};

// For a single command
// Break it into three tokens
// Check if the first two tokens resolve to a function in the commandToFunctionMap
// If not, check if all of the tokens resolve to a function in the map
// If still not, return undefined
// If the first two tokens resolved, call the function with the third token
// If all of the tokens resolved, call the function

const convertSingleCommand = (command: string): string => {
  const tokens = command.split(' ');
  // Assuming there are three tokens...
  // TODO Handle case where there are not three tokens
  
  // Check if first two tokens resolve to a function
  let writeAssembly = commandToFunctionMap[`${tokens[0]} ${tokens[1]}`];
  if (writeAssembly) {
    return writeAssembly(parseInt(tokens[2]));
  }
  // Check if the whole command resolves to a function
  writeAssembly = commandToFunctionMap[command];
  if (writeAssembly) {
    return writeAssembly();
  }
  // If none, just return empty string;
  return '';
};

const testPushPopOnly =
`
push constant 10
pop local 0
pop argument 2
pop this 6
pop that 5
pop temp 6
push local 0
push argument 2
push this 6
push that 5
push temp 6
`

const result = testPushPopOnly
  .split('\n')
  .map((s) => s.trim())
  .filter(s => !!s)
  .map((command) => convertSingleCommand(command))
  .join('');

console.log(result);
