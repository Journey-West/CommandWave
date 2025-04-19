# CommandWave: Getting Started

This tutorial will guide you through the basic features of CommandWave, helping you get comfortable with the interface and core functionality.

## What is CommandWave?

CommandWave is a web-based terminal management interface with Markdown playbook integration. It combines the power of terminal commands with an organized playbook system to make your command-line workflows more efficient.

## Key Features

### Terminal Management
```bash
# No command needed - CommandWave automatically creates your first terminal
# Try typing a simple command to test it:
echo "Hello CommandWave!"
```

### Multi-Terminal Support
CommandWave allows you to create multiple terminal instances for parallel workflows.

```bash
# Click the '+' button in the terminal tabs section to create a new terminal
# Each terminal maintains its own state and variables
```

### Variable Substitution
Variables make your playbooks flexible and reusable.

```bash
# Try using a variable:
# 1. First create a variable in the Variables panel (use the + button)
# 2. Enter a title like "Example Variable" and reference name like "exampleVar"
# 3. Then use it in your commands:
echo "The value of ExampleVar is: $exampleVar"
```

## Basic Navigation

### Accessing Playbooks
```bash
# Use the file upload button to add your playbooks
# or click "Create Playbook" to make a new one
# Playbooks will appear in the left sidebar
```

### Using Notes
```bash
# Click on either "Global Notes" or "Tab Notes" to open the notes panel
# Notes are saved automatically as you type
# Tab notes are specific to each terminal tab
```

### Finding Commands
```bash
# Use the search box to quickly find commands across all playbooks
# Search results will show matching lines from all playbooks
# Click on a result to open the corresponding playbook
```

## Next Steps

Now that you understand the basics, check out the following tutorials:
- [Variables and Substitution](02_Variables.md)
- [Creating Custom Playbooks](03_Custom_Playbooks.md)
- [Advanced Terminal Features](04_Advanced_Features.md)

```bash
# Remember: You can always execute a command by clicking the "Execute" button next to any code block
echo "You've completed the Getting Started tutorial!"
