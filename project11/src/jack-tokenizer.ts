import type { BunFile } from "bun";

export enum TokenType {
  Keyword = "keyword",
  Symbol = "symbol",
  Identifier = "identifier",
  IntConst = "integerConstant",
  StringConst = "stringConstant"
}

type KeywordToken = {
  tokenType: TokenType.Keyword;
  keyWord: string;
};

type SymbolToken = {
  tokenType: TokenType.Symbol;
  symbol: string;
};

type IdentifierToken = {
  tokenType: TokenType.Identifier;
  identifier: string;
};

type IntConstToken = {
  tokenType: TokenType.IntConst;
  intVal: number;
};

type StringConstToken = {
  tokenType: TokenType.StringConst;
  stringVal: string;
};

type Token = KeywordToken | SymbolToken | IdentifierToken | IntConstToken | StringConstToken;

/**
 * JackTokenizer
 * 
 * This has the same methods as the Parser in previous projects, but
 * the methods work slightly differently here.
 * - hasMoreTokens does not read more data from the file. It only returns whether the reader is done reading.
 */
export class JackTokenizer {

  /** A stream reader that lets you read from the file */
  private streamReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  /** The current text loaded from the file. */
  private buffer: string = "";
  /** The position of the current character being read from the buffer. */
  private bufferPosition: number = 0;
  private textDecoder = new TextDecoder();
  /** Whether or not the reader is done reading from the file */
  private readerDone: boolean = false;
  /** The current token parsed from the input */
  private currentToken: Token | null = null;

  /**
   * The main way to create a JackTokenizer.
   * 
   * Opens the input .jack file/stream and gets ready to tokenize it.
   */
  static async create(file: BunFile) {
    const newTokenizer = new JackTokenizer();
    const newStream = await file.stream();
    newTokenizer.streamReader = newStream.getReader();
    return newTokenizer;
  }
  /**
   * Only create the JackTokenizer through the async create function.
   * @protected
   */
  protected constructor() {}

  /**
   * Returns whether ot not the file _could_ have more tokens.
   * advance() must be called at least once before using this method.
   * (See Project 10 slide 12)
   */
  hasMoreTokens(): boolean {
    return this.bufferPosition < this.buffer.length && !this.readerDone;
  }

  /**
   * Gets the next token from the input, and makes it the current token.
   * This method should be called once before calling hasMoreTokens. (See Project 10 slide 12)
   * Note: if advance fails to read a token, the current token is set to null.
   */
  public async advance(): Promise<void> {
    // If bufferPosition is greater than or equal to buffer size, fetch more data and reset
    if (this.bufferFinished()) {
      await this.loadNextChunkIntoBuffer();
    }

    // Ignore whitespace, single-line, and multiline comments
    while (this.hasMoreTokens()) {
      if (this.isWhitespace(this.currentChar())) {
        this.bufferPosition += 1;
      } else if (this.sliceAtOffset(0, 2) === "//") {
        await this.eatSingleLineComment();
      } else if (this.sliceAtOffset(0, 2) === "/*") {
        await this.eatMultiLineComment();
      } else {
        // Stopping when no whitespace or comments were found.
        break;
      }
    }

    const currentCharacter = this.currentChar();
    if (this.isJackSymbol(currentCharacter)) {
      this.currentToken = {
        tokenType: TokenType.Symbol,
        symbol: currentCharacter
      };
      this.bufferPosition += 1;
    } else if (this.isDigit(currentCharacter)) {
      this.currentToken = await this.eatIntConst();
    } else if (currentCharacter === "\"") {
      this.currentToken = await this.eatStringConst();
    } else if (this.isAlpha(currentCharacter) || this.isUnderscore(currentCharacter)) {
      this.currentToken = await this.eatKeywordOrIdentifier();
    } else {
      console.error(`Unable to parse '${currentCharacter}'.`);
      throw new Error("Unable to parse " + currentCharacter);
    }
  }

  /**
   * Returns the type of the current token, as a constant.
   * Returns:
   * - KEYWORD
   * - SYMBOL
   * - IDENTIFIER
   * - INT_CONST
   * - STRING_CONST
   */
  public tokenType() {
    return this.currentToken?.tokenType;
  }

  /**
   * Returns the keyword which is the current token, as a constant.
   * This method should be called only if tokenType is KEYWORD.
   */
  public keyWord() {
    if (this.currentToken?.tokenType === TokenType.Keyword) {
      return this.currentToken.keyWord;
    }
  }

  /**
   * Returns the character which is the current token.
   * Should be called only if tokenType is SYMBOL.
   */
  public symbol() {
    if (this.currentToken?.tokenType === TokenType.Symbol) {
      return this.currentToken.symbol;
    }
  }

  /**
   * Returns the string which is the current token.
   * Should be called only if tokenType is IDENTIFIER.
   */
  public identifier() {
    if (this.currentToken?.tokenType === TokenType.Identifier) {
      return this.currentToken.identifier;
    }
  }

  /**
   * Returns the integer value of the current token.
   * Should be called only if tokenType is INT_CONST.
   */
  public intVal() {
    if (this.currentToken?.tokenType === TokenType.IntConst) {
      return this.currentToken.intVal;
    }
  }

  /**
   * Returns the string value of the current token,
   * without the opening and closing double quotes.
   * Should be called only if tokenType is STRING_CONST.
   */
  public stringVal() {
    if (this.currentToken?.tokenType === TokenType.StringConst) {
      return this.currentToken.stringVal;
    }
  }

  private bufferFinished(): boolean {
    return this.bufferPosition >= this.buffer.length;
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private async loadNextChunkIntoBuffer(): Promise<void> {
    if (this.streamReader) {
      const { value: chunk, done } = await this.streamReader.read();
      if (chunk) {
        this.buffer = this.textDecoder.decode(chunk);
        this.bufferPosition = 0;
      }
      this.readerDone = done;
    }
  }

  private currentChar(): string {
    return this.buffer.charAt(this.bufferPosition);
  }

  private sliceAtOffset(start: number, end?: number): string {
    if (typeof end !== "number") {
      return this.buffer.slice(this.bufferPosition + start);
    }
    return this.buffer.slice(this.bufferPosition + start, this.bufferPosition + end);
  }
  /**
   * If the pointer is pointing at a single line comment,
   * move the pointer past the single line comment.
   * Return whether or not a single line comment was found.
   * Assumption:
   * The buffer position is already pointing at the start of a single line.
   */
  private async eatSingleLineComment(): Promise<void> {
    // Move past the '//' characters in the buffer
    this.bufferPosition += 2;
    // Begin looking for a newline
    let newlineFound = false;
    while (!newlineFound && this.hasMoreTokens()) {
      if (this.currentChar() === '\n') {
        newlineFound = true;
      }
      this.bufferPosition += 1;
      if (!newlineFound && this.bufferFinished()) {
        await this.loadNextChunkIntoBuffer();
      }
    }
  }

  /**
   * If the pointer is pointing at a multi line comment,
   * move the pointer past the multi line comment.
   * Assumption:
   * The buffer position is pointing at the start of a multiline comment.
   */
  private async eatMultiLineComment(): Promise<void> {
    // Move past the '/*' characters in the buffer
    this.bufferPosition += 2;
    // Begin looking for the '*/'
    let multilineEndFound = false;
    while (!multilineEndFound && this.hasMoreTokens()) {
      if (this.sliceAtOffset(0, 2) === '*/') {
        multilineEndFound = true;
        this.bufferPosition += 2;
      } else {
        this.bufferPosition += 1;
      }
      if (!multilineEndFound && this.bufferFinished()) {
        await this.loadNextChunkIntoBuffer();
      }
    }
  }

  private JACK_KEYWORDS = new Set([
    "class",
    "method",
    "function",
    "constructor",
    "int",
    "boolean",
    "char",
    "void",
    "var",
    "static",
    "field",
    "let",
    "do",
    "if",
    "else",
    "while",
    "return",
    "true",
    "false",
    "null",
    "this",
  ]);
  /**
   * Given that the current character is either an alpha character or undercore,
   * begin consuming the characters as a keyword or an identifier
   */
  private async eatKeywordOrIdentifier(): Promise<KeywordToken | IdentifierToken | null> {
    // Keeping track of the token collected so far
    let partialToken = this.currentChar();
    // Skipping the first char
    this.bufferPosition += 1;
    let nonAlphaNumericFound = false;
    while (!nonAlphaNumericFound && this.hasMoreTokens()) {
      const currentCharacter = this.currentChar();
      if (!this.isAlphaNumeric(currentCharacter) && !this.isUnderscore(currentCharacter)) {
        nonAlphaNumericFound = true;
      } else {
        partialToken += currentCharacter;
        this.bufferPosition += 1;
      }
      if (!nonAlphaNumericFound && this.bufferFinished()) {
        await this.loadNextChunkIntoBuffer();
      }
    }
    if (!nonAlphaNumericFound) {
      return null;
    }
    return this.JACK_KEYWORDS.has(partialToken) ? {
      tokenType: TokenType.Keyword,
      keyWord: partialToken,
    } : {
      tokenType: TokenType.Identifier,
      identifier: partialToken,
    };
  }

  /** All of the symbols used in the Jack language */
  private isJackSymbol(inputCharacter: string): boolean {
    return "{}()[].,;+-*/&|<>=~".includes(inputCharacter);
  }

  private isDigit(inputCharacter: string): boolean {
    return /[0123456789]/.test(inputCharacter);
  }

  private isAlpha(inputCharacter: string): boolean {
    return /[a-zA-Z]/.test(inputCharacter);
  }

  private isUnderscore(inputCharacter: string): boolean {
    return inputCharacter === "_";
  }

  private isAlphaNumeric(inputCharacter: string): boolean {
    return this.isDigit(inputCharacter) || this.isAlpha(inputCharacter);
  }

  /**
   * Given that the current character is a number,
   * consume the entire number from the buffer and return as an IntConstToken.
   */
  private async eatIntConst(): Promise<IntConstToken | null> {
    // Keeping track of the int const we are currently "eating"
    let partialToken = this.currentChar();
    this.bufferPosition += 1;
    // Begin looking for a non-digit character
    let nonDigitFound = false;
    while (!nonDigitFound && this.hasMoreTokens()) {
      if (!this.isDigit(this.currentChar())) {
        nonDigitFound = true;
      } else {
        partialToken += this.currentChar();
        this.bufferPosition += 1;
      }
      if (!nonDigitFound && this.bufferFinished()) {
        await this.loadNextChunkIntoBuffer();
      }
    }
    // Only returning the IntConstToken if we have found an int const
    if (nonDigitFound) {
      return {
        tokenType: TokenType.IntConst,
        intVal: parseInt(partialToken)
      };
    }
    return null;
  }
  /**
   * Given that the current character is a double quote ",
   * consume the entire string constant from the buffer and return
   * it as a StringConstToken.
   * Returns null, if an error occurred while parsing
   */
  private async eatStringConst(): Promise<StringConstToken | null> {
    // Skip the first double quote
    this.bufferPosition += 1;
    // Keeping track of the string we are currently "eating"
    let partialToken = "";
    // Begin looking for the ending double quote
    let doubleQuoteFound = false;
    while (!doubleQuoteFound && this.hasMoreTokens()) {
      if (this.currentChar() === "\"") {
        doubleQuoteFound = true;
      } else {
        partialToken += this.currentChar();
      }
      this.bufferPosition += 1;
      if (!doubleQuoteFound && this.bufferFinished()) {
        await this.loadNextChunkIntoBuffer();
      }
    }
    if (doubleQuoteFound) {
      return {
        tokenType: TokenType.StringConst,
        stringVal: partialToken
      };
    }
    return null;
  }
}
