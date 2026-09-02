import React from "react";

/** Renders a *subset* of Markdown enough for GPT's typical answer formatting:
 * headers, **bold**, `inline code`, ```fenced code```, pipe tables, and
 * "- " / "1. " lists. Deliberately dependency-free; if you later add
 * `react-markdown` + `remark-gfm` to package.json, swap this component out
 * for it without touching AiChatWidget.js (same `text` prop contract). */
export default function MarkdownLite({ text }) {
  if (!text) return null;
  const blocks = splitBlocks(text);
  return <div className="md-lite">{blocks.map((b, i) => <Block key={i} block={b} />)}</div>;
}

function splitBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) { code.push(lines[i]); i++; }
      i++; // skip closing fence
      blocks.push({ type: "code", content: code.join("\n") });
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line) && lines[i + 1] && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const tableLines = [line];
      i++;
      i++; // skip separator row
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { tableLines.push(lines[i]); i++; }
      blocks.push({ type: "table", content: parseTable(tableLines) });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const items = [];
      const ordered = /^\s*\d+\.\s+/.test(line);
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    if (/^#{1,4}\s+/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      blocks.push({ type: "heading", level, content: line.replace(/^#+\s+/, "") });
      i++;
      continue;
    }

    if (line.trim() === "") { i++; continue; }

    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^\s*[-*#|]/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "para", content: para.join(" ") });
  }
  return blocks;
}

function parseTable(lines) {
  const rows = lines.map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  return { header: rows[0], rows: rows.slice(1) };
}

function inline(text) {
  const parts = [];
  let remaining = text;
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`)/;
  let key = 0;
  while (remaining.length) {
    const m = remaining.match(pattern);
    if (!m) { parts.push(remaining); break; }
    if (m.index > 0) parts.push(remaining.slice(0, m.index));
    if (m[2] !== undefined) parts.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3] !== undefined) parts.push(<code key={key++} className="md-lite-inline-code">{m[3]}</code>);
    remaining = remaining.slice(m.index + m[0].length);
  }
  return parts;
}

function Block({ block }) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${Math.min(block.level + 3, 6)}`; // keep headings visually modest inside a chat bubble
      return <Tag className="md-lite-heading">{inline(block.content)}</Tag>;
    }
    case "code":
      return <pre className="md-lite-code-block"><code>{block.content}</code></pre>;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return <Tag className="md-lite-list">{block.items.map((it, idx) => <li key={idx}>{inline(it)}</li>)}</Tag>;
    }
    case "table":
      return (
        <div className="md-lite-table-wrap">
          <table className="md-lite-table">
            <thead><tr>{block.content.header.map((h, idx) => <th key={idx}>{inline(h)}</th>)}</tr></thead>
            <tbody>
              {block.content.rows.map((row, ridx) => (
                <tr key={ridx}>{row.map((cell, cidx) => <td key={cidx}>{inline(cell)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return <p className="md-lite-para">{inline(block.content)}</p>;
  }
}
