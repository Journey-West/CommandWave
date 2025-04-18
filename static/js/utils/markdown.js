// markdown.js
// Modular Markdown rendering utility for CommandWave using markdown-it (CDN global)
// Usage: import { renderMarkdown, renderMarkdownWithVars } from './markdown.js';
//        const html = renderMarkdown(markdownText);
//        const htmlWithVars = renderMarkdownWithVars(markdownText, variables);

// Use the global window.markdownit provided by CDN
const md = window.markdownit({
  html: false,      // Disallow raw HTML for security
  linkify: true,    // Autolink URLs
  typographer: true // Smart quotes, dashes, etc.
});

/**
 * Render Markdown to HTML using markdown-it
 * @param {string} markdown - Markdown input
 * @returns {string} HTML output (safe to inject as innerHTML)
 */
export function renderMarkdown(markdown) {
  if (!markdown) return '';
  return md.render(markdown);
}

/**
 * Render Markdown to HTML, substituting $Variables and ${Variables} in code blocks
 * @param {string} markdown - Markdown input
 * @param {Object} variables - {VAR: value} map
 * @returns {string} HTML output with variables substituted in code blocks
 */
export function renderMarkdownWithVars(markdown, variables) {
  if (!markdown) return '';
  if (!variables) return renderMarkdown(markdown);

  // Track which variables were substituted and their values
  const substitutions = [];

  /**
   * Substitute variables in code block text
   * @param {string} code - Code block content
   * @param {Object} variables - Variables {name: value} mapping
   * @returns {string} Code with variables substituted
   */
  function substituteVars(code, variables) {
    console.log('Substituting variables in code block:', code.substring(0, 50) + (code.length > 50 ? '...' : ''));
    console.log('Available variables:', Object.keys(variables));
    
    // ${Var} syntax
    code = code.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, varName) => {
      const hasVar = variables[varName] !== undefined && variables[varName] !== "";
      if (hasVar) {
        console.log(`Substituting ${varName} with "${variables[varName]}"`);
        // Add to our substitutions list with a unique marker
        const marker = `__VAR_SUBST_${substitutions.length}__`;
        substitutions.push({
          marker: marker,
          value: variables[varName]
        });
        return marker;
      }
      return m;
    });
    
    // $Var syntax (not followed by {)
    code = code.replace(/\$([A-Za-z_][A-Za-z0-9_]*)\b/g, (m, varName) => {
      const hasVar = variables[varName] !== undefined && variables[varName] !== "";
      if (hasVar) {
        console.log(`Substituting ${varName} with "${variables[varName]}"`);
        // Add to our substitutions list with a unique marker
        const marker = `__VAR_SUBST_${substitutions.length}__`;
        substitutions.push({
          marker: marker,
          value: variables[varName]
        });
        return marker;
      }
      return m;
    });
    
    return code;
  }

  // Fenced code blocks: ```lang ... ```
  markdown = markdown.replace(/```([\w]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const replaced = substituteVars(code, variables);
    return `\`\`\`${lang}\n${replaced}\`\`\``;
  });
  
  // Inline code: `...`
  markdown = markdown.replace(/`([^`]+)`/g, (match, code) => {
    const replaced = substituteVars(code, variables);
    return '`' + replaced + '`';
  });
  
  // Render the markdown to HTML
  let html = renderMarkdown(markdown);
  
  // Post-process: replace our markers with highlighted spans
  substitutions.forEach(subst => {
    html = html.replace(
      new RegExp(subst.marker, 'g'), 
      `<span class="highlighted-var" style="color:inherit !important; background:none !important;">${subst.value}</span>`
    );
  });
  
  return html;
}
