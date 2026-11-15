import stylelint from "stylelint";
const ruleName = "shelf/tokens-only";
export const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (value) => "Use design tokens: " + value,
});
const rule = () => (root, result) => {
  const isTokens = /(?:^|[/\\])tokens\.css$/.test(
    root.source?.input.file || "",
  );
  root.walkDecls((decl) => {
    const value = decl.value;
    const badColor =
      /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/i.test(
        value,
      );
    const badEffect =
      /(?:^|-)backdrop-filter$/i.test(decl.prop) ||
      /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/i.test(value);
    const dropShadow = /drop-shadow\s*\(/i.test(value);
    const badShadow =
      /shadow$/i.test(decl.prop) &&
      !(decl.prop === "box-shadow" && value === "var(--elevation)");
    if (
      dropShadow ||
      badEffect ||
      (!isTokens && (badColor || badShadow)) ||
      (isTokens && badShadow && !decl.prop.startsWith("--"))
    )
      stylelint.utils.report({
        ruleName,
        result,
        node: decl,
        message: messages.rejected(decl.toString()),
      });
  });
};
rule.ruleName = ruleName;
rule.messages = messages;
export default stylelint.createPlugin(ruleName, rule);
