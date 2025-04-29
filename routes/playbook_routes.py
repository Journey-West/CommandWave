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

# Load existing playbooks from the playbooks directory
def load_playbooks_from_disk():
    """Load existing playbooks from the playbooks directory."""
    try:
        # Clear the current playbooks dictionary
        playbooks.clear()
        
        # Scan the playbooks directory recursively
        for dirpath, dirnames, filenames in os.walk(PLAYBOOKS_DIR):
            for filename in filenames:
                if filename.lower().endswith('.md'):
                    file_path = os.path.join(dirpath, filename)
                    try:
                        # Read the file content
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        # Determine the relative path of the playbook within PLAYBOOKS_DIR
                        relative_path = os.path.relpath(file_path, PLAYBOOKS_DIR)
                        
                        # Process the playbook
                        playbook_data = process_playbook(content, relative_path)
                        
                        # Add to in-memory playbooks: use relative path as stable ID
                        playbook_id = relative_path
                        playbooks[playbook_id] = {
                            'id': playbook_id,
                            'filename': relative_path,
                            'path': file_path,
                            'title': playbook_data.get('title', relative_path),
                            'description': playbook_data.get('description', ''),
                            'content': content,
                            'created_at': os.path.getctime(file_path),
                            'updated_at': os.path.getmtime(file_path)
                        }
                        print(f"Loaded playbook: {playbook_id}")
                    except Exception as e:
                        print(f"Error loading playbook {file_path}: {str(e)}")
        
        print(f"Loaded {len(playbooks)} playbooks from disk")
    except Exception as e:
        print(f"Error loading playbooks from disk: {str(e)}")

# Load playbooks when the module is imported
load_playbooks_from_disk()

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
        
        # Add to in-memory playbooks: use filename as stable ID
        playbook_id = filename
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
        
@playbook_routes.route('/<path:playbook_id>', methods=['GET'])
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

@playbook_routes.route('/<path:playbook_id>/delete', methods=['POST'])
def delete_playbook(playbook_id):
    """Delete a specific playbook by ID."""
    try:
        if playbook_id in playbooks:
            # Get the playbook details before removing
            playbook = playbooks[playbook_id]
            
            # Delete the file from disk
            file_path = playbook['path']
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # Remove from in-memory storage
            del playbooks[playbook_id]
            
            return jsonify({
                'success': True,
                'message': f"Playbook '{playbook['filename']}' deleted successfully"
            })
        else:
            return jsonify({'success': False, 'error': 'Playbook not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@playbook_routes.route('/<path:playbook_id>/update', methods=['POST'])
def update_playbook(playbook_id):
    """Update a specific playbook by ID."""
    try:
        if playbook_id not in playbooks:
            return jsonify({'success': False, 'error': 'Playbook not found'}), 404
            
        data = request.json
        if not data or 'content' not in data:
            return jsonify({'success': False, 'error': 'Missing playbook content'}), 400
        
        # Get the updated content
        updated_content = data['content']
        
        # Validate the playbook content
        valid, error = validate_playbook(updated_content)
        if not valid:
            return jsonify({'success': False, 'error': error}), 400
            
        # Process the playbook to extract title, description, etc.
        playbook = playbooks[playbook_id]
        playbook_data = process_playbook(updated_content, playbook['filename'])
        
        # Update the in-memory playbook
        playbook['content'] = updated_content
        playbook['title'] = playbook_data.get('title', playbook['filename'])
        playbook['description'] = playbook_data.get('description', '')
        playbook['updated_at'] = time.time()
        
        # Update the file on disk
        file_path = playbook['path']
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
            
        return jsonify({
            'success': True,
            'message': 'Playbook updated successfully',
            'playbook': playbook
        })
        
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

# Create a new playbook from scratch
@playbook_routes.route('/create', methods=['POST'])
def create_playbook():
    """Create a new playbook from scratch."""
    try:
        data = request.json
        if not data or 'filename' not in data or 'content' not in data:
            return jsonify({'success': False, 'error': 'Missing filename or content'}), 400

        filename = secure_filename(data['filename'])
        if not filename.lower().endswith('.md'):
            filename += '.md'

        content = data['content']

        # Create subdirectories if necessary
        file_path = os.path.join(PLAYBOOKS_DIR, filename)
        dir_name = os.path.dirname(file_path)
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name, exist_ok=True)

        # Check if playbook already exists
        if os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'Playbook already exists'}), 400

        # Validate the playbook content
        valid, error = validate_playbook(content)
        if not valid:
            return jsonify({'success': False, 'error': error}), 400

        # Process and save the playbook
        playbook_data = process_playbook(content, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        playbook_id = os.path.relpath(file_path, PLAYBOOKS_DIR)
        playbooks[playbook_id] = {
            'id': playbook_id,
            'filename': playbook_id,
            'path': file_path,
            'title': playbook_data.get('title', playbook_id),
            'description': playbook_data.get('description', ''),
            'content': content,
            'created_at': time.time(),
            'updated_at': time.time()
        }

        return jsonify({'success': True, 'playbook': playbooks[playbook_id]})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
