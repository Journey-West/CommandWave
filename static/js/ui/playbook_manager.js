/**
 * playbook_manager.js - UI module for playbook management
 * Handles playbook UI interactions, display, and state management
 */

import playbookAPI from '../api/playbook_api.js';
import { renderMarkdownWithVars } from '../utils/markdown.js';
import VariableManager from './variable_manager.js';

class PlaybookManager {
    constructor() {
        this.activePlaybook = null;
        this.modalController = null;
        this.playbooksById = {}; // Store playbook data by ID
        this.init();
        
        // Make this instance globally available for event handlers
        window.playbookManager = this;
        console.log('PlaybookManager instance registered as window.playbookManager');
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
        
        // Initialize any existing playbooks that were loaded from the server
        this.initializeExistingPlaybooks();
        
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
        // Always use NotificationManager directly, bypassing the modal controller
        if (window.CommandWave && window.CommandWave.notificationManager) {
            window.CommandWave.notificationManager.show(title, message, type);
        } else if (this.modalController) {
            // Fallback to modal controller if available
            this.modalController.showNotification(title, message, type);
        } else {
            // Last resort - log to console but do NOT use alert
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
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

        // Store playbook data for future updates
        if (playbook && playbook.id) {
            this.playbooksById[playbook.id] = playbook;
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
     * Get playbook data by ID
     */
    getPlaybookById(id) {
        return this.playbooksById[id] || null;
    }

    /**
     * Update all rendered playbooks with latest variable values
     */
    updateAllRenderedPlaybooks() {
        console.log('Updating all rendered playbooks with latest variable values');
        
        const playbooks = document.querySelectorAll('.playbook');
        console.log(`Found ${playbooks.length} playbooks to update`);
        
        playbooks.forEach(playbookEl => {
            // Extract playbook ID
            const playbookId = playbookEl.id.replace('playbook-', '');
            console.log(`Processing playbook: ${playbookId}`);
            
            // Get playbook data
            const playbookData = this.getPlaybookById(playbookId);
            
            if (playbookData) {
                console.log(`Found data for playbook: ${playbookId}`);
                
                // Find content element to update
                const contentEl = playbookEl.querySelector('.playbook-content');
                if (contentEl) {
                    // Re-render content with latest variables
                    const newContent = this.renderPlaybookContent(playbookData);
                    contentEl.innerHTML = newContent;
                    console.log(`Updated content for playbook: ${playbookId}`);
                } else {
                    console.warn(`No content element found for playbook: ${playbookId}`);
                }
            } else {
                console.warn(`No data found for playbook: ${playbookId}`);
            }
        });
    }

    /**
     * Initialize existing playbooks that might already be in the DOM
     */
    initializeExistingPlaybooks() {
        const playbooks = document.querySelectorAll('.playbook');
        console.log(`Found ${playbooks.length} existing playbooks to initialize`);
        
        playbooks.forEach(playbookEl => {
            // Extract playbook ID from element ID
            const rawId = playbookEl.id;
            if (rawId && rawId.startsWith('playbook-')) {
                const playbookId = rawId.replace('playbook-', '');
                
                // Try to find and extract playbook data from the DOM
                const titleEl = playbookEl.querySelector('.playbook-header h3');
                const contentEl = playbookEl.querySelector('.playbook-content');
                
                if (titleEl && contentEl) {
                    const title = titleEl.textContent;
                    const id = playbookId;
                    const content = this.extractPlaybookContent(contentEl);
                    
                    console.log(`Initializing existing playbook: ${id} - ${title}`);
                    
                    // Store playbook data
                    this.playbooksById[id] = {
                        id: id,
                        title: title,
                        content: content
                    };
                }
            }
        });
    }
    
    /**
     * Extract playbook content from the rendered HTML
     * This is a fallback when we don't have the original markdown
     */
    extractPlaybookContent(contentEl) {
        // This is a simplification - the ideal would be to have the original markdown
        return contentEl.innerHTML;
    }

    /**
     * Render the playbook content as HTML, with variable substitution in code blocks
     * @param {Object} playbook - Playbook data
     * @returns {string} HTML representation of playbook content
     */
    renderPlaybookContent(playbook) {
        console.log(`Rendering playbook content for: ${playbook.id}`);
        
        // Get the playbook content
        const content = playbook.content || '';
        
        // Get current variables for substitution
        let variables = {};
        const variableManager = window.variableManager; 
        
        if (variableManager && typeof variableManager.getVariableMap === 'function') {
            variables = variableManager.getVariableMap();
            console.log('Variables for substitution:', variables);
        } else {
            console.warn('VariableManager not available for substitution');
        }
        
        // Render with variable substitution in code blocks
        return renderMarkdownWithVars(content, variables);
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
        
        // Add delete button with hold-to-delete functionality
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = 'Hold to Delete Playbook';
        
        // Add progress container and bar
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressContainer.appendChild(progressBar);
        
        // Add countdown element
        const countdown = document.createElement('div');
        countdown.className = 'countdown';
        countdown.textContent = '3';
        
        // Append progress elements to delete button
        deleteBtn.appendChild(progressContainer);
        deleteBtn.appendChild(countdown);
        
        // Setup the hold-to-delete functionality
        this.setupHoldToDelete(deleteBtn, progressBar, countdown, playbook.id);
        
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
     * @deprecated - This is no longer used directly, replaced by hold-to-delete
     */
    async deletePlaybook(id) {
        console.log(`Delete playbook: ${id}`);
        // This method is retained for backward compatibility
        // The actual deletion happens through the hold-to-delete mechanism
    }

    /**
     * Setup hold-to-delete functionality for a delete button
     * @param {HTMLElement} button - Delete button element
     * @param {HTMLElement} progressBar - Progress bar element
     * @param {HTMLElement} countdownEl - Countdown element
     * @param {string} playbookId - ID of the playbook to delete
     */
    setupHoldToDelete(button, progressBar, countdownEl, playbookId) {
        let holdTimer = null;
        let startTime = 0;
        const totalHoldTime = 3000; // 3 seconds to delete
        
        // When mouse down on delete button, start the hold timer
        button.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startTime = Date.now();
            button.classList.add('deleting');
            
            // Start the animation
            holdTimer = setInterval(() => {
                const elapsedTime = Date.now() - startTime;
                const percentage = Math.min((elapsedTime / totalHoldTime) * 100, 100);
                
                // Update progress bar and countdown
                this.updateDeleteProgress(progressBar, countdownEl, percentage, totalHoldTime);
                
                // If held for the required time, trigger delete
                if (percentage >= 100) {
                    this.completeDelete(button, holdTimer, playbookId);
                }
            }, 50);
        });
        
        // If mouse up or leave before completion, cancel the delete
        const cancelDelete = () => {
            if (holdTimer) {
                clearInterval(holdTimer);
                holdTimer = null;
                button.classList.remove('deleting');
                progressBar.style.width = '0%';
                countdownEl.textContent = '3';
            }
        };
        
        button.addEventListener('mouseup', cancelDelete);
        button.addEventListener('mouseleave', cancelDelete);
        
        // Add click event to stop propagation and prevent header click
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });
    }

    /**
     * Update the delete button progress
     * @param {HTMLElement} progressBar - Progress bar element
     * @param {HTMLElement} countdownEl - Countdown element
     * @param {number} percentage - Current percentage (0-100)
     * @param {number} totalTime - Total hold time in ms
     */
    updateDeleteProgress(progressBar, countdownEl, percentage, totalTime) {
        // Update progress bar width
        progressBar.style.width = `${percentage}%`;
        
        // Update countdown text (3...2...1...)
        const remainingTime = Math.ceil((totalTime - (percentage / 100 * totalTime)) / 1000);
        countdownEl.textContent = remainingTime;
    }

    /**
     * Complete the delete operation when hold is complete
     * @param {HTMLElement} button - Delete button
     * @param {number} holdTimer - Interval timer ID
     * @param {string} playbookId - ID of the playbook to delete
     */
    async completeDelete(button, holdTimer, playbookId) {
        clearInterval(holdTimer);
        button.classList.remove('deleting');
        button.classList.add('delete-confirmed');
        
        try {
            // Get the playbook element
            const playbookElement = document.getElementById(`playbook-${this.sanitizeId(playbookId)}`);
            if (!playbookElement) {
                throw new Error(`Playbook element not found for ID: ${playbookId}`);
            }
            
            // Get the playbook title for the notification message
            const titleElement = playbookElement.querySelector('h3');
            const playbookTitle = titleElement ? titleElement.textContent : 'this playbook';
            
            // Show loading state
            playbookElement.classList.add('deleting');
            
            // Call the API to delete the playbook
            await playbookAPI.deletePlaybook(playbookId);
            
            // Remove the playbook element from the DOM with animation
            playbookElement.classList.add('deleted');
            setTimeout(() => {
                playbookElement.remove();
            }, 300); // Match this with the CSS transition time
            
            // Show success notification
            this.showNotification('Success', `Playbook "${playbookTitle}" has been deleted.`, 'success');
        } catch (error) {
            console.error(`Error deleting playbook ${playbookId}:`, error);
            this.showNotification('Error', `Failed to delete playbook: ${error.message}`, 'error');
            
            // Reset the button
            button.classList.remove('delete-confirmed');
        }
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

// Listen for variable changes and re-render playbook content
// Assumes PlaybookManager is a singleton or accessible as 'playbookManager'
document.addEventListener('variableValueChanged', () => {
    if (window.playbookManager && typeof window.playbookManager.updateAllRenderedPlaybooks === 'function') {
        window.playbookManager.updateAllRenderedPlaybooks();
    }
});

// Export as singleton
export default PlaybookManager;
