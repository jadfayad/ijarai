import { Fragment, type ReactNode } from "react";

/**
 * Minimal, safe Markdown for assistant replies: paragraphs, headings (#–###),
 * bullet and numbered lists, **bold**, *italic*, `code`. Builds React
 * elements only — raw HTML in the text is rendered as text, never injected.
 */
export function renderMarkdown(text: string): ReactNode {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push(
        <p key={key++} className="font-semibold text-white">
          {inline(heading[2])}
        </p>,
      );
      i++;
      continue;
    }

    const listMatch = (l: string) => /^\s*([-*•]|\d+[.)])\s+/.exec(l);
    if (listMatch(line)) {
      const ordered = /\d/.test(listMatch(line)![1]);
      const items: ReactNode[] = [];
      while (i < lines.length && listMatch(lines[i])) {
        items.push(<li key={items.length}>{inline(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>);
        i++;
      }
      blocks.push(
        ordered ? (
          <ol key={key++} className="list-decimal space-y-1 pl-5">
            {items}
          </ol>
        ) : (
          <ul key={key++} className="list-disc space-y-1 pl-5">
            {items}
          </ul>
        ),
      );
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !listMatch(lines[i]) && !/^#{1,3}\s/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++}>
        {para.map((l, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(l)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return <div className="space-y-2">{blocks}</div>;
}

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="rounded bg-surface-strong px-1 py-0.5 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      if (part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
