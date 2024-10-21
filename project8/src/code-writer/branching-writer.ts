import type { WriterContext } from "../../../project7/src/code-writer/writer-context";

// TODO Check if 'current' function must be passed into context
export const writeLabel = (label: string, { vmFileName }: WriterContext) =>
`//// label ${label}
(${vmFileName}.${label})
`;

export const writeGoto = (label: string, { vmFileName }: WriterContext) =>
`//// goto ${label}
@${vmFileName}.${label}
0;JMP
`;

// if-goto symbol
// Since -1 is TRUE, add 1 to the top value on the stack,
// if it is equal to zero, then jump.
export const writeIf = (label: string, { vmFileName }: WriterContext) =>
`//// if-goto ${label}
// SP--
@SP
M=M-1
// D = RAM[SP]
@SP
A=M
D=M
// if D > 0; jump
@${vmFileName}.${label}
D;JNE
`;
