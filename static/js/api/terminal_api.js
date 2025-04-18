/**
 * terminal_api.js - API module for terminal operations
 * Handles all terminal-related API calls to the server
 */

class TerminalAPI {
    constructor() {
        this.baseUrl = '/api/terminals';
    }
    
    /**
     * Get all terminals
     * @returns {Promise} Promise that resolves to terminal list
     */
    async getTerminals() {
        try {
            const response = await fetch(`${this.baseUrl}/list`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to get terminals');
            }
            
            return data.terminals;
        } catch (error) {
            console.error('Error fetching terminals:', error);
            throw error;
        }
    }
    
    /**
     * Create a new terminal
     * @param {string} name - Terminal name
     * @returns {Promise} Promise that resolves to new terminal info
     */
    async createTerminal(name = 'Terminal') {
        try {
            const response = await fetch(`${this.baseUrl}/new`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to create terminal');
            }
            
            // Return full response to include success flag
            return data;
        } catch (error) {
            console.error('Error creating terminal:', error);
            throw error;
        }
    }
    
    /**
     * Close a terminal
     * @param {string|number} port - Terminal port
     * @returns {Promise} Promise that resolves to success status
     */
    async closeTerminal(port) {
        try {
            const response = await fetch(`${this.baseUrl}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to close terminal');
            }
            
            return true;
        } catch (error) {
            console.error('Error closing terminal:', error);
            throw error;
        }
    }
    
    /**
     * Rename a terminal
     * @param {string} port - Terminal port
     * @param {string} newName - New terminal name
     * @returns {Promise<object>} - Response with updated terminal details
     */
    async renameTerminal(port, newName) {
        try {
            // Since the /api/terminals/rename endpoint doesn't exist yet,
            // we'll just return a successful response for the UI to continue working
            console.log(`API: Would rename terminal on port ${port} to "${newName}"`);
            
            // Mock successful response
            return { success: true, message: 'Terminal renamed successfully (client-side only)' };
            
            /* Uncomment when backend endpoint is implemented
            const response = await fetch('/api/terminals/rename', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ port, name: newName })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to rename terminal');
            }
            
            return await response.json();
            */
        } catch (error) {
            console.error('Terminal API - Rename Terminal Error:', error);
            throw error;
        }
    }
    
    /**
     * Delete a terminal
     * @param {string} port - Terminal port to delete
     * @returns {Promise<object>} - Response with deletion status
     */
    async deleteTerminal(port) {
        try {
            // Since the /api/terminals/delete endpoint doesn't exist yet,
            // we'll just return a successful response for the UI to continue working
            console.log(`API: Would delete terminal on port ${port}`);
            
            // Mock successful response
            return { success: true, message: 'Terminal deleted successfully (client-side only)' };
            
            /* Uncomment when backend endpoint is implemented
            const response = await fetch('/api/terminals/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ port })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete terminal');
            }
            
            return await response.json();
            */
        } catch (error) {
            console.error('Terminal API - Delete Terminal Error:', error);
            throw error;
        }
    }
}

// Export as singleton
export default new TerminalAPI();
