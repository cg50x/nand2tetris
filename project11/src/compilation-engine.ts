import type { BunFile, FileSink } from "bun";
import { JackTokenizer, TokenType } from "./jack-tokenizer";
import { VMWriter } from "./vm-writer";
import { SymbolTable, type Kind, type SymbolTableEntry } from "./symbol-table";

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
    this.className = (await this.processIdentifier()) ?? "";
    console.log(`Setting classname to ${this.className}`);
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
    if (
      !(varName && varType && (varKind === "static" || varKind === "field"))
    ) {
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
  private currentSubroutineKind = "";
  async compileSubroutine() {
    this.subroutineSymbolTable.reset();
    this.currentSubroutineKind =
      (await this.processKeyword("constructor", "function", "method")) ?? "";
    if (this.isKeyword("void")) {
      await this.processKeyword("void");
    } else {
      await this.processType();
    }
    this.currentSubroutineName = (await this.processIdentifier()) ?? "";
    await this.processSymbol("(");
    if (this.currentSubroutineKind === "method") {
      // Before collecting the arguments in a method,
      // we need to add 'this' as the first argument.
      // This symbol won't actually be used so we don't need to add a type.
      this.subroutineSymbolTable.define("this", "", "argument");
    }
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
    this.vmWriter?.writeFunction(
      `${this.className}.${this.currentSubroutineName}`,
      localVarCount
    );
    if (this.currentSubroutineKind === "constructor") {
      // Slide 46
      // Allocating memory for the constructed object
      this.vmWriter?.writePush(
        "constant",
        this.classSymbolTable.varCount("field")
      );
      this.vmWriter?.writeCall("Memory.alloc", 1);
      // Setting the object as THIS
      this.vmWriter?.writePop("pointer", 0);
    } else if (this.currentSubroutineKind === "method") {
      // Slide 50
      // Setting the first arg object as THIS
      this.vmWriter?.writePush("argument", 0);
      this.vmWriter?.writePop("pointer", 0);
    }
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
    const varName = await this.processIdentifier();
    const isSettingArrayElement = this.isSymbol("[");
    if (isSettingArrayElement && varName) {
      // Slide 63
      // push arr
      this.writePushVariable(varName);
      await this.processSymbol("[");
      await this.compileExpression();
      await this.processSymbol("]");
      // add
      this.vmWriter?.writeArithmetic("add");
      // pop pointer 1 to set THAT
      // this.vmWriter?.writePop("pointer", 1);
    }
    await this.processSymbol("=");
    await this.compileExpression();
    await this.processSymbol(";");
    if (isSettingArrayElement) {
      // result of expression will be at the top of the stack
      // so pop it into temp first
      this.vmWriter?.writePop("temp", 0);
      // Change THAT to point to the index
      // calculated for the left side of the let
      this.vmWriter?.writePop("pointer", 1);
      // Push the expression's value back onto the stack
      this.vmWriter?.writePush("temp", 0);
      // Set the value in the array
      this.vmWriter?.writePop("that", 0);
    } else if (varName) {
      // pop varName
      this.writePopVariable(varName);
    }
  }

  /**
   * Compiles an if statement,
   * possibly with a trailing else clause.
   */
  private nextIfLabelId = 0;
  async compileIf() {
    const ifLabelId = this.nextIfLabelId++;
    // See Slide 28 for vm code info
    await this.processKeyword("if");
    await this.processSymbol("(");
    await this.compileExpression();
    await this.processSymbol(")");
    await this.processSymbol("{");
    this.vmWriter?.writeArithmetic("not");
    this.vmWriter?.writeIf(`IF_GOTO_NOT_${ifLabelId}`);
    await this.compileStatements();
    this.vmWriter?.writeGoto(`IF_GOTO_END_${ifLabelId}`);
    this.vmWriter?.writeLabel(`IF_GOTO_NOT_${ifLabelId}`);
    await this.processSymbol("}");
    if (this.isKeyword("else")) {
      await this.processKeyword("else");
      await this.processSymbol("{");
      await this.compileStatements();
      await this.processSymbol("}");
    }
    this.vmWriter?.writeLabel(`IF_GOTO_END_${ifLabelId}`);
  }

  /**
   * Compiles a while statement
   */
  private nextWhileLabelId = 0;
  async compileWhile() {
    // See Slide 31
    const whileLabelId = this.nextWhileLabelId++;
    const startLabel = `WHILE_START_${whileLabelId}`;
    const endLabel = `WHILE_END_${whileLabelId}`;
    // label L1
    this.vmWriter?.writeLabel(startLabel);
    await this.processKeyword("while");
    await this.processSymbol("(");
    await this.compileExpression();
    // not
    this.vmWriter?.writeArithmetic("not");
    // if-goto L2
    this.vmWriter?.writeIf(endLabel);
    await this.processSymbol(")");
    await this.processSymbol("{");
    await this.compileStatements();
    await this.processSymbol("}");
    // goto L1
    this.vmWriter?.writeGoto(startLabel);
    // label L2
    this.vmWriter?.writeLabel(endLabel);
  }

  /**
   * Compiles a do statement.
   */
  async compileDo() {
    await this.processKeyword("do");
    const callDetails = await this.processSubroutineCall();
    if (callDetails) {
      const { calleeName, nArgs } = callDetails;
      this.vmWriter?.writeCall(calleeName, nArgs);
    }
    await this.processSymbol(";");
    this.vmWriter?.writePop("temp", 0);
  }

  /**
   * Compiles a return statement.
   */
  async compileReturn() {
    await this.processKeyword("return");
    if (!this.isSymbol(";")) {
      await this.compileExpression();
    } else {
      // We need to return a 0 if nothing is returned.
      this.vmWriter?.writePush("constant", 0);
    }
    await this.processSymbol(";");
    this.vmWriter?.writeReturn();
  }

  /**
   * Compiles an expression.
   */
  async compileExpression() {
    // See Slide 16
    await this.compileTerm();
    while (this.isSymbol(...this.OPS)) {
      const symbol = await this.processSymbol(...this.OPS);
      await this.compileTerm();
      switch (symbol) {
        case "+":
          this.vmWriter?.writeArithmetic("add");
          break;
        case "-":
          this.vmWriter?.writeArithmetic("sub");
          break;
        case "*":
          this.vmWriter?.writeCall("Math.multiply", 2);
          break;
        case "/":
          this.vmWriter?.writeCall("Math.divide", 2);
          break;
        case "&":
          this.vmWriter?.writeArithmetic("and");
          break;
        case "|":
          this.vmWriter?.writeArithmetic("or");
          break;
        case "<":
          this.vmWriter?.writeArithmetic("lt");
          break;
        case ">":
          this.vmWriter?.writeArithmetic("gt");
          break;
        case "=":
          this.vmWriter?.writeArithmetic("eq");
          break;
      }
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
        // Slide 78
        this.vmWriter?.writePush("constant", stringVal.length);
        this.vmWriter?.writeCall("String.new", 1);
        stringVal.split("").forEach((stringChar) => {
          this.vmWriter?.writePush("constant", stringChar.charCodeAt(0));
          this.vmWriter?.writeCall("String.appendChar", 2);
        });
      }
    } else if (this.isKeyword("true", "false", "null", "this")) {
      const keyword = await this.processKeyword(
        "true",
        "false",
        "null",
        "this"
      );
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
        // Slide 63
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
      result = identifier;
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
  private async processSubroutineCall(
    subroutineName?: string
  ): Promise<{
    calleeName: string;
    nArgs: number;
  } | void> {
    // There are two forms of a subroutine call:
    // - subroutineName(expressionList)
    // - classOrVarName.subroutineName(expressionList)
    let calleeName = await this.processIdentifier(subroutineName); // subroutineName or classOrVarName
    let nArgs = 0;
    if (this.isSymbol(".")) {
      // The qualifier is the identifier before the ".".
      // At this point, it could be a class name or a field/local var.
      const qualifier = calleeName;
      await this.processSymbol(".");
      const methodName = await this.processIdentifier();
      const symbolEntry = qualifier && this.kindAndIndexOf(qualifier);
      if (symbolEntry) {
        // The qualifier was found in the symbol table, so it is an object.
        // Pushing the object as the first argument.
        this.writePushVariable(qualifier);
        nArgs += 1;
        // Prepending the object's class
        calleeName = `${symbolEntry.type}.${methodName}`;
        console.log(`calleeName = ${calleeName}`);
      } else {
        // At this point it is a class name, so just add the qualifier directly
        calleeName = `${qualifier}.${methodName}`;
      }
    } else {
      // No qualifier is present, so it is implicitly a call on 'this'
      // Pushing 'this' as the first argument
      this.vmWriter?.writePush("pointer", 0);
      nArgs += 1;
      // Also need to make sure to prepend the current class name
      calleeName = calleeName && `${this.className}.${calleeName}`;
    }
    await this.processSymbol("(");
    nArgs += await this.compileExpressionList();
    await this.processSymbol(")");
    if (calleeName) {
      return {
        calleeName,
        nArgs,
      };
    }
    // TODO Consider just writing the vm code for the function call here
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
    const symbolEntry = this.kindAndIndexOf(identifier);
    if (symbolEntry) {
      const { kind, index } = symbolEntry;
      // Maybe kind should've just used "this" instead...
      if (kind === "field") {
        this.vmWriter?.writePush("this", index);
      } else {
        this.vmWriter?.writePush(kind, index);
      }
    }
  }

  private writePopVariable(identifier: string) {
    const symbolEntry = this.kindAndIndexOf(identifier);
    if (symbolEntry) {
      const { kind, index } = symbolEntry;
      if (kind === "field") {
        this.vmWriter?.writePop("this", index);
      } else {
        this.vmWriter?.writePop(kind, index);
      }
    }
  }

  // TODO Find a better name since it also has type
  private kindAndIndexOf(
    identifier: string
  ): { kind: Kind; index: number; type: string; scope: "subroutine" | "class" } | undefined {
    let kind = this.subroutineSymbolTable.kindOf(identifier);
    let index = this.subroutineSymbolTable.indexOf(identifier);
    let typeVal = this.subroutineSymbolTable.typeOf(identifier);
    if (
      (kind === "local" || kind === "argument") &&
      typeof index === "number" &&
      typeof typeVal === "string"
    ) {
      return {
        kind,
        index,
        type: typeVal,
        scope: "subroutine",
      };
    } else {
      // Looking up via class symbol table
      kind = this.classSymbolTable.kindOf(identifier);
      index = this.classSymbolTable.indexOf(identifier);
      typeVal = this.classSymbolTable.typeOf(identifier);
      if (
        (kind === "static" || kind === "field") &&
        typeof index === "number" &&
        typeof typeVal === "string"
      ) {
        return {
          kind,
          index,
          type: typeVal,
          scope: "class",
        };
      }
    }
  }
}
