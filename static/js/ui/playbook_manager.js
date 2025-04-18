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
        this.activeEditableCodeBlock = null;
        this.originalCodeContent = '';
        this.originalCodeBlock = '';
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
        
        // Global delegate event listeners for code block buttons
        document.addEventListener('click', (e) => {
            // Handle copy button clicks
            if (e.target.closest('.copy-btn')) {
                this.handleCopyButtonClick(e);
            }
            
            // Handle execute button clicks
            if (e.target.closest('.execute-btn')) {
                this.handleExecuteButtonClick(e);
            }
            
            // Handle click outside of an editable code block to save it
            if (this.activeEditableCodeBlock && 
                !e.target.closest('.code-editable') && 
                !e.target.closest('.code-edit-actions')) {
                this.saveEditableCodeBlock();
            }
        });
        
        // Double-click event for code blocks to make them editable
        document.addEventListener('dblclick', (e) => {
            const codeBlock = e.target.closest('.code-block-wrapper');
            if (codeBlock && !codeBlock.classList.contains('editing')) {
                this.makeCodeBlockEditable(codeBlock);
            }
        });
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
                    // Listen for click on the entire result (default action - load playbook)
                    item.addEventListener('click', (e) => {
                        // Only trigger if the click was not on a button
                        if (!e.target.closest('.search-action-btn')) {
                            this.loadPlaybookFromSearch(item.dataset.filename, item.dataset.playbookId);
                        }
                    });

                    // Action buttons
                    const importBtn = item.querySelector('.import-btn');
                    if (importBtn) {
                        importBtn.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent triggering the parent click
                            this.loadPlaybookFromSearch(item.dataset.filename, item.dataset.playbookId);
                        });
                    }

                    const copyTextBtn = item.querySelector('.copy-text-btn');
                    if (copyTextBtn) {
                        copyTextBtn.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent triggering the parent click
                            this.copySearchResultText(item);
                        });
                    }

                    const executeTextBtn = item.querySelector('.execute-text-btn');
                    if (executeTextBtn) {
                        executeTextBtn.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent triggering the parent click
                            this.executeSearchResultText(item);
                        });
                    }
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
            <div class="search-result-item" 
                data-filename="${result.filename}" 
                data-line="${result.line}" 
                data-line-number="${result.line_number}"
                data-playbook-id="${result.id || ''}">
                <div class="result-header">
                    <span class="filename">${result.filename}</span>
                    <span class="line-number">Line ${result.line_number}</span>
                    <div class="result-actions">
                        <button class="search-action-btn import-btn" title="Import Playbook">
                            <i class="fas fa-file-import"></i>
                        </button>
                        <button class="search-action-btn copy-text-btn" title="Copy Text">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="search-action-btn execute-text-btn" title="Execute Text">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
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
     * @param {string} playbookId - Optional playbook ID
     */
    async loadPlaybookFromSearch(filename, playbookId) {
        try {
            console.log(`Attempting to load playbook: ${filename}, ID: ${playbookId || 'Not provided'}`);
            
            let playbook;
            
            // Try to load by ID first if provided
            if (playbookId) {
                try {
                    playbook = await playbookAPI.getPlaybook(playbookId);
                    console.log('Successfully loaded playbook by ID');
                } catch (idError) {
                    console.warn(`Could not load playbook by ID: ${idError.message}`);
                    // If ID fails, we'll try by filename below
                }
            }
            
            // If we don't have a playbook yet, try by filename
            if (!playbook) {
                // Try multiple path strategies
                const pathsToTry = [
                    filename,                        // As provided in search result
                    `playbooks/${filename}`,         // In playbooks folder
                    filename.replace(/^playbooks\//, '') // Without playbooks/ prefix
                ];
                
                let loadError;
                for (const path of pathsToTry) {
                    try {
                        console.log(`Trying to load playbook with path: ${path}`);
                        playbook = await playbookAPI.getPlaybook(path);
                        console.log(`Successfully loaded playbook from path: ${path}`);
                        break; // Exit the loop if successful
                    } catch (error) {
                        loadError = error;
                        console.warn(`Could not load playbook from path ${path}: ${error.message}`);
                    }
                }
                
                if (!playbook) {
                    throw loadError || new Error("Could not find playbook");
                }
            }
            
            // Display the playbook and clear search results
            this.displayPlaybook(playbook);
            this.clearSearch();
        } catch (error) {
            console.error('Error loading playbook from search:', error);
            
            // More user-friendly error message
            const errorMsg = error.message === "Playbook not found" 
                ? `Could not find playbook "${filename}". It may have been moved or deleted.` 
                : `Failed to load playbook: ${error.message}`;
                
            this.showNotification('Error', errorMsg, 'error');
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
        playbookElement.dataset.id = playbook.id; // Add data-id attribute
        
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
        // Update id (in case the id changed)
        element.id = `playbook-${this.sanitizeId(playbook.id)}`;
        element.dataset.id = playbook.id; // Update data-id attribute
        
        // Update title
        const title = element.querySelector('.playbook-header h3');
        if (title) {
            title.textContent = playbook.title || playbook.filename;
        }
        
        // Update content
        const content = element.querySelector('.playbook-content');
        if (content) {
            content.innerHTML = this.renderPlaybookContent(playbook);
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

    /**
     * Handle copy button click
     * @param {Event} event - Click event
     */
    async handleCopyButtonClick(event) {
        // Get the button element (the clicked element or its parent)
        const button = event.target.closest('.copy-btn');
        if (!button) return;
        
        // Get the code block wrapper
        const wrapper = button.closest('.code-block-wrapper');
        if (!wrapper) return;
        
        // Get the code element and extract its text
        const codeElement = wrapper.querySelector('pre code');
        if (!codeElement) return;
        
        try {
            // Get the text content (this preserves variable substitutions)
            let text = codeElement.textContent;
            
            // Copy to clipboard
            await navigator.clipboard.writeText(text);
            
            // Visual feedback
            button.classList.add('copied');
            
            // Optional: Show a tooltip or notification
            if (window.CommandWave && window.CommandWave.notificationManager) {
                window.CommandWave.notificationManager.show(
                    'Copied!', 
                    'Code has been copied to clipboard.', 
                    'success',
                    2000
                );
            }
            
            // Remove copied class after a delay
            setTimeout(() => {
                button.classList.remove('copied');
            }, 2000);
        } catch (error) {
            console.error('Failed to copy code:', error);
            if (window.CommandWave && window.CommandWave.notificationManager) {
                window.CommandWave.notificationManager.show(
                    'Error', 
                    'Failed to copy code to clipboard.', 
                    'error'
                );
            }
        }
    }
    
    /**
     * Handle execute button click
     * @param {Event} event - Click event
     */
    async handleExecuteButtonClick(event) {
        // Get the button element (the clicked element or its parent)
        const button = event.target.closest('.execute-btn');
        if (!button) return;
        
        // Get the code block wrapper
        const wrapper = button.closest('.code-block-wrapper');
        if (!wrapper) return;
        
        // Get the code element and extract its text
        const codeElement = wrapper.querySelector('pre code');
        if (!codeElement) return;
        
        try {
            // Visual feedback - add executing class
            button.classList.add('executing');
            
            // Get the text content with variable substitutions
            const commandText = codeElement.textContent.trim();
            
            // Split into multiple commands (by line)
            const commands = commandText.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));
            
            if (commands.length === 0) {
                throw new Error('No executable commands found');
            }
            
            // Get the terminal manager
            if (!window.CommandWave || !window.CommandWave.terminalManager) {
                throw new Error('Terminal manager not available');
            }
            
            const terminalManager = window.CommandWave.terminalManager;
            
            // Get the active terminal ID
            const activeTerminalId = terminalManager.getActiveTerminalId();
            if (!activeTerminalId) {
                throw new Error('No active terminal found');
            }
            
            // Execute each command in sequence
            for (let i = 0; i < commands.length; i++) {
                const command = commands[i];
                
                // Use the terminal manager to send the command
                await terminalManager.sendCommandToTerminal(activeTerminalId, command);
                
                // Wait a short time between commands
                if (i < commands.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
            
            // Show success notification
            if (window.CommandWave && window.CommandWave.notificationManager) {
                window.CommandWave.notificationManager.show(
                    'Executed!', 
                    `${commands.length} command${commands.length > 1 ? 's' : ''} sent to terminal.`, 
                    'success',
                    3000
                );
            }
        } catch (error) {
            console.error('Failed to execute code:', error);
            if (window.CommandWave && window.CommandWave.notificationManager) {
                window.CommandWave.notificationManager.show(
                    'Error', 
                    `Failed to execute code: ${error.message}`, 
                    'error'
                );
            }
        } finally {
            // Remove executing class
            button.classList.remove('executing');
        }
    }

    /**
     * Copy search result text to clipboard
     * @param {HTMLElement} resultItem - The search result item element
     */
    async copySearchResultText(resultItem) {
        try {
            const lineText = resultItem.dataset.line;
            if (!lineText) {
                throw new Error('No text to copy');
            }
            
            // Copy to clipboard
            await navigator.clipboard.writeText(lineText);
            
            // Show notification
            if (window.CommandWave && window.CommandWave.notificationManager) {
                window.CommandWave.notificationManager.show(
                    'Copied!', 
                    'Text has been copied to clipboard.', 
                    'success',
                    2000
                );
            }
        } catch (error) {
            console.error('Failed to copy text:', error);
            if (window.CommandWave && window.CommandWave.notificationManager) {
                window.CommandWave.notificationManager.show(
                    'Error', 
                    'Failed to copy text to clipboard.', 
                    'error'
                );
            }
        }
    }
    
    /**
     * Execute search result text in the terminal
     * @param {HTMLElement} resultItem - The search result item element
     */
    async executeSearchResultText(resultItem) {
        try {
            const commandText = resultItem.dataset.line.trim();
            if (!commandText) {
                throw new Error('No text to execute');
            }
            
            // Get the terminal manager
            if (!window.CommandWave || !window.CommandWave.terminalManager) {
                throw new Error('Terminal manager not available');
            }
            
            const terminalManager = window.CommandWave.terminalManager;
            
            // Get the active terminal ID
            const activeTerminalId = terminalManager.getActiveTerminalId();
            if (!activeTerminalId) {
                throw new Error('No active terminal found');
            }
            
            // Execute the command exactly as is, without validation or filtering
            await terminalManager.sendCommandToTerminal(activeTerminalId, commandText);
            
            // Close search results after execution
            this.clearSearch();
            
            // Show success notification
            if (window.CommandWave && window.CommandWave.notificationManager) {
                window.CommandWave.notificationManager.show(
                    'Executed!', 
                    'Command sent to terminal.', 
                    'success',
                    3000
                );
            }
        } catch (error) {
            console.error('Failed to execute text:', error);
            if (window.CommandWave && window.CommandWave.notificationManager) {
                window.CommandWave.notificationManager.show(
                    'Error', 
                    `Failed to execute text: ${error.message}`, 
                    'error'
                );
            }
        }
    }

    /**
     * Make a code block editable
     * @param {HTMLElement} codeBlock - The code block element to make editable
     */
    makeCodeBlockEditable(codeBlock) {
        // If there's already an active editable code block, save it first
        if (this.activeEditableCodeBlock) {
            this.saveEditableCodeBlock();
        }
        
        // Mark this code block as the active editable one
        this.activeEditableCodeBlock = codeBlock;
        codeBlock.classList.add('editing');
        
        // Get the code content
        const preElement = codeBlock.querySelector('pre');
        const codeElement = preElement.querySelector('code');
        const language = codeBlock.dataset.language || 'plaintext';
        
        // Get the original code content (without formatting)
        let codeContent = codeElement.textContent;
        
        // Create an editable textarea
        const editableArea = document.createElement('div');
        editableArea.className = 'code-editable';
        editableArea.innerHTML = `
            <textarea class="code-editor" spellcheck="false">${codeContent}</textarea>
            <div class="code-edit-actions">
                <button class="code-edit-save-btn">
                    <i class="fas fa-check"></i>
                    <span>Save</span>
                </button>
                <button class="code-edit-cancel-btn">
                    <i class="fas fa-times"></i>
                    <span>Cancel</span>
                </button>
            </div>
        `;
        
        // Store the original content for cancellation
        this.originalCodeContent = codeContent;
        this.originalCodeBlock = preElement.innerHTML;
        
        // Replace the pre element with our editable area
        preElement.style.display = 'none';
        codeBlock.appendChild(editableArea);
        
        // Focus the textarea
        const textarea = editableArea.querySelector('textarea');
        textarea.focus();
        
        // Setup event listeners for the editing actions
        const saveBtn = editableArea.querySelector('.code-edit-save-btn');
        const cancelBtn = editableArea.querySelector('.code-edit-cancel-btn');
        
        saveBtn.addEventListener('click', () => this.saveEditableCodeBlock());
        cancelBtn.addEventListener('click', () => this.cancelEditableCodeBlock());
        
        // Also save on Ctrl+Enter
        textarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.saveEditableCodeBlock();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelEditableCodeBlock();
            }
        });
    }
    
    /**
     * Save the changes to an editable code block
     */
    async saveEditableCodeBlock() {
        if (!this.activeEditableCodeBlock) return;
        
        const codeBlock = this.activeEditableCodeBlock;
        const editableArea = codeBlock.querySelector('.code-editable');
        if (!editableArea) return;
        
        const textarea = editableArea.querySelector('textarea');
        const newCode = textarea.value;
        const preElement = codeBlock.querySelector('pre');
        const language = codeBlock.dataset.language || 'plaintext';
        
        // Get the playbook information
        const playbookElement = codeBlock.closest('.playbook');
        if (!playbookElement) {
            this.showNotification('Error', 'Could not find parent playbook for this code block', 'error');
            return;
        }
        
        const playbookId = playbookElement.dataset.id;
        if (!playbookId) {
            this.showNotification('Error', 'Playbook ID not found', 'error');
            return;
        }
        
        try {
            // Get the current playbook data
            const playbook = await playbookAPI.getPlaybook(playbookId);
            
            // Extract all code blocks from the current markdown
            const codeBlocks = this.extractCodeBlocksFromMarkdown(playbook.content);
            
            // Get the index of this code block in the playbook
            const codeBlockIndex = this.findCodeBlockIndex(codeBlock, playbookElement);
            
            if (codeBlockIndex === -1 || codeBlockIndex >= codeBlocks.length) {
                throw new Error('Could not identify which code block was edited');
            }
            
            // Replace the code in the markdown
            const updatedContent = this.replaceCodeBlockInMarkdown(
                playbook.content, 
                codeBlocks[codeBlockIndex], 
                newCode,
                language
            );
            
            // Update the playbook content on the server
            const updatedPlaybook = await playbookAPI.updatePlaybook(playbookId, {
                ...playbook,
                content: updatedContent
            });
            
            // Update the playbook in our local cache
            this.playbooksById[playbookId] = updatedPlaybook;
            
            // Re-render just the edited code block
            const highlightedCode = this.highlightCode(newCode, language);
            preElement.innerHTML = `<code class="language-${language}">${highlightedCode}</code>`;
            preElement.style.display = 'block';
            
            // Remove the editable area
            if (editableArea) {
                editableArea.remove();
            }
            
            // Clear the active editable code block reference
            this.activeEditableCodeBlock.classList.remove('editing');
            this.activeEditableCodeBlock = null;
            
            this.showNotification('Success', 'Code block updated successfully', 'success', 2000);
        } catch (error) {
            console.error('Error updating code block:', error);
            this.showNotification('Error', `Failed to update code block: ${error.message}`, 'error');
        }
    }
    
    /**
     * Cancel editing a code block and revert to original content
     */
    cancelEditableCodeBlock() {
        if (!this.activeEditableCodeBlock) return;
        
        const codeBlock = this.activeEditableCodeBlock;
        const editableArea = codeBlock.querySelector('.code-editable');
        
        if (editableArea) {
            editableArea.remove();
        }
        
        // Restore the original code display
        const preElement = codeBlock.querySelector('pre');
        preElement.style.display = 'block';
        preElement.innerHTML = this.originalCodeBlock;
        
        // Clear the active editable code block reference
        codeBlock.classList.remove('editing');
        this.activeEditableCodeBlock = null;
    }
    
    /**
     * Extract code blocks from markdown text
     * @param {string} markdown - The markdown content
     * @returns {Array} Array of code block objects with start, end, content, and language
     */
    extractCodeBlocksFromMarkdown(markdown) {
        const codeBlocks = [];
        const codeBlockRegex = /```([\w]*)\n([\s\S]*?)```/g;
        
        let match;
        while ((match = codeBlockRegex.exec(markdown)) !== null) {
            codeBlocks.push({
                start: match.index,
                end: match.index + match[0].length,
                fullMatch: match[0],
                language: match[1],
                content: match[2]
            });
        }
        
        return codeBlocks;
    }
    
    /**
     * Find the index of a code block in the playbook
     * @param {HTMLElement} codeBlockElement - The code block element
     * @param {HTMLElement} playbookElement - The parent playbook element
     * @returns {number} The index of the code block, or -1 if not found
     */
    findCodeBlockIndex(codeBlockElement, playbookElement) {
        const codeBlocks = Array.from(
            playbookElement.querySelectorAll('.code-block-wrapper')
        );
        return codeBlocks.indexOf(codeBlockElement);
    }
    
    /**
     * Replace a code block in markdown content
     * @param {string} markdown - The original markdown content
     * @param {Object} codeBlock - The code block object to replace
     * @param {string} newCode - The new code content
     * @param {string} language - The language of the code block
     * @returns {string} The updated markdown content
     */
    replaceCodeBlockInMarkdown(markdown, codeBlock, newCode, language) {
        return markdown.substring(0, codeBlock.start) + 
               '```' + language + '\n' + newCode + '```' + 
               markdown.substring(codeBlock.end);
    }
    
    /**
     * Highlight code using Prism if available
     * @param {string} code - The code to highlight
     * @param {string} language - The language of the code
     * @returns {string} The highlighted code
     */
    highlightCode(code, language) {
        if (window.Prism && language && Prism.languages[language]) {
            try {
                return Prism.highlight(code, Prism.languages[language], language);
            } catch (e) {
                console.error('Prism highlighting error:', e);
            }
        }
        return code;
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
