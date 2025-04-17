/**
 * API Module Index
 * Central export point for all API modules
 */

import terminalAPI from './terminal_api.js';
import playbookAPI from './playbook_api.js';
import variableAPI from './variable_api.js';

// Export all APIs as a single object
export default {
    terminal: terminalAPI,
    playbook: playbookAPI,
    variable: variableAPI
};
