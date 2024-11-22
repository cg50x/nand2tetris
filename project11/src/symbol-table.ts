
export type Kind = 'field' | 'static' | 'local' | 'argument';

export type SymbolTableEntry = {
  name: string;
  type: string; // 'int' | 'char' | 'boolean' or Class name
  kind: Kind;
  index: number;
};

/**
 * When compiling a Jack class, we need one class-level symbol table
 * and one subroutine-level symbol table.
 * When we start compiling a subroutine, we reset the latter table.
 * Each variable is assigned a running index within its scope (table) and kind.
 * The index starts at 0, increments by 1 after each time a new symbol is added
 * to the table, and is sreset to 0 when starting a new scope (table)
 * When compiling an error-free Jack code, each identifier not found in the symbol
 * tables can be assumed to be either a subroutine name or a class name.
 */
export class SymbolTable {
  private staticCount = 0;
  private fieldCount = 0;
  private argCount = 0;
  private localCount = 0;

  public entries: SymbolTableEntry[] = [];

  /**
   * Empties the symbol table, and resets the four indexes to 0.
   * Should be called when starting to compile a subroutine declaration.
   */
  reset() {
    this.staticCount = 0;
    this.fieldCount = 0;
    this.argCount = 0;
    this.localCount = 0;
    this.entries = [];
  }

  /**
   * Defines (adds to the table) a new varaible of the given name, type, and kind.
   * Assigns to it the index value of that kind, and adds 1 to the index.
   * @param name 
   * @param type 
   * @param kind 
   */
  define(name: string, type: string, kind: Kind) {
    let indexCount;
    switch (kind) {
      case "argument":
        indexCount = this.argCount++;
        break;
      case "field":
        indexCount = this.fieldCount++;
        break;
      case "local":
        indexCount = this.localCount++;
        break;
      case "static":
        indexCount = this.staticCount++;
        break;
    }
    this.entries.push({
      name,
      type,
      kind,
      index: indexCount,
    });
  }

  /**
   * Returns the number of variables of the given kind already
   * defined in the table.
   * @param kind 
   */
  varCount(kind: Kind): number {
    switch (kind) {
      case "argument":
        return this.argCount;
      case "field":
        return this.fieldCount;
      case "local":
        return this.localCount;
      case "static":
        return this.staticCount;
      default:
        return 0;
    }
  }

  kindOf(name: string): Kind | undefined {
    return this.entries.find((entry) => entry.name === name)?.kind;
  }

  typeOf(name: string): string | undefined {
    return this.entries.find((entry) => entry.name === name)?.type;
  }

  indexOf(name: string): number | undefined {
    return this.entries.find((entry) => entry.name === name)?.index;
  }

}
