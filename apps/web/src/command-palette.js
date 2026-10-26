/**
 * Filter command-palette entries by every query word against their labels,
 * descriptions and keywords. Action callbacks remain owned by the UI.
 */
export function filterPaletteCommands(commands, query = "") {
  const terms = String(query ?? "").trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const source = Array.isArray(commands) ? commands : [];
  return source.filter(command => {
    if (!command || typeof command.title !== "string") return false;
    const metadata = [
      command.title,
      command.description || "",
      ...(Array.isArray(command.keywords) ? command.keywords : [])
    ];
    const haystack = metadata.join(" ").toLocaleLowerCase();
    return terms.every(term => haystack.includes(term));
  }).slice(0, 24);
}
