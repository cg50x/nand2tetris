#!/bin/sh

echo "Running Jack Analyzer Tests"
echo "Testing ArrayTest"
echo "=================================================================================="
bun run src/jack-analyzer.ts './test-programs/ArrayTest'
diff './test-programs/ArrayTest/Main.xml' './test-programs/ArrayTest/Main_CG.xml'
echo "Finished"
echo ""
echo "Testing ExpressionLessSquare"
echo "=================================================================================="
bun run src/jack-analyzer.ts './test-programs/ExpressionLessSquare'
diff './test-programs/ExpressionLessSquare/Main.xml' './test-programs/ExpressionLessSquare/Main_CG.xml'
diff './test-programs/ExpressionLessSquare/Square.xml' './test-programs/ExpressionLessSquare/Square_CG.xml'
diff './test-programs/ExpressionLessSquare/SquareGame.xml' './test-programs/ExpressionLessSquare/SquareGame_CG.xml'
echo "Finished"
echo ""
echo "Testing Square"
echo "=================================================================================="
bun run src/jack-analyzer.ts './test-programs/Square'
diff './test-programs/Square/Main.xml' './test-programs/Square/Main_CG.xml'
diff './test-programs/Square/Square.xml' './test-programs/Square/Square_CG.xml'
diff './test-programs/Square/SquareGame.xml' './test-programs/Square/SquareGame_CG.xml'
echo "Finished"

echo "See diffs above for any errors."