/** Renders admin-authored plain text safely: blank lines become paragraphs, lines starting with "## " become headings. No HTML is interpreted. */
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim());
  return (
    <div className="prose-store">
      {blocks.map((b, i) =>
        b.startsWith("## ") ? (
          <h2 key={i}>{b.slice(3)}</h2>
        ) : (
          <p key={i} className="whitespace-pre-line">
            {b}
          </p>
        ),
      )}
    </div>
  );
}
