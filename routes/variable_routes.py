"""
routes/variable_routes.py
Flask Blueprint for variable-related API endpoints.
"""

from flask import Blueprint, request, jsonify, render_template
import os
import json
import logging
import re

# Configure logging
logger = logging.getLogger('commandwave')

# Create blueprint with the correct URL prefix
variable_routes = Blueprint('variable_routes', __name__, url_prefix='/api/variables')

# In-memory variable storage by tab ID (will persist between requests but not app restarts)
tab_variables = {}

# Define the storage directory for persistent variables
VARIABLE_STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'variables')

# Ensure storage directory exists
os.makedirs(VARIABLE_STORAGE_DIR, exist_ok=True)

def get_variable_filename(tab_id):
    """Generate a filesystem-safe filename for storing tab variables"""
    # Clean the tab ID to be safe for filenames
    safe_tab_id = re.sub(r'[^\w\-]', '_', str(tab_id))
    return os.path.join(VARIABLE_STORAGE_DIR, f'variables_{safe_tab_id}.json')

def load_tab_variables(tab_id):
    """Load variables for a specific tab from disk"""
    filename = get_variable_filename(tab_id)
    if os.path.exists(filename):
        try:
            with open(filename, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading variables for tab {tab_id}: {e}")
    return {}

def save_tab_variables(tab_id, variables):
    """Save variables for a specific tab to disk"""
    filename = get_variable_filename(tab_id)
    try:
        with open(filename, 'w') as f:
            json.dump(variables, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving variables for tab {tab_id}: {e}")
        return False

def get_tab_variables(tab_id):
    """Get variables for a specific tab, loading from disk if needed"""
    if tab_id not in tab_variables:
        tab_variables[tab_id] = load_tab_variables(tab_id)
    return tab_variables[tab_id]

@variable_routes.route('/create/<tab_id>', methods=['POST'])
def create_variable(tab_id):
    """Create a new variable for a specific tab"""
    logger.info(f"Create variable endpoint called for tab {tab_id} with data: {request.get_json()}")
    
    if not tab_id:
        return jsonify({'success': False, 'error': 'Tab ID is required'}), 400
    
    data = request.get_json()
    name = data.get('name', '').strip()
    value = data.get('value', '')
    
    if not name:
        return jsonify({'success': False, 'error': 'Variable name cannot be empty'}), 400
    
    try:
        # Create a sanitized version of the name for the reference (no spaces)
        reference_name = name.replace(' ', '')
        
        # Get variables for this tab
        variables = get_tab_variables(tab_id)
        
        # Store both the display name and reference in memory
        variable_data = {
            'display_name': name,  # Original name with spaces preserved
            'reference': reference_name,  # Name without spaces for command substitution
            'value': value
        }
        
        variables[name] = variable_data
        
        # Save to disk
        save_tab_variables(tab_id, variables)
        
        return jsonify({'success': True, 'variable': {name: variable_data}})
    except Exception as e:
        logger.error(f"Error creating variable for tab {tab_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@variable_routes.route('/update/<tab_id>', methods=['POST'])
def update_variable(tab_id):
    """Update a variable for a specific tab"""
    logger.info(f"Update variable endpoint called for tab {tab_id} with data: {request.get_json()}")
    
    if not tab_id:
        return jsonify({'success': False, 'error': 'Tab ID is required'}), 400
    
    data = request.get_json()
    old_name = data.get('oldName', '').strip()
    new_name = data.get('newName', '').strip()
    value = data.get('value', '')
    
    if not old_name or not new_name:
        return jsonify({'success': False, 'error': 'Variable names cannot be empty'}), 400
    
    try:
        # Get variables for this tab
        variables = get_tab_variables(tab_id)
        
        # Update in memory
        if old_name in variables:
            if old_name != new_name:
                variables.pop(old_name)
            variables[new_name] = {
                'display_name': new_name,  
                'reference': new_name.replace(' ', ''),  
                'value': value
            }
            
            # Save to disk
            save_tab_variables(tab_id, variables)
            
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': f'Variable {old_name} not found for tab {tab_id}'}), 404
    except Exception as e:
        logger.error(f"Error updating variable for tab {tab_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@variable_routes.route('/delete/<tab_id>', methods=['POST'])
def delete_variable(tab_id):
    """Delete a variable for a specific tab"""
    logger.info(f"Delete variable endpoint called for tab {tab_id} with data: {request.get_json()}")
    
    if not tab_id:
        return jsonify({'success': False, 'error': 'Tab ID is required'}), 400
    
    data = request.get_json()
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'success': False, 'error': 'Variable name cannot be empty'}), 400
    
    try:
        # Get variables for this tab
        variables = get_tab_variables(tab_id)
        
        # Delete from memory
        if name in variables:
            variables.pop(name)
            
            # Save to disk
            save_tab_variables(tab_id, variables)
            
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': f'Variable {name} not found for tab {tab_id}'}), 404
    except Exception as e:
        logger.error(f"Error deleting variable for tab {tab_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@variable_routes.route('/list/<tab_id>', methods=['GET'])
def list_variables(tab_id):
    """List all saved variables for a specific tab"""
    logger.info(f"List variables endpoint called for tab {tab_id}")
    
    if not tab_id:
        return jsonify({'success': False, 'error': 'Tab ID is required'}), 400
    
    try:
        # Get variables for this tab
        variables = get_tab_variables(tab_id)
        
        # Generate HTML for variables in the same format as default variables
        html = ""
        for name, variable_data in variables.items():
            # Keep original name case exactly as entered by user
            label_name = variable_data['display_name']
            # Create a reference-friendly name for placeholder (no spaces)
            reference_name = variable_data['reference']
            html += f'''
            <div class="variable-input custom-variable">
                <label for="var_{name}">{label_name}:</label>
                <input type="text" id="var_{name}" name="var_{name}" value="{variable_data['value']}" 
                       class="custom-variable-input" data-variable-name="{name}" placeholder="${reference_name}">
            </div>
            '''
        
        return jsonify({'success': True, 'variables': variables, 'html': html})
    except Exception as e:
        logger.error(f"Error listing variables for tab {tab_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@variable_routes.route('/list-direct/<tab_id>', methods=['GET'])
def list_variables_direct(tab_id):
    """Direct endpoint for listing variables for a specific tab to avoid routing issues"""
    return list_variables(tab_id)

@variable_routes.route('/load/<tab_id>', methods=['GET'])
def load_variables(tab_id):
    """Load variables for a specific tab"""
    logger.info(f"Load variables endpoint called for tab {tab_id}")
    
    if not tab_id:
        return jsonify({'success': False, 'error': 'Tab ID is required'}), 400
    
    try:
        # Get variables for this tab (will load from disk if needed)
        variables = get_tab_variables(tab_id)
        
        # Convert to simpler format for frontend
        simplified_variables = {}
        for name, variable_data in variables.items():
            simplified_variables[name] = variable_data['value']
        
        return jsonify({'success': True, 'variables': simplified_variables})
    except Exception as e:
        logger.error(f"Error loading variables for tab {tab_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Maintain backwards compatibility for existing frontend code
@variable_routes.route('/create', methods=['POST'])
def create_variable_legacy():
    """Legacy endpoint for creating a variable (forwards to create with default tab)"""
    return create_variable('default')

@variable_routes.route('/update', methods=['POST'])
def update_variable_legacy():
    """Legacy endpoint for updating a variable (forwards to update with default tab)"""
    return update_variable('default')

@variable_routes.route('/delete', methods=['POST'])
def delete_variable_legacy():
    """Legacy endpoint for deleting a variable (forwards to delete with default tab)"""
    return delete_variable('default')

@variable_routes.route('/list', methods=['GET'])
def list_variables_legacy():
    """Legacy endpoint for listing variables (forwards to list with default tab)"""
    return list_variables('default')

# Add a catch-all route to help debug routing issues
@variable_routes.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def catch_all_route(path):
    logger.info(f"Catch-all route called with path: {path}, method: {request.method}")
    return jsonify({
        'success': False, 
        'error': f'Route not found: /api/variables/{path}',
        'message': 'This is a debug response from the catch-all route'
    }), 404
