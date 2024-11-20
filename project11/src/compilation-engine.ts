import type { BunFile, FileSink } from "bun";
import { JackTokenizer, TokenType } from "./jack-tokenizer";
import { VMWriter } from "./vm-writer";
import { SymbolTable, type SymbolTableEntry } from "./symbol-table";

/**
 * CompilationEngine: Gets its input from a JackTokenizer
 * and emits its output to an output file, using a set of parsing routines.
 * Each compilexxx routine is responsible for handling all the tokens
 * that make up xxx, advancing the tokenizer exactly beyond these tokens, and outputting the parsing of xxx.
 */
export class CompilationEngine {
  private OPS = ["+", "-", "*", "/", "&", "|", "<", ">", "="];
  private UNARY_OPS = ["-", "~"] as const;
  private tokenizer: JackTokenizer | null = null;
  private vmWriter: VMWriter | null = null;

  private className: string = "";

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
    console.log(this.className);
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
    const varKind = await this.processKeyword("static", "field");
    const varType = await this.processType();
    let varName = await this.processIdentifier();
    // Return early if kind type or name is invalid
    if (!(varName && varType && (varKind === "static" || varKind === "field"))) {
      return;
    }
    this.classSymbolTable.define(varName, varType, varKind);
    while (this.isSymbol(",")) {
      await this.processSymbol(",");
      varName = await this.processIdentifier();
      if (varName) {
        this.classSymbolTable.define(varName, varType, varKind);
      }
    }
    await this.processSymbol(";");
  }

  /**
   * Compiles a complete method, function, or constructor.
   */
  private currentSubroutineName = "";
  async compileSubroutine() {
    this.subroutineSymbolTable.reset();
    await this.processKeyword("constructor", "function", "method");
    if (this.isKeyword("void")) {
      await this.processKeyword("void");
    } else {
      await this.processType();
    }
    this.currentSubroutineName = await this.processIdentifier() ?? "";
    await this.processSymbol("(");
    await this.compileParameterList();
    await this.processSymbol(")");
    await this.compileSubroutineBody();
  }

  /**
   * Compiles a (possible empty) parameter list.
   * Does not handle the enclosing parentheses tokens ( and ).
   */
  async compileParameterList() {
    if (this.isType()) {
      let varType = await this.processType();
      let varName = await this.processIdentifier();
      if (varType && varName) {
        this.subroutineSymbolTable.define(varName, varType, "argument");
      }
      while (this.isSymbol(",")) {
        await this.processSymbol(",");
        varType = await this.processType();
        varName = await this.processIdentifier();
        if (varType && varName) {
          this.subroutineSymbolTable.define(varName, varType, "argument");
        }
      }
    }
  }

  /**
   * Compiles a subroutine's body.
   */
  async compileSubroutineBody() {
    await this.processSymbol("{");
    while (this.isKeyword("var")) {
      await this.compileVarDec();
    }
    const localVarCount = this.subroutineSymbolTable.varCount("local");
    this.vmWriter?.writeFunction(`${this.className}.${this.currentSubroutineName}`, localVarCount);
    await this.compileStatements();
    await this.processSymbol("}");
  }

  /**
   * Compiles a var declaration.
   */
  async compileVarDec() {
    await this.processKeyword("var");
    const varType = await this.processType();
    let varName = await this.processIdentifier(); // varName
    if (varName && varType) {
      this.subroutineSymbolTable.define(varName, varType, "local");
    }
    while (this.isSymbol(",")) {
      await this.processSymbol(",");
      varName = await this.processIdentifier(); // varName
      if (varName && varType) {
        this.subroutineSymbolTable.define(varName, varType, "local");
      }
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
      const intVal = await this.processIntegerConstant();
      if (typeof intVal === "number") {
        this.vmWriter?.writePush("constant", intVal);
      }
    } else if (this.isStringConstant()) {
      const stringVal = await this.processStringConstant();
      if (typeof stringVal === "string") {
        // Slide 78 for into
        /*
          push constant {length}
          call String.new 1
          pop pointer 0
          # for each character
            push constant c
            call String.appendChar 1
        */
        this.vmWriter?.writePush("constant", stringVal.length);
        this.vmWriter?.writeCall("String.new", 1);
        this.vmWriter?.writePop("pointer", 0);
        stringVal.split("").forEach((stringChar) => {
          this.vmWriter?.writePush("constant", stringChar.charCodeAt(0));
          this.vmWriter?.writeCall("String.appendChar", 1);
        });
      }
    } else if (this.isKeyword("true", "false", "null", "this")) {
      /*
        true = constant 1, followed by neg
        false = constant 0
        null = constant 0
        this = pointer 0
      */
      const keyword = await this.processKeyword("true", "false", "null", "this");
      switch (keyword) {
        case "true":
          this.vmWriter?.writePush("constant", 1);
          this.vmWriter?.writeArithmetic("neg");
          break;
        case "false":
        case "null":
          this.vmWriter?.writePush("constant", 0);
          break;
        case "this":
          this.vmWriter?.writePush("pointer", 0);
          break;
      }
    } else if (this.isSymbol("(")) {
      await this.processSymbol("(");
      await this.compileExpression();
      await this.processSymbol(")");
    } else if (this.isSymbol(...this.UNARY_OPS)) {
      const symbol = await this.processSymbol(...this.UNARY_OPS);
      await this.compileTerm();
      switch (symbol) {
        case "-":
          this.vmWriter?.writeArithmetic("neg");
          break;
        case "~":
          this.vmWriter?.writeArithmetic("not");
          break;
      }
    } else if (this.isIdentifier()) {
      // Handling varName | varName[expression] | subroutineCall
      // Saving the current identifier token's value
      // and looking ahead to the next token
      const identifier = this.tokenizer?.identifier();
      await this.tokenizer?.advance();
      if (this.isSymbol("[")) {
        // Handle array access with vm writer
        /*
          See Slide 63
          push arr
          push 2
          add
          pop pointer 1
          push that 0
        */
        const arrayIdentifier = await this.processIdentifier(identifier);
        if (arrayIdentifier) {
          this.writePushVariable(arrayIdentifier);
        }
        await this.processSymbol("[");
        await this.compileExpression();
        await this.processSymbol("]");
        this.vmWriter?.writeArithmetic("add");
        this.vmWriter?.writePop("pointer", 1);
        this.vmWriter?.writePush("that", 0);
      } else if (this.isSymbol(".", "(")) {
        // Handling subroutine call
        const callDetails = await this.processSubroutineCall(identifier);
        if (callDetails) {
          const { calleeName, nArgs } = callDetails;
          this.vmWriter?.writeCall(calleeName, nArgs);
        }
      } else {
        // Handling normal identifier varName
        await this.processIdentifier(identifier);
        if (identifier) {
          this.writePushVariable(identifier);
        }
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
      let keyword = this.tokenizer.keyWord();
      await this.tokenizer.advance();
      return keyword;
    }
  }

  private async processSymbol(...symbols: string[]) {
    if (
      this.tokenizer?.tokenType() === TokenType.Symbol &&
      symbols.includes(this.tokenizer.symbol() ?? "")
    ) {
      const symbol = this.tokenizer.symbol();
      await this.tokenizer.advance();
      return symbol;
    }
  }

  private async processIntegerConstant() {
    if (this.tokenizer?.tokenType() === TokenType.IntConst) {
      const intValue = this.tokenizer.intVal();
      await this.tokenizer.advance();
      return intValue;
    }
  }

  private async processStringConstant() {
    if (this.tokenizer?.tokenType() === TokenType.StringConst) {
      const stringVal = this.tokenizer.stringVal();
      await this.tokenizer.advance();
      return stringVal;
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
      return await this.processKeyword(...types);
    } else {
      return await this.processIdentifier();
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
  private async processSubroutineCall(subroutineName?: string): Promise<{ calleeName: string, nArgs: number } | void> {
    // There are two forms of a subroutine call:
    // - subroutineName(expressionList)
    // - classOrVarName.subroutineName(expressionList)
    let calleeName = await this.processIdentifier(subroutineName); // subroutineName or classOrVarName
    if (this.isSymbol(".")) {
      await this.processSymbol(".");
      const name = await this.processIdentifier();
      calleeName = calleeName ? `${calleeName}.${name}` : name;
    }
    await this.processSymbol("(");
    const nArgs = await this.compileExpressionList();
    await this.processSymbol(")");
    if (calleeName) {
      return {
        calleeName,
        nArgs
      };
    }
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

  private writePushVariable(identifier: string) {
    let kind = this.subroutineSymbolTable.kindOf(identifier);
    let index = this.subroutineSymbolTable.indexOf(identifier);
    if (kind && typeof index === "number") {
      switch (kind) {
        case "local":
          this.vmWriter?.writePush("local", index);
          break;
        case "argument":
          this.vmWriter?.writePush("argument", index);
          break;
      }
    } else {
      // Looking up via class symbol table
      kind = this.classSymbolTable.kindOf(identifier);
      index = this.classSymbolTable.indexOf(identifier);
      if (kind && typeof index === "number") {
        switch (kind) {
          case "static":
            this.vmWriter?.writePush("static", index);
            break;
          case "field":
            this.vmWriter?.writePush("this", index);
            break;
        }
      }
    }
  }
}
