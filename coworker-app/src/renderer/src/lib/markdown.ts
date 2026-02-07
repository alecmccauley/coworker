import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  breaks: true,
  linkify: true,
  html: false
});

markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const existingTargetIndex = token.attrIndex("target");
  const existingRelIndex = token.attrIndex("rel");

  if (existingTargetIndex < 0) {
    token.attrPush(["target", "_blank"]);
  } else {
    token.attrs![existingTargetIndex][1] = "_blank";
  }

  if (existingRelIndex < 0) {
    token.attrPush(["rel", "noreferrer noopener"]);
  } else {
    token.attrs![existingRelIndex][1] = "noreferrer noopener";
  }

  return self.renderToken(tokens, index, options);
};

const MENTION_REGEX = /@\{coworker:([^|}]+)\|([^}]+)\}/g;

export function renderMarkdown(content: string): string {
  if (!content.trim()) return "";
  let rawHtml = markdown.render(content);
  rawHtml = rawHtml.replace(MENTION_REGEX, (_match, _id: string, name: string) => {
    return `<span class="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent-foreground">@${name}</span>`;
  });
  return DOMPurify.sanitize(rawHtml);
}
