/**
 * playbook_api.js - API module for playbook operations
 * Handles all playbook-related API calls to the server
 */

class PlaybookAPI {
    constructor() {
        this.baseUrl = '/api/playbooks';
    }
    
    /**
     * Get all playbooks
     * @returns {Promise} Promise that resolves to playbook list
     */
    async getPlaybooks() {
        try {
            const response = await fetch(`${this.baseUrl}/list`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to get playbooks');
            }
            
            return data.playbooks;
        } catch (error) {
            console.error('Error fetching playbooks:', error);
            throw error;
        }
    }
    
    /**
     * Get a single playbook by ID
     * @param {string} id - Playbook ID
     * @returns {Promise} Promise that resolves to playbook data
     */
    async getPlaybook(id) {
        try {
            // Preserve slash separators by encoding individual segments
            const encodedPath = id.split('/').map(encodeURIComponent).join('/');
            const response = await fetch(`${this.baseUrl}/${encodedPath}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to get playbook');
            }
            
            if (!data.playbook) {
                throw new Error('No playbook returned');
            }
            
            return data.playbook;
        } catch (error) {
            console.error(`Error fetching playbook ${id}:`, error);
            throw error;
        }
    }
    
    /**
     * Create a new playbook
     * @param {object} playbookData - Playbook data
     * @returns {Promise} Promise that resolves to new playbook info
     */
    async createPlaybook(playbookData) {
        try {
            const response = await fetch(`${this.baseUrl}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(playbookData)
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to create playbook');
            }
            
            return data.playbook;
        } catch (error) {
            console.error('Error creating playbook:', error);
            throw error;
        }
    }
    
    /**
     * Update an existing playbook
     * @param {string} id - Playbook ID
     * @param {object} playbookData - Updated playbook data
     * @returns {Promise} Promise that resolves to updated playbook info
     */
    async updatePlaybook(id, playbookData) {
        try {
            const response = await fetch(`${this.baseUrl}/${id}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(playbookData)
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to update playbook');
            }
            
            return data.playbook;
        } catch (error) {
            console.error(`Error updating playbook ${id}:`, error);
            throw error;
        }
    }
    
    /**
     * Delete a playbook
     * @param {string} id - Playbook ID
     * @returns {Promise} Promise that resolves to success status
     */
    async deletePlaybook(id) {
        try {
            const response = await fetch(`${this.baseUrl}/${id}/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to delete playbook');
            }
            
            return true;
        } catch (error) {
            console.error(`Error deleting playbook ${id}:`, error);
            throw error;
        }
    }
    
    /**
     * Export a playbook
     * @param {string} id - Playbook ID
     * @returns {Promise} Promise that resolves to playbook content
     */
    async exportPlaybook(id) {
        try {
            const response = await fetch(`${this.baseUrl}/${id}/export`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to export playbook');
            }
            
            return data.content;
        } catch (error) {
            console.error(`Error exporting playbook ${id}:`, error);
            throw error;
        }
    }
    
    /**
     * Import a playbook
     * @param {string} content - Playbook content
     * @param {string} filename - Playbook filename
     * @returns {Promise} Promise that resolves to imported playbook info
     */
    async importPlaybook(content, filename) {
        try {
            const response = await fetch(`${this.baseUrl}/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, filename })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to import playbook');
            }
            
            return data.playbook;
        } catch (error) {
            console.error('Error importing playbook:', error);
            throw error;
        }
    }
    
    /**
     * Search playbooks
     * @param {string} query - Search query
     * @returns {Promise} Promise that resolves to search results
     */
    async searchPlaybooks(query) {
        try {
            const response = await fetch(`${this.baseUrl}/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to search playbooks');
            }
            
            return data.results;
        } catch (error) {
            console.error(`Error searching playbooks for "${query}":`, error);
            throw error;
        }
    }
}

// Export as singleton
export default new PlaybookAPI();
