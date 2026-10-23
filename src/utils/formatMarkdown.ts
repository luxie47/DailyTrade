/**
 * Lightweight, zero-dependency Markdown formatter for release notes.
 * Converts **bold**, *italic*, and `code` into sanitized inline HTML styles.
 */
export function formatMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #ffffff; font-weight: 700;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color: var(--text-secondary);">$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 3px; font-family: var(--font-mono); font-size: 11px; color: var(--color-bull); border: 1px solid rgba(0,230,118,0.2);">$1</code>')
    .replace(/^--+$/, '');
}
