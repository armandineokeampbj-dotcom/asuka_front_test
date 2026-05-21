import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DOMPurify from "dompurify";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className = "" }: MarkdownMessageProps) {
  // Purify the markdown content to prevent XSS attacks
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "u",
      "a",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "hr",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "span",
      "div",
      "del",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel", "class"],
  });

  return (
    <div className={`markdown-content text-sm space-y-2 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children, ...props }) => (
            <h1 className="text-lg font-bold mt-3 mb-2 leading-snug" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-base font-bold mt-2 mb-1.5 leading-snug" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-sm font-bold mt-2 mb-1 leading-snug" {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="text-sm font-semibold mt-2 mb-1 leading-snug" {...props}>
              {children}
            </h4>
          ),
          h5: ({ children, ...props }) => (
            <h5 className="text-xs font-semibold mt-1.5 mb-1 leading-snug" {...props}>
              {children}
            </h5>
          ),
          h6: ({ children, ...props }) => (
            <h6 className="text-xs font-semibold mt-1.5 mb-1 leading-snug" {...props}>
              {children}
            </h6>
          ),

          // Text elements
          p: ({ children, ...props }) => (
            <p className="mb-2 leading-snug" {...props}>
              {children}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-bold" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic" {...props}>
              {children}
            </em>
          ),
          u: ({ children, ...props }) => (
            <u className="underline" {...props}>
              {children}
            </u>
          ),
          del: ({ children, ...props }) => (
            <del className="line-through" {...props}>
              {children}
            </del>
          ),

          // Lists
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside mb-2 space-y-1 pl-2" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1 pl-2" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-sm" {...props}>
              {children}
            </li>
          ),

          // Code
          code: ({ children, className, ...props }: any) =>
            className?.includes("language-") ? (
              <code className="block bg-muted/50 p-2 rounded text-xs font-mono overflow-x-auto mb-2 border border-border/40" {...props}>
                {children}
              </code>
            ) : (
              <code className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono border border-border/40" {...props}>
                {children}
              </code>
            ),
          pre: ({ children, ...props }) => (
            <pre className="bg-muted/50 p-3 rounded mb-2 overflow-x-auto border border-border/40 text-xs" {...props}>
              {children}
            </pre>
          ),

          // Blockquote
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-4 border-primary/40 pl-3 italic my-2 opacity-90" {...props}>
              {children}
            </blockquote>
          ),

          // Links
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-words font-medium"
              {...props}
            >
              {children}
            </a>
          ),

          // Horizontal rule
          hr: (props) => <hr className="my-2 border-t border-border/40" {...props} />,

          // Table
          table: ({ children, ...props }) => (
            <table className="border-collapse w-full text-xs mb-2 border border-border/40" {...props}>
              {children}
            </table>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-muted/50" {...props}>
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }) => (
            <tbody {...props}>{children}</tbody>
          ),
          th: ({ children, style, ...props }: any) => (
            <th
              className="border border-border/40 px-2 py-1 font-semibold text-left"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, style, ...props }: any) => (
            <td className="border border-border/40 px-2 py-1" {...props}>
              {children}
            </td>
          ),
          tr: ({ children, ...props }) => (
            <tr {...props}>{children}</tr>
          ),

          // Line break
          br: () => <br />,
        }}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  );
}

