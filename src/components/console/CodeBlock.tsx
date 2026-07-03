"use client";

const TS_KEYWORDS = /^(import|export|from|const|let|var|function|async|await|return|if|else|new|type|interface|default|try|catch|throw|of|in)\b/;
const SQL_KEYWORDS = /^(INSERT|INTO|SELECT|FROM|JOIN|ON|WHERE|AND|OR|NOT|RETURNING|VALUES|COUNT|NOW|UPDATE|SET|DELETE|CREATE|TABLE|INDEX)\b/i;

interface Token {
  text: string;
  cls: string;
}

function tokenize(line: string, language: string): Token[] {
  const keywords = language === "sql" ? SQL_KEYWORDS : TS_KEYWORDS;
  const tokens: Token[] = [];
  let rest = line;

  const patterns: [RegExp, string][] = [
    [/^(--[^\n]*|\/\/[^\n]*)/, "text-ghost italic"],
    [/^("[^"]*"|'[^']*'|`[^`]*`)/, "text-emerald-300/90"],
    [/^\$\d+/, "text-amber-300"],
    [/^\d+(\.\d+)?/, "text-amber-200/90"],
    [keywords, "text-cyan-300"],
    [/^[A-Za-z_]\w*/, "text-icy"],
    [/^\s+/, ""],
    [/^[^\sA-Za-z0-9]+/, "text-dim"],
  ];

  while (rest.length > 0) {
    let matched = false;
    for (const [re, cls] of patterns) {
      const m = rest.match(re);
      if (m && m[0].length > 0) {
        tokens.push({ text: m[0], cls });
        rest = rest.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ text: rest[0], cls: "" });
      rest = rest.slice(1);
    }
  }
  return tokens;
}

export default function CodeBlock({
  code,
  language = "ts",
  title,
  highlightLines = [],
}: {
  code: string;
  language?: string;
  title?: string;
  highlightLines?: number[];
}) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div className="overflow-hidden rounded-xl border border-line/70 bg-void/70">
      {title && (
        <div className="flex items-center justify-between border-b border-line/60 bg-panel/70 px-3 py-1.5">
          <span className="font-mono text-[11px] text-cyan-200/80">{title}</span>
          <span className="hud-label !text-[8.5px]">{language.toUpperCase()} · {lines.length} lines</span>
        </div>
      )}
      <pre className="overflow-x-auto p-3 font-mono text-[12.5px] leading-[1.65]">
        {lines.map((line, i) => {
          const hl = highlightLines.includes(i + 1);
          return (
            <div
              key={i}
              className={`flex ${hl ? "-mx-3 border-l-2 border-rose-400 bg-rose-400/[0.09] px-3" : ""}`}
            >
              <span className={`mr-3 w-6 shrink-0 text-right select-none ${hl ? "text-rose-300" : "text-ghost/60"}`}>{i + 1}</span>
              <span className="whitespace-pre">
                {tokenize(line, language).map((t, j) => (
                  <span key={j} className={t.cls}>{t.text}</span>
                ))}
              </span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}
