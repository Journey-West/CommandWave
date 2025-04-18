// markdown.js
// Modular Markdown rendering utility for CommandWave using markdown-it (CDN global)
// Usage: import { renderMarkdown, renderMarkdownWithVars } from './markdown.js';
//        const html = renderMarkdown(markdownText);
//        const htmlWithVars = renderMarkdownWithVars(markdownText, variables);

// Use the global window.markdownit provided by CDN
const md = window.markdownit({
  html: false,      // Disallow raw HTML for security
  linkify: true,    // Autolink URLs
  typographer: true, // Smart quotes, dashes, etc.
  highlight: function(str, lang) {
    // Use Prism for syntax highlighting if available
    if (window.Prism && lang && Prism.languages[lang]) {
      try {
        const highlighted = Prism.highlight(str, Prism.languages[lang], lang);
        return highlighted;
      } catch (e) {
        console.error('Prism highlighting error:', e);
      }
    }
    
    // Fallback to no highlighting
    return '';
  }
});

/**
 * Render Markdown to HTML using markdown-it
 * @param {string} markdown - Markdown input
 * @returns {string} HTML output (safe to inject as innerHTML)
 */
export function renderMarkdown(markdown) {
  if (!markdown) return '';
  
  // Store the default renderer
  const defaultRender = md.renderer.rules.fence;
  
  // Override the fence renderer to add copy and execute buttons
  md.renderer.rules.fence = function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const code = token.content.trim();
    const language = token.info.trim();
    
    // Get the rendered HTML for the code block using the default renderer
    let renderedCode = defaultRender ? defaultRender(tokens, idx, options, env, self) : 
                     self.renderToken(tokens, idx, options);
    
    // Skip adding buttons for empty code blocks
    if (!code) return renderedCode;
    
    // Skip if it's not a shell/bash code block (only add execute for command blocks)
    const isExecutable = language === 'bash' || 
                         language === 'shell' || 
                         language === 'sh' || 
                         language === 'zsh' || 
                         language === 'console' || 
                         language === 'cmd';
    
    // Create buttons HTML
    const copyButtonHtml = `<button class="code-action-btn copy-btn">
      <div class="tooltip">Copy</div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="8" y="8" width="14" height="14" rx="2"></rect>
        <path d="M4 16h-1a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>`;
    
    const executeButtonHtml = isExecutable ? 
      `<button class="code-action-btn execute-btn">
        <div class="tooltip">Execute</div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polygon points="6 4 20 12 6 20 6 4"></polygon>
        </svg>
      </button>` : '';
    
    // Combine the buttons into a button group
    const actionsHtml = `<div class="code-actions">${copyButtonHtml}${executeButtonHtml}</div>`;

    // Create language indicator
    const displayLang = language || 'txt';
    const langClass = isExecutable ? 'bash' : displayLang;
    const langIndicator = `<div class="code-language-indicator ${langClass}">${displayLang}</div>`;
    
    // Create header bar
    const headerHtml = `<div class="code-block-header">${langIndicator}</div>`;
    
    // Add a wrapper with the header, language indicator and buttons
    return `<div class="code-block-wrapper" data-language="${language}">${headerHtml}${actionsHtml}${renderedCode}</div>`;
  };
  
  const html = md.render(markdown);
  
  // Reset at the end of rendering
  md.renderer.rules.fence = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
  
  return html;
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

  // Store the default renderer
  const originalFence = md.renderer.rules.fence;
  
  // Override the fence renderer to add copy and execute buttons
  md.renderer.rules.fence = function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const code = token.content.trim();
    const language = token.info.trim();
    
    // Get the rendered HTML for the code block using the default renderer
    const renderedCode = originalFence ? originalFence(tokens, idx, options, env, self) : 
                        self.renderToken(tokens, idx, options);
    
    // Skip adding buttons for empty code blocks
    if (!code) return renderedCode;
    
    // Skip if it's not a shell/bash code block (only add execute for command blocks)
    const isExecutable = language === 'bash' || 
                        language === 'shell' || 
                        language === 'sh' || 
                        language === 'zsh' || 
                        language === 'console' || 
                        language === 'cmd';
    
    // Create buttons HTML
    const copyButtonHtml = `<button class="code-action-btn copy-btn">
      <div class="tooltip">Copy</div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="8" y="8" width="14" height="14" rx="2"></rect>
        <path d="M4 16h-1a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>`;
    
    const executeButtonHtml = isExecutable ? 
      `<button class="code-action-btn execute-btn">
        <div class="tooltip">Execute</div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polygon points="6 4 20 12 6 20 6 4"></polygon>
        </svg>
      </button>` : '';
    
    // Combine the buttons into a button group
    const actionsHtml = `<div class="code-actions">${copyButtonHtml}${executeButtonHtml}</div>`;
    
    // Create language indicator
    const displayLang = language || 'txt';
    const langClass = isExecutable ? 'bash' : displayLang;
    const langIndicator = `<div class="code-language-indicator ${langClass}">${displayLang}</div>`;
    
    // Create header bar
    const headerHtml = `<div class="code-block-header">${langIndicator}</div>`;
    
    // Add a wrapper with the header, language indicator and buttons
    return `<div class="code-block-wrapper" data-language="${language}">${headerHtml}${actionsHtml}${renderedCode}</div>`;
  };
  
  // Render the markdown to HTML
  let html = md.render(markdown);
  
  // Reset the renderer to its original state
  md.renderer.rules.fence = originalFence;
  
  // Post-process: replace our markers with highlighted spans
  substitutions.forEach(subst => {
    html = html.replace(
      new RegExp(subst.marker, 'g'), 
      `<span class="highlighted-var" style="color:inherit !important; background:none !important;">${subst.value}</span>`
    );
  });
  
  return html;
}
