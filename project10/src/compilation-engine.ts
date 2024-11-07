export class CompilationEngine {
  /**
   * Takes in Input stream/file and output stream/file
   * Creates a new compilation engine with the given input and output.
   * The next routine called (by the JackAnalyzer module) must be compileClass.
   */
  constructor() {}

  /**
   * Compiles a complete class.
   */
  compileClass() {}

  /**
   * Compiles a static variable declaration, or a field declaration.
   */
  compileClassVarDec() {}

  /**
   * Compiles a complete method, function, or constructor.
   */
  compileSubroutine() {}

  /**
   * Compiles a (possible empty) parameter list.
   * Does not handle the enclosing parentheses tokens ( and ).
   */
  compileParameterList() {}

  /**
   * Compiles a subroutine's body.
   */
  compileSubroutineBody() {}

  /**
   * Compiles a var declaration.
   */
  compileVarDec() {}

  /**
   * Compiles a sequence of statements.
   * Does not handle the enclosing curly bracket tokens { and }.
   */
  compileStatements() {}

  /**
   * Compiles a let statement.
   */
  compileLet() {}

  /**
   * Compiles an if statement,
   * possibly with a trailing else clause.
   */
  compileIf() {}

  /**
   * Compiles a while statement
   */
  compileWhile() {}

  /**
   * Compiles a do statement.
   */
  compileDo() {}

  /**
   * Compiles a return statement.
   */
  compileReturn() {}

  /**
   * Compiles an expression.
   */
  compileExpression() {}

  /**
   * Compiles a term. If the current token is an identifier, the routine
   * must resolve it into a variable, an array entry, or a subroutine call.
   * A single lookahead token, which may be [, (, or ., suffices to distinguish
   * between the possibilities.
   * Any other token is not part of this term and should not be advanced over.
   */
  compileTerm() {}

  /**
   * Compiles a (possibly empty) comma-separated list of expressions.
   * Returns the number of expressions in the list.
   */
  compileExpressionList(): number {
    return 0;
  }
}