// Program: Fill.asm
// Fills the screen with black on keypress

@8192
D=A
@SCREEN
D=D+A
@LIMIT
M=D // LIMIT = screen's base address + 8192

// while true (outer loop)
(OUTER_LOOP)

(KEYPRESS_WAIT_LOOP)
@KBD
D=M
@KEYPRESS_WAIT_LOOP
D;JEQ // while keyvalue is 0 loop

// Calling a procedure
// 0. Marking the return address with a label (PROC_FILL_SCREEN_WITH_BLACK)
// 1. Setting the argument with @PROC_ARG
// 2. Setting the return address with @PROC_RET_ADDR
// 3. Calling (Jumping to) the procedure
@PROC_ARG
M=-1 // Black
@PROC_FILL_SCREEN_WITH_BLACK
D=A
@PROC_RET_ADDR
M=D
@PROC_FILL_SCREEN_CALL
0;JMP
(PROC_FILL_SCREEN_WITH_BLACK) // Like calling PROC_FILL_SCREEN(-1) to fill screen with black

(KEYRELEASE_WAIT_LOOP)
@KBD
D=M
@KEYRELEASE_WAIT_LOOP
D;JGT // while keyvalue greater than 0 loop

@PROC_ARG
M=0 // White
@PROC_FILL_SCREEN_WITH_WHITE
D=A
@PROC_RET_ADDR
M=D
@PROC_FILL_SCREEN_CALL
0;JMP
(PROC_FILL_SCREEN_WITH_WHITE)

@OUTER_LOOP
0;JMP // program's end; infinite loop go back to the top

// PROCEDURES AREA

// These global variables facilitate procedure calls:
// PROC_RET_ADDR - procedure return address; all procedures must jmp to this address when finished
// PROC_ARG - procedure input argument; all procedures get at most one input argument
// *note* Calling procedures within a procedure is NOT supported. We would need a stack.

(PROC_FILL_SCREEN_CALL)
@SCREEN
D=A
@fill_screen_addr
M=D // fill_screen_addr = screen's base address

(FILL_SCREEN_LOOP)
@fill_screen_addr
D=M
@LIMIT
D=M-D
@FILL_SCREEN_END
D;JEQ // if fill_screen_addr == LIMIT goto FILL_SCREEN_END

@PROC_ARG
D=M
@fill_screen_addr
A=M
M=D // RAM[addr] = PROC_ARG

@fill_screen_addr
M=M+1 // addr = addr + 1 (go to next word)
@FILL_SCREEN_LOOP
0;JMP
(FILL_SCREEN_END)

@PROC_RET_ADDR
A=M
0;JMP // Return back to original call
