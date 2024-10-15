
/**
 * Context that is passed to the writers.
 */
export interface WriterContext {
  /** Name of the vm file currently being processed without the extension (e.g. Foo) */
  vmFileName: string;
  /** A string suffix that the writer can use to ensure generated labels do not conflict with other labels. */
  uniqueIdSuffix: string;
}
