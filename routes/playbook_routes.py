"""
routes/playbook_routes.py
Flask Blueprint for playbook-related API endpoints.
"""

from flask import Blueprint, request, jsonify, send_from_directory
import os
import time
import json
import uuid
from werkzeug.utils import secure_filename
from core.playbook_utils import process_playbook, validate_playbook, get_playbook_path

# Create the playbook routes Blueprint
playbook_routes = Blueprint('playbook_routes', __name__, url_prefix='/api/playbooks')

# Define the playbooks directory
PLAYBOOKS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'playbooks')
os.makedirs(PLAYBOOKS_DIR, exist_ok=True)

# Store information about shared playbooks
playbooks = {}

@playbook_routes.route('/import', methods=['POST'])
def import_playbook():
    """Import a playbook from uploaded content."""
    try:
        data = request.json
        
        if not data or 'content' not in data or 'filename' not in data:
            return jsonify({'success': False, 'error': 'Missing content or filename'}), 400
        
        # Get the content and filename
        content = data['content']
        filename = secure_filename(data['filename'])
        
        # Make sure the filename has .md extension
        if not filename.lower().endswith('.md'):
            filename += '.md'
        
        # Validate the playbook content
        valid, error = validate_playbook(content)
        if not valid:
            return jsonify({'success': False, 'error': error}), 400
            
        # Process the playbook
        playbook_data = process_playbook(content, filename)
        
        # Save the playbook to disk
        file_path = os.path.join(PLAYBOOKS_DIR, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Add to in-memory playbooks
        playbook_id = str(uuid.uuid4())
        playbooks[playbook_id] = {
            'id': playbook_id,
            'filename': filename,
            'path': file_path,
            'title': playbook_data.get('title', filename),
            'description': playbook_data.get('description', ''),
            'content': content,
            'created_at': time.time(),
            'updated_at': time.time()
        }
        
        # Return success response with playbook data
        return jsonify({
            'success': True, 
            'message': 'Playbook imported successfully',
            'playbook': playbooks[playbook_id]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@playbook_routes.route('/list', methods=['GET'])
def list_playbooks():
    """Get a list of all available playbooks."""
    try:
        return jsonify({
            'success': True,
            'playbooks': list(playbooks.values())
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
        
@playbook_routes.route('/<playbook_id>', methods=['GET'])
def get_playbook(playbook_id):
    """Get a specific playbook by ID."""
    try:
        if playbook_id in playbooks:
            return jsonify({
                'success': True,
                'playbook': playbooks[playbook_id]
            })
        else:
            return jsonify({'success': False, 'error': 'Playbook not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@playbook_routes.route('/search', methods=['GET'])
def search_playbooks():
    """Search for playbooks by query."""
    try:
        query = request.args.get('query', '').lower()
        if not query:
            return jsonify({'success': False, 'error': 'Missing search query'}), 400
            
        results = []
        for playbook in playbooks.values():
            content = playbook['content'].lower()
            if query in content:
                # Find matching lines
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if query in line.lower():
                        results.append({
                            'filename': playbook['filename'],
                            'id': playbook['id'],
                            'line_number': i + 1,
                            'line': lines[i]
                        })
        
        return jsonify({
            'success': True,
            'results': results
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
