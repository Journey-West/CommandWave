/**
 * variable_api.js - API module for variable operations
 * Handles all variable-related API calls to the server
 */

class VariableAPI {
    constructor() {
        this.baseUrl = '/api/variables';
    }
    
    /**
     * Get all variables
     * @returns {Promise} Promise that resolves to variables list
     */
    async getVariables() {
        try {
            const response = await fetch(`${this.baseUrl}/list`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to get variables');
            }
            
            return data.variables;
        } catch (error) {
            console.error('Error fetching variables:', error);
            throw error;
        }
    }
    
    /**
     * Set a variable
     * @param {string} name - Variable name
     * @param {string} value - Variable value
     * @returns {Promise} Promise that resolves to success status
     */
    async setVariable(name, value) {
        try {
            const response = await fetch(`${this.baseUrl}/set`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, value })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to set variable');
            }
            
            return true;
        } catch (error) {
            console.error(`Error setting variable ${name}:`, error);
            throw error;
        }
    }
    
    /**
     * Delete a variable
     * @param {string} name - Variable name
     * @returns {Promise} Promise that resolves to success status
     */
    async deleteVariable(name) {
        try {
            const response = await fetch(`${this.baseUrl}/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to delete variable');
            }
            
            return true;
        } catch (error) {
            console.error(`Error deleting variable ${name}:`, error);
            throw error;
        }
    }
    
    /**
     * Import variables
     * @param {object} variables - Variables object
     * @returns {Promise} Promise that resolves to success status
     */
    async importVariables(variables) {
        try {
            const response = await fetch(`${this.baseUrl}/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variables })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to import variables');
            }
            
            return true;
        } catch (error) {
            console.error('Error importing variables:', error);
            throw error;
        }
    }
    
    /**
     * Export variables
     * @returns {Promise} Promise that resolves to variables object
     */
    async exportVariables() {
        try {
            const response = await fetch(`${this.baseUrl}/export`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to export variables');
            }
            
            return data.variables;
        } catch (error) {
            console.error('Error exporting variables:', error);
            throw error;
        }
    }
}

// Export as singleton
export default new VariableAPI();
