/**
 * playbook_manager.js - UI module for playbook management
 * Handles playbook UI interactions, display, and state management
 */

import playbookAPI from '../api/playbook_api.js';
import MarkdownRenderer from '../utils/markdown_renderer.js';

class PlaybookManager {
    constructor() {
        this.activePlaybook = null;
        this.modalController = null;
        this.init();
    }

    /**
     * Initialize the playbook manager
     */
    init() {
        // Get reference to modal controller from global scope
        if (window.CommandWave && window.CommandWave.modalController) {
            this.modalController = window.CommandWave.modalController;
        }
        
        this.setupEventListeners();
        console.log('PlaybookManager initialized');
    }

    /**
     * Setup event listeners for playbook UI elements
     */
    setupEventListeners() {
        // Upload playbook button
        const uploadInput = document.getElementById('uploadPlaybook');
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => this.handlePlaybookUpload(e));
            console.log('Registered upload playbook listener');
        } else {
            console.warn('Upload playbook input not found');
        }

        // Create new playbook button
        const createBtn = document.getElementById('createPlaybookBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createNewPlaybook());
        }

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => this.handleSearch(e.target.value), 300));
        }

        // Clear search button
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => this.clearSearch());
        }
    }

    /**
     * Show a notification to the user
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    showNotification(title, message, type = 'info') {
        if (this.modalController) {
            this.modalController.showNotification(title, message, type);
        } else {
            // Fallback if modal controller is not available
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
            alert(`${title}: ${message}`);
        }
    }

    /**
     * Handle playbook file upload
     * @param {Event} event - The change event from file input
     */
    async handlePlaybookUpload(event) {
        console.log('Upload playbook triggered');
        const file = event.target.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        // Validate file type (Markdown only)
        if (!file.name.toLowerCase().endsWith('.md')) {
            this.showNotification('Error', 'Only Markdown (.md) files are supported.', 'error');
            event.target.value = null; // Clear the input
            return;
        }

        try {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                const content = e.target.result;
                console.log(`Read file content (${content.length} bytes)`);
                
                try {
                    // Call the API to import the playbook
                    console.log('Calling importPlaybook API');
                    const response = await playbookAPI.importPlaybook(content, file.name);
                    console.log('API response:', response);
                    
                    // Display the newly uploaded playbook
                    this.displayPlaybook(response);
                    
                    this.showNotification('Success', `Playbook "${file.name}" uploaded successfully!`, 'success');
                } catch (error) {
                    console.error('Error importing playbook:', error);
                    this.showNotification('Error', `Failed to import playbook: ${error.message}`, 'error');
                }
            };
            
            reader.onerror = () => {
                console.error('Error reading file');
                this.showNotification('Error', 'Failed to read the file.', 'error');
            };
            
            console.log('Starting file read');
            reader.readAsText(file);
        } catch (error) {
            console.error('Error handling playbook upload:', error);
            this.showNotification('Error', `Upload failed: ${error.message}`, 'error');
        } finally {
            // Clear the input to allow uploading the same file again
            event.target.value = null;
        }
    }

    /**
     * Create a new empty playbook
     */
    createNewPlaybook() {
        // New playbook creation logic will be implemented here
        console.log('Create new playbook clicked');
    }

    /**
     * Handle playbook search
     * @param {string} query - The search query
     */
    async handleSearch(query) {
        if (!query || query.length < 2) {
            this.clearSearch();
            return;
        }

        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;
        
        searchResults.innerHTML = '<div class="search-result-item">Searching...</div>';
        searchResults.style.display = 'block';
        
        try {
            const results = await playbookAPI.searchPlaybooks(query);
            
            if (results && results.length > 0) {
                searchResults.innerHTML = results.map(result => this.createSearchResultItem(result, query)).join('');
                
                // Add click event listeners to search results
                document.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        this.loadPlaybookFromSearch(item.dataset.filename);
                    });
                });
            } else {
                searchResults.innerHTML = '<div class="search-result-item">No results found.</div>';
            }
        } catch (error) {
            console.error('Error searching playbooks:', error);
            searchResults.innerHTML = '<div class="search-result-item">Error searching playbooks.</div>';
        }
    }

    /**
     * Create a search result item HTML
     * @param {Object} result - Search result object
     * @param {string} query - Search query for highlighting
     * @returns {string} HTML for search result item
     */
    createSearchResultItem(result, query) {
        return `
            <div class="search-result-item" data-filename="${result.filename}">
                <div class="result-header">
                    <span class="filename">${result.filename}</span>
                    <span class="line-number">Line ${result.line_number}</span>
                </div>
                <div class="result-line-box">
                    <span class="result-line">${this.highlightQuery(result.line, query)}</span>
                </div>
            </div>
        `;
    }

    /**
     * Highlight the search query in the result text
     * @param {string} text - Text to highlight in
     * @param {string} query - Query to highlight
     * @returns {string} HTML with highlighted query
     */
    highlightQuery(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }

    /**
     * Load a playbook from search results
     * @param {string} filename - Filename of the playbook to load
     */
    async loadPlaybookFromSearch(filename) {
        try {
            const playbook = await playbookAPI.getPlaybook(filename);
            this.displayPlaybook(playbook);
            this.clearSearch();
        } catch (error) {
            console.error('Error loading playbook from search:', error);
            this.showNotification('Error', `Failed to load playbook: ${error.message}`, 'error');
        }
    }

    /**
     * Clear search input and results
     */
    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        
        if (searchInput) {
            searchInput.value = '';
        }
        
        if (searchResults) {
            searchResults.style.display = 'none';
            searchResults.innerHTML = '';
        }
    }

    /**
     * Display a playbook in the UI
     * @param {Object} playbook - Playbook data
     */
    displayPlaybook(playbook) {
        console.log('Displaying playbook:', playbook);
        const playbooksContainer = document.getElementById('playbooks');
        if (!playbooksContainer) {
            console.error('Playbooks container not found');
            return;
        }

        // Check if playbook already exists in the DOM
        const existingPlaybook = document.getElementById(`playbook-${this.sanitizeId(playbook.id)}`);
        if (existingPlaybook) {
            // Update existing playbook
            this.updatePlaybookElement(existingPlaybook, playbook);
        } else {
            // Create new playbook element
            const playbookElement = this.createPlaybookElement(playbook);
            playbooksContainer.appendChild(playbookElement);
        }

        this.activePlaybook = playbook.id;
    }

    /**
     * Create DOM element for a playbook
     * @param {Object} playbook - Playbook data
     * @returns {HTMLElement} Playbook element
     */
    createPlaybookElement(playbook) {
        const playbookElement = document.createElement('div');
        playbookElement.className = 'playbook';
        playbookElement.id = `playbook-${this.sanitizeId(playbook.id)}`;
        
        // Playbook header
        const header = document.createElement('div');
        header.className = 'playbook-header';
        
        const title = document.createElement('h3');
        title.textContent = playbook.title || playbook.filename;
        
        const controls = document.createElement('div');
        controls.className = 'playbook-controls';
        
        // Add edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Edit Playbook';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the header click
            this.editPlaybook(playbook.id);
        });
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = 'Delete Playbook';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the header click
            this.deletePlaybook(playbook.id);
        });
        
        controls.appendChild(editBtn);
        controls.appendChild(deleteBtn);
        
        header.appendChild(title);
        header.appendChild(controls);
        
        // Add click event to header for expand/collapse
        header.addEventListener('click', () => {
            playbookElement.classList.toggle('expanded');
        });
        
        // Playbook content
        const content = document.createElement('div');
        content.className = 'playbook-content';
        content.innerHTML = this.renderPlaybookContent(playbook);
        
        playbookElement.appendChild(header);
        playbookElement.appendChild(content);
        
        // Auto-expand the playbook on creation
        setTimeout(() => {
            playbookElement.classList.add('expanded');
        }, 100);
        
        return playbookElement;
    }

    /**
     * Update an existing playbook element
     * @param {HTMLElement} element - Existing playbook element
     * @param {Object} playbook - Updated playbook data
     */
    updatePlaybookElement(element, playbook) {
        const titleElement = element.querySelector('h3');
        if (titleElement) {
            titleElement.textContent = playbook.title || playbook.filename;
        }
        
        const contentElement = element.querySelector('.playbook-content');
        if (contentElement) {
            contentElement.innerHTML = this.renderPlaybookContent(playbook);
        }
    }

    /**
     * Edit a playbook
     * @param {string} id - Playbook ID to edit
     */
    editPlaybook(id) {
        console.log(`Edit playbook: ${id}`);
        // Will be implemented in a future update
    }

    /**
     * Delete a playbook
     * @param {string} id - Playbook ID to delete
     */
    deletePlaybook(id) {
        console.log(`Delete playbook: ${id}`);
        // Will be implemented in a future update
    }

    /**
     * Render the playbook content as HTML
     * @param {Object} playbook - Playbook data
     * @returns {string} HTML representation of playbook content
     */
    renderPlaybookContent(playbook) {
        // Get the playbook content
        const content = playbook.content || '';
        
        // Use the markdown renderer to convert it to HTML
        return MarkdownRenderer.render(content);
    }

    /**
     * Escape HTML special characters
     * @param {string} html - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Sanitize a string for use as an HTML ID
     * @param {string} id - ID to sanitize
     * @returns {string} Sanitized ID
     */
    sanitizeId(id) {
        return String(id).replace(/[^a-z0-9]/gi, '-');
    }

    /**
     * Debounce function to limit how often a function is called
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
}

// Export as singleton
export default PlaybookManager;
