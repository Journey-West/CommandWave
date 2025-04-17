"""
core/playbook_utils.py
Core logic for parsing, managing, and synchronizing playbooks.
"""

import os
import re
import json
from datetime import datetime

# Constants
PLAYBOOKS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'playbooks')
os.makedirs(PLAYBOOKS_DIR, exist_ok=True)

def validate_playbook(content):
    """
    Validate a playbook's content.
    
    Args:
        content (str): The playbook content to validate
        
    Returns:
        tuple: (is_valid, error_message) - Returns True and None if valid, 
               or False and an error message if invalid
    """
    if not content or not content.strip():
        return False, "Playbook content cannot be empty"
    
    # Check if it's valid markdown (basic check)
    # More advanced validation can be added here as needed
    
    return True, None

def process_playbook(content, filename):
    """
    Process a playbook and extract metadata.
    
    Args:
        content (str): The playbook content
        filename (str): The playbook filename
        
    Returns:
        dict: A dictionary containing processed playbook data
    """
    playbook_data = {
        'filename': filename,
        'title': filename,
        'description': '',
        'blocks': [],
        'variables': [],
        'commands': []
    }
    
    # Extract title from the first # heading
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if title_match:
        playbook_data['title'] = title_match.group(1).strip()
    
    # Extract description (text between title and first ## heading or code block)
    if title_match:
        title_end = title_match.end()
        next_section = re.search(r'(^##\s+|\```)', content[title_end:], re.MULTILINE)
        if next_section:
            desc_text = content[title_end:title_end + next_section.start()].strip()
            playbook_data['description'] = desc_text
    
    # Extract code blocks
    code_blocks = re.finditer(r'```([\w]*)\n(.*?)```', content, re.DOTALL)
    for i, block in enumerate(code_blocks):
        lang = block.group(1) or 'bash'  # Default to bash if no language specified
        code = block.group(2).strip()
        
        playbook_data['blocks'].append({
            'id': f'block-{i+1}',
            'language': lang,
            'code': code,
            'start': block.start(),
            'end': block.end()
        })
        
        # Extract commands from bash code blocks
        if lang.lower() in ['bash', 'shell', 'sh', '']:
            lines = code.split('\n')
            for line in lines:
                line = line.strip()
                if line and not line.startswith('#'):
                    playbook_data['commands'].append(line)
    
    # Extract variables (patterns like $VARIABLE or ${VARIABLE})
    var_pattern = r'(\$\{([A-Za-z0-9_]+)\}|\$([A-Za-z0-9_]+))'
    variable_matches = re.finditer(var_pattern, content)
    
    variables = set()
    for match in variable_matches:
        var_name = match.group(2) or match.group(3)
        variables.add(var_name)
    
    playbook_data['variables'] = list(variables)
    
    return playbook_data

def get_playbook_path(filename):
    """
    Get the full path to a playbook file.
    
    Args:
        filename (str): The playbook filename
        
    Returns:
        str: The full path to the playbook file
    """
    return os.path.join(PLAYBOOKS_DIR, filename)

def load_playbook(filename):
    """
    Load a playbook from disk.
    
    Args:
        filename (str): The playbook filename
        
    Returns:
        tuple: (success, playbook_data or error_message)
    """
    try:
        file_path = get_playbook_path(filename)
        
        if not os.path.exists(file_path):
            return False, f"Playbook '{filename}' not found"
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        playbook_data = process_playbook(content, filename)
        playbook_data['path'] = file_path
        playbook_data['content'] = content
        playbook_data['last_modified'] = os.path.getmtime(file_path)
        
        return True, playbook_data
    except Exception as e:
        return False, str(e)

def save_playbook(filename, content):
    """
    Save a playbook to disk.
    
    Args:
        filename (str): The playbook filename
        content (str): The playbook content
        
    Returns:
        tuple: (success, playbook_data or error_message)
    """
    try:
        valid, error = validate_playbook(content)
        if not valid:
            return False, error
        
        file_path = get_playbook_path(filename)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        playbook_data = process_playbook(content, filename)
        playbook_data['path'] = file_path
        playbook_data['content'] = content
        playbook_data['last_modified'] = os.path.getmtime(file_path)
        
        return True, playbook_data
    except Exception as e:
        return False, str(e)

def list_playbooks():
    """
    List all playbooks in the playbooks directory.
    
    Returns:
        list: A list of playbook data dictionaries
    """
    playbooks = []
    
    try:
        for filename in os.listdir(PLAYBOOKS_DIR):
            if filename.lower().endswith('.md'):
                success, result = load_playbook(filename)
                if success:
                    playbooks.append(result)
    except Exception as e:
        print(f"Error listing playbooks: {e}")
    
    return playbooks
