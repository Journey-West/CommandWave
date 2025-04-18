# CommandWave Architecture Documentation

## Overview

CommandWave is a web-based terminal management interface that combines terminal sessions with playbooks, variables, and notes to provide an integrated command execution environment. This document outlines the application's architecture, components, and data flow.

## 1. Overall Architecture

CommandWave is built using a Flask (Python) backend and a modular JavaScript frontend. The application allows users to:

- Create and manage multiple terminal sessions via tmux and ttyd
- Define and use variables across terminal sessions
- Create, edit, and use playbooks (markdown files with executable commands)
- Take notes for individual terminal sessions and globally
- Search across playbooks for specific content

### Key Components:

- **Backend (Python/Flask)**: Provides API endpoints for managing terminals, variables, playbooks, and notes
- **Frontend (HTML/JS/CSS)**: Presents a modular interface for user interaction
- **External Tools**: Relies on tmux for terminal session management and ttyd for web-based terminal access

## 2. Backend Architecture

### Core Structure

The backend is built around a Flask application with a modular blueprint structure:

- **main.py**: Primary entry point containing core terminal management functionality, signal handling, and app initialization
- **core/**: Utility modules for shared functionality
  - **playbook_utils.py**: Functions for parsing, loading, and saving playbooks
  - **variable_utils.py**, **tmux_utils.py**: Placeholder modules for future refactoring
- **routes/**: API endpoints organized as Flask blueprints
  - **playbook_routes.py**: Endpoints for playbook management
  - **variable_routes.py**: Endpoints for variable management
  - **terminal_routes.py**: Endpoints for terminal session control
  - **notes_routes.py**: Endpoints for notes management

### API Endpoints

#### Terminal Management
- `/api/terminals/list`: Get all active terminals
- `/api/terminals/new`: Create a new terminal
- `/api/terminals/{port}/send-keys`: Send commands to a terminal
- `/api/terminals/{port}/delete`: Delete a terminal
- `/api/terminals/{port}/rename`: Rename a terminal
- `/api/terminals/send-command`: Send a command to a terminal

#### Variable Management
- `/api/variables/create/{tab_id}`: Create a new variable for a tab
- `/api/variables/update/{tab_id}`: Update a variable
- `/api/variables/delete/{tab_id}`: Delete a variable
- `/api/variables/list/{tab_id}`: List variables for a tab
- `/api/variables/sync/{tab_id}`: Sync variables for a tab
- `/api/variables/load/{tab_id}`: Load variables for a tab

#### Playbook Management
- `/api/playbooks/import`: Import a playbook
- `/api/playbooks/list`: List all playbooks
- `/api/playbooks/{playbook_id}`: Get a specific playbook
- `/api/playbooks/{playbook_id}/delete`: Delete a playbook
- `/api/playbooks/{playbook_id}/update`: Update a playbook
- `/api/playbooks/search`: Search across playbooks

#### Notes Management
- `/api/notes/global`: Handle global notes
- `/api/notes/{terminal_id}`: Handle tab-specific notes

### Data Storage

- **Variables**: Stored in JSON files at `data/variables/variables_{tab_id}.json`
- **Playbooks**: Stored as Markdown files in the `playbooks/` directory
- **Notes**: Stored in the `notes_data/` directory

## 3. Frontend Architecture

### HTML Structure

The main interface is defined in `templates/index.html` with these key sections:

- **Header**: App title and main controls
- **Variable Section**: UI for managing tab-specific variables
- **Terminal Area**: Multiple tabs containing individual terminal sessions
- **Playbook Panel**: Interface for loading, editing, and executing playbooks
- **Notes Panel**: Interface for recording notes for each terminal
- **Modals**: Various modal dialogs for terminal creation, settings, etc.

### JavaScript Architecture

The frontend follows a modular ES6 approach with these key components:

- **Main Entry Point**: `static/js/main.js` initializes all components and sets up the application
- **API Modules**: Located in `static/js/api/` handle communication with the backend
- **UI Modules**: Located in `static/js/ui/` manage specific interface components:
  - `terminal_manager.js`: Handles terminal tabs and interactions
  - `variable_manager.js`: Manages variable UI and state
  - `playbook_manager.js`: Handles playbook loading, editing, and execution
  - `notes_manager.js`: Manages the notes interface
  - `theme_manager.js`: Handles theme switching
  - `modal_controller.js`: Controls modal dialogs
- **Utility Modules**: Located in `static/js/utils/` provide helper functions

### CSS Structure

The styling is modular and organized around:

- **Base Styles**: `static/css/style.css` and `static/css/base.css`
- **Component Styles**: Individual files in `static/css/components/`
- **Theme Styles**: Theme variations in `static/css/themes/`

## 4. Data & State Flow

### Variable Management Flow

1. User creates/edits variables through the UI
2. `variable_manager.js` handles the UI interactions
3. Data is sent to the backend via API calls
4. Backend stores the variables in JSON files and in-memory
5. Variables can be used in terminal commands with substitution
6. Variables are synchronized per terminal tab

### Playbook Flow

1. Playbooks are stored as Markdown files
2. User can browse, search, edit playbooks through the UI
3. Backend processes playbooks (extracting title, commands, code blocks)
4. Code blocks can be executed in the active terminal
5. Variables are substituted in commands before execution

### Terminal Management Flow

1. User creates a new terminal tab in the UI
2. Backend starts a tmux session with a unique name
3. ttyd connects to that session and exposes it on a specific port
4. Frontend embeds the ttyd interface in an iframe
5. Commands can be sent to the terminal through the API

### Notes Management Flow

1. User writes notes in the notes panel
2. Notes are associated with either a specific terminal or are global
3. Notes are persisted to the filesystem through the API

## 5. Key Technical Implementations

### Terminal Session Management

The application creates terminal sessions using:
1. `tmux` for creating and managing terminal sessions
2. `ttyd` for exposing tmux sessions as web interfaces
3. WebSocket for real-time communication

### Variable Substitution

1. Variables are defined with a name and value
2. The application supports reference names (without spaces) for substitution
3. Variables are displayed in the UI with their display names (may contain spaces)
4. When executing commands, references like `$VARIABLE` are replaced with the variable value

### Playbook Processing

Playbooks use Markdown format with:
1. Title from the first H1 heading
2. Description from text between title and first code block
3. Code blocks with language specification
4. Automatic extraction of variables referenced in the content

### UI Synchronization

The frontend maintains state through:
1. Event-based communication between components
2. Tab-specific data storage for variables, notes, etc.
3. API polling for certain operations

## 6. Modularity Assessment

### Backend

- **Strengths**: Use of Flask blueprints for route organization
- **Areas for Improvement**: 
  - Many functions in `main.py` should be moved to appropriate core modules
  - Core utility modules are mostly placeholders
  - Data operations are mixed with HTTP handling

### Frontend

- **Strengths**: 
  - Well-organized ES6 module structure
  - Clear separation of API, UI, and utility functions
  - Use of ES6 classes for component encapsulation
- **Areas for Improvement**:
  - Some event handling logic is duplicated
  - Search functionality implemented as a direct patch in main.js
  - Mixed use of direct DOM access and component-based abstraction

## 7. Application State Management

### Terminal State
- Application tracks active terminals in `app.terminals` dictionary
- Maps ports to tmux session names and process objects
- Terminal metadata includes name, creation time, etc.

### Variable State
- Variables are managed per terminal tab (identified by port)
- Both in-memory and persistent storage (JSON files)
- Frontend keeps a live copy of variables with two-way sync

### Playbook State
- Playbooks are primarily stored as files
- In-memory mapping of playbook IDs to metadata
- Frontend maintains the active playbook state

## 8. Recent Enhancements

### Variable Management
- Added support for spaces in Variable Names while ensuring the Variable Reference fields (used for command substitution) remain space-free
- Updated HTML templates and JavaScript validation to support this improved UX

### Modal Interfaces
- Added a complete "Add Variable" button functionality
- Created a reusable modal template (`_variable_modal.html`) for adding new variables
- Connected to the existing variable management system

### Backend API Updates
- Added an endpoint for updating playbooks to fix code block editing functionality
- The frontend was attempting to send requests to `/api/playbooks/<playbook_id>/update`

## 9. Extensibility Considerations

The application is designed with these extension points:

1. **New Terminal Types**: The architecture allows for different types of terminal sessions
2. **Additional Themes**: Theme system supports easy addition of new visual styles
3. **Plugin System**: Potential for future plugin architecture (not currently implemented)
4. **Playbook Extensions**: Ability to add custom playbook processors or renderers

## 10. Development Guidelines

When extending or modifying CommandWave, adhere to these principles:

1. **Separation of Concerns**: 
   - Backend (Python/Flask) for server-side logic and data processing
   - Frontend (HTML/JS/CSS) for presentation and user interaction

2. **Modular Structure**:
   - Follow the established folder structure
   - Keep related code together in appropriate modules
   - Create new modules for new functionality

3. **API-Driven Communication**:
   - Frontend should interact with the backend through well-defined APIs
   - Use consistent request/response formats (JSON)

4. **UI Consistency**:
   - Maintain the existing UI/UX patterns
   - Leverage existing components for new features
   - Follow established styling guidelines
