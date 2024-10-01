// Program: Fill.asm
// Fills the screen with black whenever key is down, white otherwise

// Constants
// LIMIT = screen's base address + 8192
@8192
D=A
@SCREEN
D=D+A
@LIMIT
M=D 

(MAIN_START)

// Waiting until key is pressed
(KEYPRESS_WAIT_LOOP)
@KBD
D=M
@KEYPRESS_WAIT_LOOP
D;JEQ

// Filling the screen with black
// How to call a procedure
// 0. Mark the return address with a label (PROC_FILL_SCREEN_WITH_BLACK)
// 1. Set the argument with @PROC_ARG
// 2. Set the return address with @PROC_RET_ADDR
// 3. Call (Jump to) the procedure
@PROC_ARG
M=-1 // -1 = Black
@PROC_FILL_SCREEN_WITH_BLACK
D=A
@PROC_RET_ADDR
M=D
@PROC_FILL_SCREEN_CALL
0;JMP // This is like calling PROC_FILL_SCREEN(-1)
(PROC_FILL_SCREEN_WITH_BLACK)

// Waiting until key is released
(KEYRELEASE_WAIT_LOOP)
@KBD
D=M
@KEYRELEASE_WAIT_LOOP
D;JGT

// Filling the screen white
@PROC_ARG
M=0 // 0 = White
@PROC_FILL_SCREEN_WITH_WHITE
D=A
@PROC_RET_ADDR
M=D
@PROC_FILL_SCREEN_CALL
0;JMP
(PROC_FILL_SCREEN_WITH_WHITE)

@MAIN_START
0;JMP // End of program; Looping back to the start

// PROCEDURES AREA

// These global variables facilitate procedure calls:
// PROC_RET_ADDR - procedure return address; all procedures must jmp to this address when finished
// PROC_ARG - procedure input argument; all procedures get at most one input argument
// *note* Calling procedures within a procedure is NOT supported. We would need a stack.

(PROC_FILL_SCREEN_CALL)
// fill_screen_addr = screen's base address
@SCREEN
D=A
@fill_screen_addr
M=D

// Begin looping through screen memory addresses
(FILL_SCREEN_LOOP_START)

// if fill_screen_addr == LIMIT, then break
@fill_screen_addr
D=M
@LIMIT
D=M-D
@FILL_SCREEN_LOOP_END
D;JEQ

// RAM[addr] = PROC_ARG
@PROC_ARG
D=M
@fill_screen_addr
A=M
M=D

// fill_screen_addr += 1
@fill_screen_addr
M=M+1
@FILL_SCREEN_LOOP_START
0;JMP
(FILL_SCREEN_LOOP_END)

// Returning back to the caller
@PROC_RET_ADDR
A=M
0;JMP
// End of PROC_FILL_SCREEN_CALL
