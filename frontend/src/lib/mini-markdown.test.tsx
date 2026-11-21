import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMarkdown } from "./mini-markdown";

const html = (md: string) => renderToStaticMarkup(<>{renderMarkdown(md)}</>);

describe("mini markdown", () => {
  it("renders lists, headings and inline styles", () => {
    const out = html("## Top areas\n- **Marais**: walkable\n- *Canal* `€1,800`\n\n1. one\n2. two");
    expect(out).toContain("<ul");
    expect(out).toContain("<ol");
    expect(out).toContain("<strong");
    expect(out).toContain("<em>Canal</em>");
    expect(out).toContain("<code");
    expect(out).toContain("Top areas");
    expect(out).not.toContain("##");
  });

  it("never injects raw HTML", () => {
    const out = html('<img src=x onerror="alert(1)"> **hi**');
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
  });

  it("keeps line breaks inside a paragraph", () => {
    expect(html("a\nb")).toContain("a<br/>b");
  });
});
