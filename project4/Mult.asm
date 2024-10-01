// Mult.asm
// R2 = R0*R1

// get the value at R0
// set R2 to R0's value
// Get the value of R1
// Multiply R2=R0*R1
// DONE

@R1
D=M
@i
M=D
// @i = @R1
@R2
M=0
// R2 = 0
(LOOP)
@i
D=M
@END
D;JEQ
// while i != 0
@R0
D=M
@R2
M=D+M
//   R2 = R2 + @R0
@i
M=M-1
// i = i - 1
@LOOP
0;JMP
// END LOOP
(END)
@END
0;JMP

