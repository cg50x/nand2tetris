#!/bin/sh

echo "Cleaning all test projects"
rm -f ./test-programs/**/*.vm
echo ""

echo "Compiling all test projects"
echo ""

echo "Compiling Seven"
echo "=================================================================================="
bun run src/jack-compiler.ts './test-programs/Seven'
echo ""

echo "Compiling ConvertToBin"
echo "=================================================================================="
bun run src/jack-compiler.ts './test-programs/ConvertToBin'
echo ""

echo "Compiling Square"
echo "=================================================================================="
bun run src/jack-compiler.ts './test-programs/Square'
echo ""

echo "Compiling Average"
echo "=================================================================================="
bun run src/jack-compiler.ts './test-programs/Average'
echo ""

echo "Compiling Pong"
echo "=================================================================================="
bun run src/jack-compiler.ts './test-programs/Pong'
echo ""

echo "Compiling ComplexArrays"
echo "=================================================================================="
bun run src/jack-compiler.ts './test-programs/ComplexArrays'
echo ""

# TODO Load these into the vm emulator
