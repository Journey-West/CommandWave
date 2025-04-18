"""
routes/variable_routes.py
Flask Blueprint for variable-related API endpoints.
"""

from flask import Blueprint, request, jsonify, render_template
import os
import json

variable_routes = Blueprint('variable_routes', __name__)

VARIABLES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'variables_data')
os.makedirs(VARIABLES_DIR, exist_ok=True)

@variable_routes.route('/api/variables/create', methods=['POST'])
def create_variable():
    data = request.get_json()
    name = data.get('name', '').strip()
    value = data.get('value', '')
    if not name:
        return jsonify({'success': False, 'error': 'Variable name cannot be empty'}), 400
    file_path = os.path.join(VARIABLES_DIR, 'variables_global.json')
    try:
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    variables = json.load(f)
            except json.JSONDecodeError:
                variables = {}
        else:
            variables = {}
        variables[name] = value
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(variables, f, indent=2)
        return jsonify({'success': True, 'variable': {name: value}})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@variable_routes.route('/api/variables/list', methods=['GET'])
def list_variables():
    """List all saved variables (global)."""
    file_path = os.path.join(VARIABLES_DIR, 'variables_global.json')
    try:
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    variables = json.load(f)
            except json.JSONDecodeError:
                variables = {}
        else:
            variables = {}
        # Render the variable list HTML partial
        html = render_template('partials/_variable_list.html', variables=variables)
        return jsonify({'success': True, 'variables': variables, 'html': html})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
