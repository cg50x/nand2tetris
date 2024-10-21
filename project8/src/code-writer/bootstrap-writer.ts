import type { WriterContext } from "../../../project7/src/code-writer/writer-context";
import { writeCall } from "./function-writer";

export const writeBootstrap = (context: WriterContext) =>
`
//// SP = 256
@256
D=A
@SP
M=D
${writeCall("Sys.init", 0, context)}
`;
