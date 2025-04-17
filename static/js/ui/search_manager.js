/**
 * search_manager.js - Handles search-related UI functionality
 * Manages search inputs, clear button, and search results display
 */

class SearchManager {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.searchResults = document.getElementById('searchResults');
        
        this.initializeEventListeners();
    }
    
    /**
     * Initialize event listeners for search functionality
     */
    initializeEventListeners() {
        // Setup clear button functionality
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', this.clearSearch.bind(this));
        }
        
        // Add input event listener to show/hide clear button
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.toggleClearButton.bind(this));
            
            // Initialize clear button visibility
            this.toggleClearButton();
        }
    }
    
    /**
     * Clear the search input and hide results
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.searchInput.focus();
            
            if (this.searchResults) {
                this.searchResults.style.display = 'none';
            }
            
            // Dispatch an input event to trigger any search-related listeners
            this.searchInput.dispatchEvent(new Event('input'));
            
            // Update clear button visibility
            this.toggleClearButton();
            
            // Also dispatch a custom event that other components can listen for
            document.dispatchEvent(new CustomEvent('search:cleared'));
        }
    }
    
    /**
     * Toggle visibility of clear button based on search input content
     */
    toggleClearButton() {
        if (this.clearSearchBtn) {
            this.clearSearchBtn.style.display = 
                this.searchInput && this.searchInput.value.trim() !== '' 
                    ? 'block' 
                    : 'none';
        }
    }
}

export default SearchManager;
