const memorySegments = [
  "local", "argument", "static", "constant", "this", "that", "pointer", "temp"
] as const;

export type MemorySegment = (typeof memorySegments)[number];

export function isMemorySegment(segment?: string): segment is MemorySegment {
  for (const memorySegment of memorySegments) {
    if (segment === memorySegment) {
      return true;
    }
  }
  return false;
}
