import type { BunFile, FileSink } from "bun";
import { JackTokenizer, TokenType } from "./jack-tokenizer";
import { escapeXmlEntities } from "./xml-utils";

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
  private outputFileWriter: FileSink | null = null;

  /**
   * Takes in Input stream/file and output stream/file
   * Creates a new compilation engine with the given input and output.
   * The next routine called (by the JackAnalyzer module) must be compileClass.
   */
  static async create(inputFile: BunFile, outputFile: BunFile) {
    const newCompilationEngine = new CompilationEngine();
    newCompilationEngine.tokenizer = await JackTokenizer.create(inputFile);
    newCompilationEngine.outputFileWriter = outputFile.writer();
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
    await this.writeXMLElementWithChildren("class", async () => {
      await this.processKeyword("class");
      await this.processIdentifier();
      await this.processSymbol("{");
      while (this.isClassVarDec()) {
        await this.compileClassVarDec();
      }
      while (this.isSubroutine()) {
        await this.compileSubroutine();
      }
      await this.processSymbol("}");
    });
  }

  /**
   * Compiles a static variable declaration, or a field declaration.
   */
  async compileClassVarDec() {
    await this.writeXMLElementWithChildren("classVarDec", async () => {
      await this.processKeyword("static", "field");
      await this.processType();
      await this.processIdentifier(); // varName
      while (this.isSymbol(",")) {
        await this.processSymbol(",");
        await this.processIdentifier(); // varName
      }
      await this.processSymbol(";");
    });
  }

  /**
   * Compiles a complete method, function, or constructor.
   */
  async compileSubroutine() {
    await this.writeXMLElementWithChildren("subroutineDec", async () => {
      await this.processKeyword("constructor", "function", "method");
      if (this.isKeyword("void")) {
        await this.processKeyword("void");
      } else {
        await this.processType();
      }
      await this.processIdentifier(); // subroutineName
      await this.processSymbol("(");
      await this.compileParameterList();
      await this.processSymbol(")");
      await this.compileSubroutineBody();
    });
  }

  /**
   * Compiles a (possible empty) parameter list.
   * Does not handle the enclosing parentheses tokens ( and ).
   */
  async compileParameterList() {
    await this.writeXMLElementWithChildren("parameterList", async () => {
      if (this.isType()) {
        await this.processType();
        await this.processIdentifier(); // varName
        while (this.isSymbol(",")) {
          await this.processSymbol(",");
          await this.processType();
          await this.processIdentifier(); // varName
        }
      }
    });
  }

  /**
   * Compiles a subroutine's body.
   */
  async compileSubroutineBody() {
    await this.writeXMLElementWithChildren("subroutineBody", async () => {
      await this.processSymbol("{");
      while (this.isKeyword("var")) {
        await this.compileVarDec();
      }
      await this.compileStatements();
      await this.processSymbol("}");
    });
  }

  /**
   * Compiles a var declaration.
   */
  async compileVarDec() {
    await this.writeXMLElementWithChildren("varDec", async () => {
      await this.processKeyword("var");
      await this.processType();
      await this.processIdentifier(); // varName
      while (this.isSymbol(",")) {
        await this.processSymbol(",");
        await this.processIdentifier(); // varName
      }
      await this.processSymbol(";");
    });
  }

  /**
   * Compiles a sequence of statements.
   * Does not handle the enclosing curly bracket tokens { and }.
   */
  async compileStatements() {
    await this.writeXMLElementWithChildren("statements", async () => {
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
    }});
  }

  /**
   * Compiles a let statement.
   * let varName([ expression ])? = expression
   */
  async compileLet() {
    await this.writeXMLElementWithChildren("letStatement", async () => {
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
    });
  }

  /**
   * Compiles an if statement,
   * possibly with a trailing else clause.
   */
  async compileIf() {
    await this.writeXMLElementWithChildren("ifStatement", async () => {
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
    });
  }

  /**
   * Compiles a while statement
   */
  async compileWhile() {
    await this.writeXMLElementWithChildren("whileStatement", async () => {
      await this.processKeyword("while");
      await this.processSymbol("(");
      await this.compileExpression();
      await this.processSymbol(")");
      await this.processSymbol("{");
      await this.compileStatements();
      await this.processSymbol("}");
    });
  }

  /**
   * Compiles a do statement.
   */
  async compileDo() {
    await this.writeXMLElementWithChildren("doStatement", async () => {
      await this.processKeyword("do");
      await this.processSubroutineCall();
      await this.processSymbol(";");
    });
  }

  /**
   * Compiles a return statement.
   */
  async compileReturn() {
    await this.writeXMLElementWithChildren("returnStatement", async () => {
      await this.processKeyword("return");
      if (!this.isSymbol(";")) {
        await this.compileExpression();
      }
      await this.processSymbol(";");
    });
  }

  /**
   * Compiles an expression.
   */
  async compileExpression() {
    await this.writeXMLElementWithChildren("expression", async () => {
      await this.compileTerm();
      while (this.isSymbol(...this.OPS)) {
        await this.processSymbol(...this.OPS);
        await this.compileTerm();
      }
    });
  }

  /**
   * Compiles a term. If the current token is an identifier, the routine
   * must resolve it into a variable, an array entry, or a subroutine call.
   * A single lookahead token, which may be [, (, or ., suffices to distinguish
   * between the possibilities.
   * Any other token is not part of this term and should not be advanced over.
   */
  async compileTerm() {
    await this.writeXMLElementWithChildren("term", async () => {
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
    });
  }

  /**
   * Compiles a (possibly empty) comma-separated list of expressions.
   * Returns the number of expressions in the list.
   */
  async compileExpressionList(): Promise<number> {
    let expressionCount = 0;
    await this.writeXMLElementWithChildren("expressionList", async () => {
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
    });
    return expressionCount;
  }

  private async processKeyword(...keywords: string[]) {
    if (
      this.tokenizer &&
      this.tokenizer?.tokenType() === TokenType.Keyword &&
      keywords.includes(this.tokenizer.keyWord() ?? "")
    ) {
      this.writeXMLElement("keyword", this.tokenizer.keyWord());
      await this.tokenizer.advance();
    }
  }

  private async processSymbol(...symbols: string[]) {
    if (
      this.tokenizer?.tokenType() === TokenType.Symbol &&
      symbols.includes(this.tokenizer.symbol() ?? "")
    ) {

      this.writeXMLElement("symbol", this.tokenizer.symbol());
      await this.tokenizer.advance();
    }
  }

  private async processIntegerConstant() {
    if (this.tokenizer?.tokenType() === TokenType.IntConst) {
      this.writeXMLElement("integerConstant", `${this.tokenizer.intVal()}`);
      await this.tokenizer.advance();
    }
  }

  private async processStringConstant() {
    if (this.tokenizer?.tokenType() === TokenType.StringConst) {
      this.writeXMLElement("stringConstant", this.tokenizer.stringVal());
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
   */
  private async processIdentifier(identifier?: string) {
    if (typeof identifier === "string") {
      this.writeXMLElement("identifier", identifier);
    } else if (this.tokenizer?.tokenType() === TokenType.Identifier) {
      this.writeXMLElement("identifier", this.tokenizer.identifier());
      await this.tokenizer.advance();
    }
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

  private indentLevel = 0;
  private indentString = "  ";
  private write(data: string) {
    this.outputFileWriter?.write(`${data}`);
  }

  private writeLine(data: string) {
    this.write(`${this.indentString.repeat(this.indentLevel)}${data}\r\n`);
  }

  private async writeXMLElementWithChildren(tagName: string, callback: () => Promise<void>) {
    this.writeLine(`<${tagName}>`);
    this.indentLevel += 1;
    let err;
    try {
      await callback();
    } catch (e) {
      err = e;
    } finally {
      this.indentLevel -= 1;
      this.writeLine(`</${tagName}>`);
      if (err) {
        throw err;
      }
    }
  }

  private async writeXMLElement(tagName: string, child: string | undefined) {
    this.writeLine(`<${tagName}> ${escapeXmlEntities(child ?? "")} </${tagName}>`);
  }
}
