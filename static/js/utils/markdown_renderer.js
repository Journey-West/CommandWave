/**
 * markdown_renderer.js
 * A lightweight Markdown parser and renderer for CommandWave
 */

// Deprecated: Use markdown-it implementation in markdown.js instead.
// This file is retained for reference only.

class MarkdownRenderer {
    /**
     * Parse and render Markdown to HTML
     * @param {string} markdown - Markdown string to render
     * @return {string} HTML output
     */
    static render(markdown) {
        if (!markdown) return '';
        
        // Process the markdown in steps
        let html = markdown;
        
        // Escape HTML
        html = this.escapeHtml(html);
        
        // Process code blocks
        html = this.processCodeBlocks(html);
        
        // Process headers
        html = this.processHeaders(html);
        
        // Process emphasis (bold, italic)
        html = this.processEmphasis(html);
        
        // Process lists
        html = this.processLists(html);
        
        // Process links
        html = this.processLinks(html);
        
        // Process paragraphs (do this last)
        html = this.processParagraphs(html);
        
        return html;
    }
    
    /**
     * Escape HTML special characters
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Process code blocks (```lang code ```)
     */
    static processCodeBlocks(markdown) {
        // Handle code blocks with language
        markdown = markdown.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            lang = lang || 'bash';
            return `<div class="code-block ${lang}"><div class="code-header">${lang}</div><pre><code class="language-${lang}">${code}</code></pre></div>`;
        });
        
        // Handle inline code
        markdown = markdown.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        return markdown;
    }
    
    /**
     * Process headers (# Header)
     */
    static processHeaders(markdown) {
        // Handle headers
        markdown = markdown.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        markdown = markdown.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        markdown = markdown.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        
        return markdown;
    }
    
    /**
     * Process emphasis (bold, italic)
     */
    static processEmphasis(markdown) {
        // Handle bold text
        markdown = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        markdown = markdown.replace(/__(.*?)__/g, '<strong>$1</strong>');
        
        // Handle italic text
        markdown = markdown.replace(/\*(.*?)\*/g, '<em>$1</em>');
        markdown = markdown.replace(/_(.*?)_/g, '<em>$1</em>');
        
        return markdown;
    }
    
    /**
     * Process lists (- item, 1. item)
     */
    static processLists(markdown) {
        // Handle unordered lists
        let inList = false;
        let listLines = [];
        
        // Process unordered lists
        markdown = markdown.replace(/^[\s]*?- (.*$)/gm, (match, item) => {
            if (!inList) {
                inList = true;
                return `<ul><li>${item}</li>`;
            } else {
                return `<li>${item}</li>`;
            }
        });
        
        // Close any open lists
        if (inList) {
            markdown += '</ul>';
            inList = false;
        }
        
        // Process ordered lists (basic implementation)
        inList = false;
        markdown = markdown.replace(/^[\s]*?(\d+)\. (.*$)/gm, (match, num, item) => {
            if (!inList) {
                inList = true;
                return `<ol><li>${item}</li>`;
            } else {
                return `<li>${item}</li>`;
            }
        });
        
        // Close any open ordered lists
        if (inList) {
            markdown += '</ol>';
        }
        
        return markdown;
    }
    
    /**
     * Process links [text](url)
     */
    static processLinks(markdown) {
        return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    }
    
    /**
     * Process paragraphs
     */
    static processParagraphs(markdown) {
        // Split by double newlines, which represent paragraph breaks
        const paragraphs = markdown.split(/\n\n+/);
        
        // Process each paragraph
        return paragraphs.map(para => {
            // Skip if it's already wrapped in HTML tag
            if (para.match(/^<[a-z][\s\S]*>/i)) {
                return para;
            }
            
            // Skip if it's empty
            if (!para.trim()) {
                return '';
            }
            
            // Wrap in paragraph tag
            return `<p>${para}</p>`;
        }).join('\n\n');
    }
}

export default undefined;
