// utils.js
// Shared utility functions for the CommandWave frontend.

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce delay in milliseconds
 * @returns {Function} - The debounced function
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format a timestamp into a human-readable string
 * @param {number|string|Date} timestamp - The timestamp to format
 * @param {boolean} includeTime - Whether to include the time
 * @returns {string} - Formatted date/time string
 */
export function formatTimestamp(timestamp, includeTime = true) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(includeTime && {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Safely parse JSON with error handling
 * @param {string} jsonString - The JSON string to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} - Parsed object or fallback value
 */
export function safeJsonParse(jsonString, fallback = {}) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('JSON parse error:', error);
        return fallback;
    }
}

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} html - The HTML string to sanitize
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * Generate a unique ID
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} - Unique ID
 */
export function generateId(prefix = 'cw') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes - The bytes to format
 * @param {number} decimals - Number of decimals to include
 * @returns {string} - Formatted size with unit
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Check if browser storage is available
 * @param {string} type - The storage type ('localStorage' or 'sessionStorage')
 * @returns {boolean} - Whether the storage is available
 */
export function storageAvailable(type) {
    let storage;
    try {
        storage = window[type];
        const x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return false;
    }
}
