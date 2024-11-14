#!/bin/sh

## Cleaning and Creating the test-output files
rm -rf test-output/
mkdir test-output

echo "Running Jack Tokenizer Tests"
echo "Testing ArrayTest"
echo "=================================================================================="
bun run src/jack-tokenizer-test.ts './test-programs/ArrayTest/Main.jack' 'test-output/ArrayTestTokens.xml'
diff './test-programs/ArrayTest/MainT.xml' 'test-output/ArrayTestTokens.xml'
echo "Finished"
echo ""
echo "Testing ExpressionLessSquare"
echo "=================================================================================="
bun run src/jack-tokenizer-test.ts './test-programs/ExpressionLessSquare/Main.jack' 'test-output/ExpressionLessSquareTokens.xml'
diff './test-programs/ExpressionLessSquare/MainT.xml' 'test-output/ExpressionLessSquareTokens.xml'
echo "Finished"
echo ""
echo "Testing Square"
echo "=================================================================================="
bun run src/jack-tokenizer-test.ts './test-programs/Square/Main.jack' 'test-output/SquareTokens.xml'
diff './test-programs/Square/MainT.xml' 'test-output/SquareTokens.xml'
echo "Finished"
