export class JackTokenizer {
  /**
   * Takes in input file. 
   * Opens the input .jack file/stream and gets ready to tokenize it.
   */
  constructor() {}

  /**
   * Are there more tokens in the input?
   */
  hasMoreTokens(): boolean {
    return false;
  }

  /**
   * Gets the next token from the input, and makes it the current token.
   * This method should be called only if hasMoreTokens is true.
   * Initially there is no current token.
   */
  advance(): void {}

  /**
   * Returns the type of the current token, as a constant.
   * Returns:
   * - KEYWORD
   * - SYMBOL
   * - IDENTIFIER
   * - INT_CONST
   * - STRING_CONST
   */
  tokenType() {}

  /**
   * Returns the keyword which is the current token, as a constant.
   * This method should be called only if tokenType is KEYWORD.
   * CLASS
   * METHOD
   * FUNCTION
   * CONSTRUCTOR
   * INT
   * BOOLEAN
   * CHAR
   * VOID
   * VAR
   * STATIC
   * FIELD
   * LET
   * DO
   * IF
   * ELSE
   * WHILE
   * RETURN
   * TRUE
   * FALSE
   * NULL
   * THIS
   */
  keyWord() {}

  /**
   * Returns the character which is the current token.
   * Should be called only if tokenType is SYMBOL.
   */
  symbol(): string {
    return 'c';
  }

  /**
   * Returns the string which is the current token.
   * Should be called only if tokenType is IDENTIFIER.
   */
  identifier(): string {
    return '';
  }

  /**
   * Returns the integer value of the current token.
   * Should be called only if tokenType is INT_CONST.
   */
  intVal(): number {
    return 0;
  }

  /**
   * Returns the string value of the current token,
   * without the opening and closing double quotes.
   * Should be called only if tokenType is STRING_CONST.
   */
  stringVal(): string {
    return '';
  }
}
