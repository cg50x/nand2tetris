import type { WriterContext } from "../../../project7/src/code-writer/writer-context";

export const writeCall = (functionName: string, nArgs: number, { uniqueIdSuffix }: WriterContext) => {
  const returnLabel = `${functionName}$ret.${uniqueIdSuffix}`;
  return `//// call ${functionName} ${nArgs}
// Pushing the return address
@${returnLabel}
D=A
@SP
A=M
M=D
@SP
M=M+1
// Saving the caller's segment pointers
// push LCL
@LCL
D=M
@SP
A=M
M=D
@SP
M=M+1
// push ARG
@ARG
D=M
@SP
A=M
M=D
@SP
M=M+1
// push THIS
@THIS
D=M
@SP
A=M
M=D
@SP
M=M+1
// push THAT
@THAT
D=M
@SP
A=M
M=D
@SP
M=M+1
// reposition ARG = SP - 5 - nArgs
@SP
D=M
@5
D=D-A
@${nArgs}
D=D-A
@ARG
M=D
// reposition LCL = SP
@SP
D=M
@LCL
M=D
// goto ${functionName}
@${functionName}
0;JMP
(${returnLabel})
`;
}

export const writeFunction = (functionName: string, nVars: number, context: WriterContext) => {
  const localVarsLabel = `${functionName}.localVars`;
  const localVarsEndLabel = `${functionName}.localVarsEnd`;
  return `//// function ${functionName} ${nVars}
(${functionName})
// Initializing local segment
@${nVars}
D=A
(${localVarsLabel})
@${localVarsEndLabel}
D;JEQ
// Push 0
@SP
A=M
M=0
@SP
M=M+1
D=D-1
@${localVarsLabel}
0;JMP
(${localVarsEndLabel})
`;
}

export const writeReturn = () =>
`//// return
// Save the end frame location, which is LCL, R13 = LCL
@LCL
D=M
@R13
M=D
// Save the retAddr, R14 = *(endFrame - 5)
@5
A=D-A
D=M
@R14
M=D
// Put return value in ARG location, *ARG = RAM[SP]
@SP
A=M-1
D=M
@ARG
A=M
M=D
// Reposition SP to ARG + 1
@ARG
D=M+1
@SP
M=D
// Reposition THAT, THAT = *(endFrame-1)
@R13
A=M-1
D=M
@THAT
M=D
// Reposition THIS, THIS = *(endFrame-2)
@R13
D=M
@2
A=D-A
D=M
@THIS
M=D
// Reposition ARG, ARG = *(endFrame-3)
@R13
D=M
@3
A=D-A
D=M
@ARG
M=D
// Reposition LCL, LCL = *(endFrame-4)
@R13
D=M
@4
A=D-A
D=M
@LCL
M=D
// Jump to the return address (R13)
@R14
A=M
0;JMP
`;