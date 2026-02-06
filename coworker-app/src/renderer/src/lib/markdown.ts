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

export function renderMarkdown(content: string): string {
  if (!content.trim()) return "";
  const rawHtml = markdown.render(content);
  return DOMPurify.sanitize(rawHtml);
}
