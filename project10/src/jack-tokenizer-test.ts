/**
 * This script uses the JackTokenizer and
 * produces and XML file containing the tokens.
 */
import { JackTokenizer, TokenType } from "./jack-tokenizer";
import { escapeXmlEntities } from "./xml-utils";

const inputFilePath = process.argv[2];
const outputFilePath = process.argv[3];

const outputFile = Bun.file(outputFilePath);
const outputFileWriter = outputFile.writer();

const inputFile = Bun.file(inputFilePath);
const tokenizer = await JackTokenizer.create(inputFile);

// Start writing the output file
outputFileWriter.write('<tokens>');
outputFileWriter.write('\r\n');

// Loading the first token
await tokenizer.advance();

while (tokenizer.hasMoreTokens()) {
  const tokenType = tokenizer.tokenType();
  outputFileWriter.write(`<${tokenType}>`);
  let tokenText = "";
  switch (tokenType) {
    case TokenType.Identifier:
      tokenText = tokenizer.identifier() ?? "";
      break;
    case TokenType.IntConst:
      tokenText = `${tokenizer.intVal()}` ?? "";
      break;
    case TokenType.Keyword:
      tokenText = tokenizer.keyWord() ?? "";
      break;
    case TokenType.StringConst:
      tokenText = tokenizer.stringVal() ?? "";
      break;
    case TokenType.Symbol:
      tokenText = tokenizer.symbol() ?? "";
      break;
  }

  outputFileWriter.write(` ${escapeXmlEntities(tokenText)} `);
  outputFileWriter.write(`</${tokenType}>`);
  outputFileWriter.write('\r\n');
  await tokenizer.advance();
}

outputFileWriter.write('</tokens>');
outputFileWriter.write('\r\n');
outputFileWriter.end();
