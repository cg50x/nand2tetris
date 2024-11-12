export function escapeXmlEntities(str: string) {
  return str.replace(/[<>&'"]/g, function (char: string) {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
    }
    return char;
  });
}
