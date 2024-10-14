# project7

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run src/index.ts
```

This project was created using `bun init` in bun v1.1.29. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Implementation

See https://www.coursera.org/learn/nand2tetris2/lecture/qmJl3/unit-1-8-vm-translator-proposed-implementation

Three parts:

- Parser
- CodeWriter
- Main

Input: fileName.vm
Output: fileName.asm

### Parser

- Handles parsing of a single .vm file
- Reads a command, parses the command into its lexical components
- Ignores whitespace and comments

Methods

| Method Name     | Arguments | Returns                                                                          | Description                                                                                                                                                         |
| --------------- | --------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Constructor     | BunFile   | -                                                                                | Opens the file and gets ready to parse it                                                                                                                           |
| hasMoreCommands | -         | -                                                                                | Are there more commands in the input?                                                                                                                               |
| advance         | -         | -                                                                                | Reads the next command from the input and makes it the current command. Only called if hasMoreCommands() returns true. Initially, there's no current command.       |
| commandType     | -         | C_ARITHMETIC, C_PUSH, C_POP, C_LABEL, C_GOTO, C_IF, C_FUNCTION, C_RETURN, C_CALL | Returns a constant representing the type of the current command. C_ARITHMETIC for arithmetic and logical commands.                                                  |
| arg1            | -         | string                                                                           | Return the first arg of the current command (string). In the case of C_ARITHMETIC, returns the command itself. Should not be called if current command is C_RETURN. |
| arg2            | -         | int                                                                              | Returns the second arg of the current command (int). Should be called only if the current command is C_PUSH, C_POP, C_FUNCTION, or C_CALL.                          |

### CodeWriter

Generates assembly code from parsed VM command.

Methods

| Method Name     | Arguments                                                | Returns | Description                                                                                                         |
| --------------- | -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| Constructor     | BunFile                                                  | -       | Opens an output stream                                                                                              |
| writeArithmetic | command (string)                                         | -       | (e.g. add or sub) writes to the output file the assembly code that implements the given arithmetic/logical command. |
| writePushPop    | command (C_PUSH or C_POP), segment (string), index (int) | -       | Write the code for the given push pop command.                                                                      |
| close           | -                                                        | -       | Closes the output file                                                                                              |
