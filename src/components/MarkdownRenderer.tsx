import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="markdown-body text-sm leading-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, ...props }) => <p className="my-1" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="marker:text-slate-400" {...props} />,
          code: ({ inline, className, children, ...props }) => (
            inline ? (
              <code className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-[0.85em]" {...props}>{children}</code>
            ) : (
              <pre className="my-2 p-2 rounded bg-slate-900/90 text-slate-100 overflow-x-auto text-[0.85em]" {...props}>
                <code>{children}</code>
              </pre>
            )
          ),
          table: ({ node, ...props }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-slate-200/50 dark:bg-white/10" {...props} />,
          th: ({ node, ...props }) => (
            <th className="text-left font-semibold border border-slate-300/70 dark:border-white/10 px-2 py-1" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="align-top border border-slate-300/70 dark:border-white/10 px-2 py-1" {...props} />
          ),
          a: ({ node, ...props }) => <a className="text-blue-600 underline" target="_blank" rel="noreferrer" {...props} />,
          hr: ({ node, ...props }) => <hr className="my-3 border-slate-300/60" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-base font-semibold mt-2 mb-1" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-base font-semibold mt-2 mb-1" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-sm font-semibold mt-2 mb-1" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;

