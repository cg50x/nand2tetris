#!/bin/sh

# Single file tests
# bun run src/index.ts ./tests/BasicLoop/BasicLoop.vm
# bun run src/index.ts ./tests/SimpleFunction/SimpleFunction.vm
# bun run src/index.ts ./tests/FibonacciSeries/FibonacciSeries.vm

# Directory tests
# bun run src/index.ts ./tests/FibonacciElement
bun run src/index.ts ./tests/StaticsTest
