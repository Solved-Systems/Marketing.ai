'use client'

import { useMemo } from 'react'

interface MessageContentProps {
  content: string
}

export function MessageContent({ content }: MessageContentProps) {
  const rendered = useMemo(() => {
    if (!content) return ''
    // Simple markdown-like parsing
    const html = content
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-[var(--accent-terminal)] hover:underline">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br />')

    return html
  }, [content])

  return (
    <div
      className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  )
}
