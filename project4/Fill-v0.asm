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

@SCREEN
D=A
@addr
M=D // addr = screen's base address

(KEYPRESS_WAIT_LOOP)
@KBD
D=M
@KEYPRESS_WAIT_LOOP
D;JEQ // while keyvalue is 0 loop

(BLACK_FILL_LOOP)
@addr
D=M
@LIMIT
D=M-D
@BLACK_FILL_END
D;JEQ // if addr == LIMIT goto BLACK_FILL_END

@addr
A=M
M=-1 // RAM[addr] = 1111111111111111

@addr
M=M+1 // addr = addr + 1 (go to next word)
@BLACK_FILL_LOOP
0;JMP
(BLACK_FILL_END)

(KEYRELEASE_WAIT_LOOP)
@KBD
D=M
@KEYRELEASE_WAIT_LOOP
D;JGT // while keyvalue greater than 0 loop

@SCREEN
D=A
@addr
M=D // addr = screen's base address

(WHITE_FILL_LOOP)
@addr
D=M
@LIMIT
D=M-D
@WHITE_FILL_END
D;JEQ // if addr = LIMIT, goto WHITE_FILL_END

@addr
A=M
M=0 // RAM[addr] = 0

@addr
M=M+1 // addr = addr + 1
@WHITE_FILL_LOOP
0;JMP
(WHITE_FILL_END)

@OUTER_LOOP
0;JMP // program's end; infinite loop go back to the top

