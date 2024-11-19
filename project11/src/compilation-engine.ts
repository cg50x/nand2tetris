import type { BunFile, FileSink } from "bun";
import { JackTokenizer, TokenType } from "./jack-tokenizer";
import { escapeXmlEntities } from "./xml-utils";
import { VMWriter } from "./vm-writer";
import { SymbolTable } from "./symbol-table";

/**
 * CompilationEngine: Gets its input from a JackTokenizer
 * and emits its output to an output file, using a set of parsing routines.
 * Each compilexxx routine is responsible for handling all the tokens
 * that make up xxx, advancing the tokenizer exactly beyond these tokens, and outputting the parsing of xxx.
 */
export class CompilationEngine {
  private OPS = ["+", "-", "*", "/", "&", "|", "<", ">", "="];
  private UNARY_OPS = ["-", "~"];
  private tokenizer: JackTokenizer | null = null;
  private vmWriter: VMWriter | null = null;

  private should: boolean = false;
  private className: string = "";
  private insideSubroutine: boolean = false;
  private subroutineName: string = "";
  private subroutineVarCount: number = NaN;

  private classSymbolTable = new SymbolTable();
  private subroutineSymbolTable = new SymbolTable();

  /**
   * Takes in Input stream/file and output stream/file
   * Creates a new compilation engine with the given input and output.
   * The next routine called (by the JackAnalyzer module) must be compileClass.
   */
  static async create(inputFile: BunFile, outputFile: BunFile) {
    const newCompilationEngine = new CompilationEngine();
    newCompilationEngine.tokenizer = await JackTokenizer.create(inputFile);
    newCompilationEngine.vmWriter = new VMWriter(outputFile);
    await newCompilationEngine.tokenizer.advance();
    return newCompilationEngine;
  }

  /**
   * Only create the CompilationEngine through the async create function
   */
  protected constructor() {}

  /**
   * Compiles a complete class.
   * class
   */
  async compileClass() {
    await this.processKeyword("class");
    this.className = await this.processIdentifier() ?? "";
    await this.processSymbol("{");
    while (this.isClassVarDec()) {
      await this.compileClassVarDec();
    }
    while (this.isSubroutine()) {
      await this.compileSubroutine();
    }
    await this.processSymbol("}");
  }

  /**
   * Compiles a static variable declaration, or a field declaration.
   */
  async compileClassVarDec() {
    await this.processKeyword("static", "field");
    await this.processType();
    await this.processIdentifier(); // varName
    while (this.isSymbol(",")) {
      await this.processSymbol(",");
      await this.processIdentifier(); // varName
    }
    await this.processSymbol(";");
  }

  /**
   * Compiles a complete method, function, or constructor.
   */
  async compileSubroutine() {
    await this.processKeyword("constructor", "function", "method");
    if (this.isKeyword("void")) {
      await this.processKeyword("void");
    } else {
      await this.processType();
    }
    const subroutineName = await this.processIdentifier(); // subroutineName
    await this.processSymbol("(");
    await this.compileParameterList();
    await this.processSymbol(")");
    await this.compileSubroutineBody();
    this.vmWriter?.writeFunction(`${this.className}.${subroutineName}`, this.subroutineVarCount);
  }

  /**
   * Compiles a (possible empty) parameter list.
   * Does not handle the enclosing parentheses tokens ( and ).
   */
  async compileParameterList() {
    if (this.isType()) {
      await this.processType();
      await this.processIdentifier(); // varName
      while (this.isSymbol(",")) {
        await this.processSymbol(",");
        await this.processType();
        await this.processIdentifier(); // varName
      }
    }
  }

  /**
   * Compiles a subroutine's body.
   */
  async compileSubroutineBody() {
    await this.processSymbol("{");
    this.subroutineVarCount = 0;
    while (this.isKeyword("var")) {
      await this.compileVarDec();
      this.subroutineVarCount += this.varDecCount;
    }
    await this.compileStatements();
    await this.processSymbol("}");
  }

  /**
   * Compiles a var declaration.
   */
  private varDecCount = 0;
  async compileVarDec() {
    await this.processKeyword("var");
    await this.processType();
    await this.processIdentifier(); // varName
    this.varDecCount = 1;
    while (this.isSymbol(",")) {
      this.varDecCount += 1;
      await this.processSymbol(",");
      await this.processIdentifier(); // varName
    }
    await this.processSymbol(";");
  }

  /**
   * Compiles a sequence of statements.
   * Does not handle the enclosing curly bracket tokens { and }.
   */
  async compileStatements() {
    let done = false;
    while (!done) {
      if (this.isKeyword("let")) {
        await this.compileLet();
      } else if (this.isKeyword("if")) {
        await this.compileIf();
      } else if (this.isKeyword("while")) {
        await this.compileWhile();
      } else if (this.isKeyword("do")) {
        await this.compileDo();
      } else if (this.isKeyword("return")) {
        await this.compileReturn();
      } else {
        // Stop processing statements if no statements were found
        done = true;
      }
    }
  }

  /**
   * Compiles a let statement.
   * let varName([ expression ])? = expression
   */
  async compileLet() {
    await this.processKeyword("let");
    await this.processIdentifier(); // varName
    if (this.isSymbol("[")) {
      await this.processSymbol("[");
      await this.compileExpression();
      await this.processSymbol("]");
    }
    await this.processSymbol("=");
    await this.compileExpression();
    await this.processSymbol(";");
  }

  /**
   * Compiles an if statement,
   * possibly with a trailing else clause.
   */
  async compileIf() {
    await this.processKeyword("if");
    await this.processSymbol("(");
    await this.compileExpression();
    await this.processSymbol(")");
    await this.processSymbol("{");
    await this.compileStatements();
    await this.processSymbol("}");
    if (this.isKeyword("else")) {
      await this.processKeyword("else");
      await this.processSymbol("{");
      await this.compileStatements();
      await this.processSymbol("}");
    }
  }

  /**
   * Compiles a while statement
   */
  async compileWhile() {
    await this.processKeyword("while");
    await this.processSymbol("(");
    await this.compileExpression();
    await this.processSymbol(")");
    await this.processSymbol("{");
    await this.compileStatements();
    await this.processSymbol("}");
  }

  /**
   * Compiles a do statement.
   */
  async compileDo() {
    await this.processKeyword("do");
    await this.processSubroutineCall();
    await this.processSymbol(";");
  }

  /**
   * Compiles a return statement.
   */
  async compileReturn() {
    await this.processKeyword("return");
    if (!this.isSymbol(";")) {
      await this.compileExpression();
    }
    await this.processSymbol(";");
  }

  /**
   * Compiles an expression.
   */
  async compileExpression() {
    await this.compileTerm();
    while (this.isSymbol(...this.OPS)) {
      await this.processSymbol(...this.OPS);
      await this.compileTerm();
    }
  }

  /**
   * Compiles a term. If the current token is an identifier, the routine
   * must resolve it into a variable, an array entry, or a subroutine call.
   * A single lookahead token, which may be [, (, or ., suffices to distinguish
   * between the possibilities.
   * Any other token is not part of this term and should not be advanced over.
   */
  async compileTerm() {
    if (this.isIntegerConstant()) {
      await this.processIntegerConstant();
    } else if (this.isStringConstant()) {
      await this.processStringConstant();
    } else if (this.isKeyword("true", "false", "null", "this")) {
      await this.processKeyword("true", "false", "null", "this");
    } else if (this.isSymbol("(")) {
      await this.processSymbol("(");
      await this.compileExpression();
      await this.processSymbol(")");
    } else if (this.isSymbol(...this.UNARY_OPS)) {
      await this.processSymbol(...this.UNARY_OPS);
      await this.compileTerm();
    } else if (this.isIdentifier()) {
      // Handling varName | varName[expression] | subroutineCall
      // Saving the current identifier token's value
      // and looking ahead to the next token
      const identifier = this.tokenizer?.identifier();
      await this.tokenizer?.advance();
      if (this.isSymbol("[")) {
        // Handling array access varName[expression]
        await this.processIdentifier(identifier);
        await this.processSymbol("[");
        await this.compileExpression();
        await this.processSymbol("]");
      } else if (this.isSymbol(".", "(")) {
        // Handling subroutine call
        await this.processSubroutineCall(identifier);
      } else {
        // Handling normal identifier varName
        await this.processIdentifier(identifier);
      }
    }
  }

  /**
   * Compiles a (possibly empty) comma-separated list of expressions.
   * Returns the number of expressions in the list.
   */
  async compileExpressionList(): Promise<number> {
    let expressionCount = 0;
    if (!this.isSymbol(")")) {
      // There is at least one expression
      await this.compileExpression();
      expressionCount += 1;
      while (this.isSymbol(",")) {
        await this.processSymbol(",");
        await this.compileExpression();
        expressionCount += 1;
      }
    }
    return expressionCount;
  }

  private async processKeyword(...keywords: string[]) {
    if (
      this.tokenizer &&
      this.tokenizer?.tokenType() === TokenType.Keyword &&
      keywords.includes(this.tokenizer.keyWord() ?? "")
    ) {
      await this.tokenizer.advance();
    }
  }

  private async processSymbol(...symbols: string[]) {
    if (
      this.tokenizer?.tokenType() === TokenType.Symbol &&
      symbols.includes(this.tokenizer.symbol() ?? "")
    ) {
      await this.tokenizer.advance();
    }
  }

  private async processIntegerConstant() {
    if (this.tokenizer?.tokenType() === TokenType.IntConst) {
      await this.tokenizer.advance();
    }
  }

  private async processStringConstant() {
    if (this.tokenizer?.tokenType() === TokenType.StringConst) {
      await this.tokenizer.advance();
    }
  }

  /**
   * Processes the current token if it is an identifier, writes
   * to the output file, and advances the token.
   * If a identifier is given, this will only write the given
   * identifier to the output file and ignore the current token.
   * This optional parameters supports the ability to look ahead two tokens
   * in the compileTerm method.
   * @param identifier
   * @returns Identifier name
   */
  private async processIdentifier(identifier?: string) {
    let result: string | undefined;
    if (typeof identifier === "string") {
      result = identifier
    } else if (this.tokenizer?.tokenType() === TokenType.Identifier) {
      result = this.tokenizer?.identifier();
      await this.tokenizer.advance();
    }
    return result;
  }

  private async processType() {
    const types = ["int", "char", "boolean"];
    if (this.isKeyword(...types)) {
      await this.processKeyword(...types);
    } else {
      await this.processIdentifier();
    }
  }

  /**
   * Processes the current token if it is an subroutine call, writes
   * to the output file, and advances the token.
   * If a subroutineName is given, this will only write the given
   * subroutineName to the output file and ignore the current token.
   * This optional parameters supports the ability to look ahead two tokens
   * in the compileTerm method.
   * @param subroutineName
   */
  private async processSubroutineCall(subroutineName?: string) {
    // There are two forms of a subroutine call:
    // - subroutineName(expressionList)
    // - classOrVarName.subroutineName(expressionList)
    await this.processIdentifier(subroutineName); // subroutineName or classOrVarName
    if (this.isSymbol(".")) {
      await this.processSymbol(".");
      await this.processIdentifier();
    }
    await this.processSymbol("(");
    await this.compileExpressionList();
    await this.processSymbol(")");
  }

  /**
   * Whether or not the current token is a keyword that matches one
   * of the given keywords.
   * @param keywords
   * @returns
   */
  private isKeyword(...keywords: string[]) {
    return (
      this.tokenizer?.tokenType() === TokenType.Keyword &&
      keywords.includes(this.tokenizer.keyWord() ?? "")
    );
  }

  private isSymbol(...symbols: string[]) {
    return (
      this.tokenizer?.tokenType() === TokenType.Symbol &&
      symbols.includes(this.tokenizer.symbol() ?? "")
    );
  }

  /**
   * Whether or not the current token is a class var declaration.
   */
  private isClassVarDec() {
    return this.isKeyword("static", "field");
  }

  /**
   * Whether or not the current token is a subroutine declaration.
   */
  private isSubroutine() {
    return this.isKeyword("constructor", "function", "method");
  }

  /**
   * Whether or not the current token is a type
   */
  private isType() {
    return (
      this.isKeyword("int", "char", "boolean") ||
      this.tokenizer?.tokenType() === TokenType.Identifier
    );
  }

  private isIntegerConstant() {
    return this.tokenizer?.tokenType() === TokenType.IntConst;
  }

  private isStringConstant() {
    return this.tokenizer?.tokenType() === TokenType.StringConst;
  }

  private isIdentifier() {
    return this.tokenizer?.tokenType() === TokenType.Identifier;
  }
}
