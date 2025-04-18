"""
routes/variable_routes.py
Flask Blueprint for variable-related API endpoints.
"""

from flask import Blueprint, request, jsonify, render_template
import os
import json
import logging

# Configure logging
logger = logging.getLogger('commandwave')

# Create blueprint with the correct URL prefix
variable_routes = Blueprint('variable_routes', __name__, url_prefix='/api/variables')

# In-memory variable storage (will not persist between sessions)
session_variables = {}

@variable_routes.route('/create', methods=['POST'])
def create_variable():
    logger.info(f"Create variable endpoint called with data: {request.get_json()}")
    data = request.get_json()
    name = data.get('name', '').strip()
    value = data.get('value', '')
    if not name:
        return jsonify({'success': False, 'error': 'Variable name cannot be empty'}), 400
    
    try:
        # Store variable in memory only
        session_variables[name] = value
        return jsonify({'success': True, 'variable': {name: value}})
    except Exception as e:
        logger.error(f"Error creating variable: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@variable_routes.route('/update', methods=['POST'])
def update_variable():
    logger.info(f"Update variable endpoint called with data: {request.get_json()}")
    data = request.get_json()
    old_name = data.get('oldName', '').strip()
    new_name = data.get('newName', '').strip()
    value = data.get('value', '')
    
    if not old_name or not new_name:
        return jsonify({'success': False, 'error': 'Variable names cannot be empty'}), 400
    
    try:
        # Update in memory only
        if old_name in session_variables:
            if old_name != new_name:
                session_variables.pop(old_name)
            session_variables[new_name] = value
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': f'Variable {old_name} not found'}), 404
    except Exception as e:
        logger.error(f"Error updating variable: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@variable_routes.route('/delete', methods=['POST'])
def delete_variable():
    logger.info(f"Delete variable endpoint called with data: {request.get_json()}")
    data = request.get_json()
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'success': False, 'error': 'Variable name cannot be empty'}), 400
    
    try:
        # Delete from memory only
        if name in session_variables:
            session_variables.pop(name)
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': f'Variable {name} not found'}), 404
    except Exception as e:
        logger.error(f"Error deleting variable: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@variable_routes.route('/list', methods=['GET'])
def list_variables():
    """List all saved variables (global)."""
    logger.info("List variables endpoint called")
    try:
        # Return variables from memory
        variables = session_variables
        
        # Generate HTML for variables in the same format as default variables
        html = ""
        for name, value in variables.items():
            # Format name for label with proper capitalization
            label_name = name.capitalize() if not name.isupper() else name
            html += f'''
            <div class="variable-input custom-variable">
                <label for="var_{name}">{label_name}:</label>
                <input type="text" id="var_{name}" name="var_{name}" value="{value}" 
                       class="custom-variable-input" data-variable-name="{name}" placeholder="${name}">
            </div>
            '''
        
        return jsonify({'success': True, 'variables': variables, 'html': html})
    except Exception as e:
        logger.error(f"Error listing variables: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Add a catch-all route to help debug routing issues
@variable_routes.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def catch_all_route(path):
    logger.info(f"Catch-all route called with path: {path}, method: {request.method}")
    return jsonify({
        'success': False, 
        'error': f'Route not found: /api/variables/{path}',
        'message': 'This is a debug response from the catch-all route'
    }), 404
