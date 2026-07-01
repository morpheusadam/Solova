import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { cn } from "~/lib/utils";

/** Sanitized markdown rendering (card descriptions, notes). */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "text-md leading-normal text-ink",
        "[&_a]:text-ink-link [&_a:hover]:text-ink-link-hover [&_a]:underline",
        "[&_code]:rounded-xs [&_code]:bg-surface-glass-subtle [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-sm [&_pre]:bg-surface-glass-subtle [&_pre]:p-3",
        "[&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold",
        "[&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:ps-5",
        "[&_blockquote]:border-s-2 [&_blockquote]:border-line-strong [&_blockquote]:ps-3 [&_blockquote]:text-ink-secondary",
        "[&>*+*]:mt-2",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
