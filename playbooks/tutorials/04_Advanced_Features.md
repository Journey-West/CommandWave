# CommandWave: Advanced Features

This tutorial covers the more advanced capabilities of CommandWave to help you maximize your productivity.

## Terminal Management

### Managing Multiple Terminals

CommandWave allows you to create and manage multiple terminal sessions simultaneously:

```bash
# No command needed - use the interface to:
# 1. Create terminals with the '+' button
# 2. Switch between them by clicking on tabs
# 3. Rename terminals by double-clicking on a tab name
ls
```

### Terminal Synchronization

Your terminal tabs automatically synchronize across sessions:

```bash
# No command needed - terminals automatically sync across browser sessions
# 1. Open CommandWave in two different browsers or devices
# 2. Create a new terminal in one window
# 3. The terminal will appear in the other window automatically
# 4. All terminals persist across browser restarts
```

### Terminal History

Each terminal maintains its own command history:

```bash
# Press Up Arrow to cycle through previous commands
# Or view history with:
history
```

## Themes and Visual Customization

### Theme Selection

CommandWave offers three distinct themes to match your preferences:

```bash
# No command needed - use the interface to change themes:
# 1. Click the gear icon in the top-right corner
# 2. Select "Theme Settings"
# 3. Choose from the available themes:
#    - Cyberpunk Dark (default)
#    - Neon Light
#    - Witch Hazel
```

Each theme provides a different color scheme while maintaining readability:
- **Cyberpunk Dark**: Classic dark theme with neon blue and purple highlights
- **Neon Light**: Light background with vibrant neon accents
- **Witch Hazel**: Dark purple background with complementary pastel highlights

### Enhanced Code Readability

CommandWave features special syntax highlighting for commands:

```bash
# Common tools and commands are highlighted for better visibility
nmap -sV -p 22,80,443 $targetIP
nxc smb $dcIP -u $username -p $password
```

Notice how command names and important parameters are more visible with:
- Brighter colors for command names and tools
- Special highlighting for pentesting tools like `nmap` and `nxc`
- Distinct colors for arguments and options
- Glowing effect on critical commands

## Advanced Playbook Features

### Notes Integration

CommandWave provides both global notes and tab-specific notes:

```bash
# No command needed - click "Global Notes" or "Tab Notes" buttons
# Notes are markdown-compatible and persist between sessions
# Tab notes are specific to each terminal tab
```

### Cross-Referencing Playbooks

Link between playbooks to create a knowledge network:

```bash
# Use special syntax in your markdown:
# [Link text](playbook:filename.md)
# 
# Example: [See Network Scanning Guide](playbook:Network_Security_Scanning.md)
```

### Playbook Synchronization

Playbooks synchronize across all connected sessions:

```bash
# Edit a playbook in one window and the changes appear in all others
# All playbooks persist between browser sessions
# No manual export/import needed
```

### Playbook Search

Quickly find commands across all your playbooks:

```bash
# No command needed - use the search box at the top
# Results will show matches from all available playbooks
# Click on a search result to load that playbook
```

## Customization Options

### Variable Management

Create complex workflows with custom variables that sync across sessions:

```bash
# Define multiple related variables for a workflow
# Remember to give variables clear titles and reference names
# Example variables for a deployment scenario:
# Title: Target Server | Reference: $targetServer
# Title: Deploy Path | Reference: $deployPath 
# Title: App Name | Reference: $appName
# Title: Version | Reference: $version

# Then use them together
ssh $username@$targetServer "mkdir -p $deployPath/$appName-$version"
```

### Tmux Integration

CommandWave uses tmux under the hood, allowing advanced terminal multiplexing:

```bash
# Split current pane vertically
tmux split-window -v

# Split current pane horizontally
tmux split-window -h

# Navigate between panes
# Ctrl+b arrow-key
```

## Workflow Integration

### Git Workflow Example

```bash
# Clone a repository
git clone $repoUrl

# Create a new branch
git checkout -b feature/$featureName

# After making changes
git add .
git commit -m "Added $featureName functionality"
git push origin feature/$featureName
```

### Continuous Integration Example

```bash
# Run tests before deployment
cd $projectDir
npm test

# Build the application
npm run build

# Deploy to server
scp -r ./dist/* $username@$serverAddress:$deployPath
```

### File Management

```bash
# Find large files on the system
find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null | sort -rh | head -n 10

# Perform a backup of important directories
tar -czvf backup-$(date +%Y%m%d).tar.gz $backupDir
```

## Error Handling

CommandWave provides clear error messages for common issues:

```bash
# If you attempt to use an undefined variable, you'll see:
echo "This will show an undefined variable: $undefinedVariable"

# If a command fails, you'll see the error in the terminal
ls /nonexistent_directory
```

## Security Features

### Secure Terminal Sessions

```bash
# CommandWave terminal sessions are isolated
# Each terminal has its own environment
```

### Secure Variable Handling

```bash
# For sensitive variables, you can use:
read -s PASSWORD
echo "Password stored securely (not displayed)"
```

## Power User Tips

### Keyboard Shortcuts

CommandWave supports various keyboard shortcuts:

```bash
# Common terminal shortcuts:
# Ctrl+C - Interrupt/cancel current command
# Ctrl+L - Clear screen
# Ctrl+R - Search command history
# Ctrl+Enter - Save edited code block
```

### Command Chaining

Combine multiple commands for efficient workflows:

```bash
# Execute a command only if previous one succeeds
mkdir -p $PROJECT_DIR && cd $PROJECT_DIR && npm init -y

# Execute a command only if previous one fails
ping -c 1 $SERVER || echo "Server unreachable"

# Chain commands regardless of success/failure
git pull; npm install; npm start
```

## Troubleshooting

If you encounter issues with CommandWave:

```bash
# Check if tmux is running
pgrep tmux

# Verify ttyd processes
ps aux | grep ttyd

# Check available ports
netstat -tuln | grep 7681
```

## Next Steps

Now that you've completed all the tutorials, you're ready to create your own custom playbooks and workflows. Remember that you can always refer back to these tutorials or check the [CommandWave GitHub repository](https://github.com/Journey-West/CommandWave) for updates.
