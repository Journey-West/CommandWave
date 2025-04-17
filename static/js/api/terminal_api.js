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
            
            return {
                port: data.port,
                name: data.name
            };
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
     * @param {string|number} port - Terminal port
     * @param {string} name - New terminal name
     * @returns {Promise} Promise that resolves to success status
     */
    async renameTerminal(port, name) {
        try {
            const response = await fetch(`${this.baseUrl}/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port, name })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to rename terminal');
            }
            
            return true;
        } catch (error) {
            console.error('Error renaming terminal:', error);
            throw error;
        }
    }
}

// Export as singleton
export default new TerminalAPI();
