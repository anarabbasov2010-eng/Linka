const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[character]);

function safeLink(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function renderInlineMarkdown(value) {
  const links = [];
  let source = String(value ?? "").replace(/\[([^\]\n]{1,500})\]\((https?:\/\/[^\s)]+)\)/g, (whole, label, rawUrl) => {
    const href = safeLink(rawUrl);
    if (!href) return whole;
    const token = `\uE000LINKA${links.length}\uE001`;
    links.push({
      token,
      html: `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
    });
    return token;
  });

  source = escapeHtml(source);
  source = source
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/~~([^~\n]+)~~/g, "<del>$1</del>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");

  for (const link of links) source = source.replaceAll(link.token, link.html);
  return source;
}

function isBlockStart(line) {
  return /^\s*```/.test(line) ||
    /^ {0,3}#{1,6}\s+/.test(line) ||
    /^ {0,3}(?:[-*+]\s+|\d+\.\s+)/.test(line) ||
    /^ {0,3}>\s?/.test(line) ||
    /^ {0,3}(?:-{3,}|_{3,}|\*{3,})\s*$/.test(line);
}

/**
 * Render the safe Markdown subset Linka documents support. Raw HTML is always
 * escaped; only credential-free HTTP(S) links become clickable elements.
 */
export function renderMarkdownToHtml(value) {
  const lines = String(value ?? "").replace(/\r\n?/g, "\n").split("\n");
  const output = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    const fence = line.match(/^ {0,3}```([\w+-]*)\s*$/);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^ {0,3}```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      const language = /^[a-zA-Z0-9_+-]{1,24}$/.test(fence[1] || "") ? fence[1] : "";
      const className = language ? ` class="language-${escapeHtml(language)}"` : "";
      output.push(`<pre><code${className}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      output.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^ {0,3}(?:-{3,}|_{3,}|\*{3,})\s*$/.test(line)) {
      output.push("<hr>");
      index += 1;
      continue;
    }

    if (/^ {0,3}>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^ {0,3}>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^ {0,3}>\s?/, ""));
        index += 1;
      }
      output.push(`<blockquote><p>${quote.map(renderInlineMarkdown).join("<br>")}</p></blockquote>`);
      continue;
    }

    const listMatch = line.match(/^ {0,3}([-*+]\s+|\d+\.\s+)(.*)$/);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const items = [];
      while (index < lines.length) {
        const match = lines[index].match(/^ {0,3}([-*+]\s+|\d+\.\s+)(.*)$/);
        if (!match || /^\d/.test(match[1]) !== ordered) break;
        const task = match[2].match(/^\[([ xX])\]\s+(.*)$/);
        if (task) {
          const checked = task[1].toLowerCase() === "x";
          items.push(`<li class="linka-md-task"><input type="checkbox" disabled${checked ? " checked" : ""}><span>${renderInlineMarkdown(task[2])}</span></li>`);
        } else {
          items.push(`<li>${renderInlineMarkdown(match[2])}</li>`);
        }
        index += 1;
      }
      output.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    output.push(`<p>${paragraph.map(renderInlineMarkdown).join("<br>")}</p>`);
  }

  return output.join("\n");
}
