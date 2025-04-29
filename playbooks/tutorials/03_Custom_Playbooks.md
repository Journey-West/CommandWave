# CommandWave: Creating Custom Playbooks

This tutorial will guide you through creating and managing your own custom playbooks in CommandWave.

## What are Playbooks?

Playbooks in CommandWave are Markdown (.md) files containing a mix of documentation and executable code blocks. They help you organize, document, and execute command sequences in a structured way.

## Creating a New Playbook

There are two ways to create playbooks:

### 1. Upload Existing Markdown Files

```bash
# No command needed - use the interface:
# 1. Click the "Upload Playbook" button
# 2. Select a .md file from your computer
# 3. The playbook will appear in the list
ip - c a
```

### 2. Create a Playbook in the App

```bash
# No command needed - use the interface:
# 1. Click the "Create Playbook" button
# 2. Enter a name for your playbook (add .md if not automatically added)
# 3. Use the editor to write your playbook content
# 4. Click "Save" when finished
```

## Markdown Basics

CommandWave playbooks support standard Markdown syntax:

### Headings

```
# Heading 1
## Heading 2
### Heading 3
```

### Lists

```
- Bullet point 1
- Bullet point 2
  - Nested bullet point

1. Numbered item 1
2. Numbered item 2
```

### Text Formatting

```
*italic*
**bold**
`inline code`
[Link text](https://example.com)
```

## Code Blocks

The most powerful feature of playbooks is executable code blocks:

### Basic Code Block

```bash
# This is a code block that can be executed
echo "Hello, CommandWave!"
```

### Code Block with Language Highlighting

```python
# Python code with syntax highlighting (not executable in terminal)
def hello():
    print("Hello, CommandWave!")
```

## Editing Code Blocks

CommandWave allows you to edit code blocks directly:

```bash
# Try editing this code block:
# 1. Double-click on this code block
# 2. Make changes to the command
# 3. Press Ctrl+Enter or click the Save button to save changes
echo "This is an editable code block"
```

Key editing features:
- Double-click any code block to enter edit mode
- Make changes to the content as needed
- Press Ctrl+Enter or click the Save button to save changes
- ESC key cancels editing without saving
- Edited blocks are highlighted until saved

## Working with Variables in Playbooks

Custom playbooks are more powerful when combined with variables:

```bash
# Example using variables
ping -c 3 $targetIP
```

Variables are automatically substituted when you execute the command. If the variable isn't defined, you'll see a message indicating it needs to be set.

## Playbook Organization

For complex tasks, organize your playbooks with clear sections:

```
# Network Scanning Playbook

## Initial Reconnaissance
```bash
nmap -sn $targetNetwork/24
```

## Full Port Scan
```bash
nmap -p- -T4 $targetIP
```

## Service Enumeration
```bash
nmap -sV -sC $targetIP
```
```

## Playbook Best Practices

1. Start with a clear title and description
2. Organize commands logically with headings and sections
3. Provide comments explaining what each command does
4. Use variables to make playbooks reusable
5. Include examples of expected output where helpful
6. Link to related playbooks or external documentation

## Advanced: Cross-Referencing Playbooks

CommandWave allows you to reference other playbooks:

```
[Link to another playbook](playbook:another_playbook.md)
```

This helps create a network of related playbooks for complex tasks.

## Saving and Sharing Playbooks

```bash
# No command needed - playbooks are automatically saved when edited
# Playbooks are stored in the playbooks/ directory on the server
```

## Try It Yourself

Create a simple playbook with:
1. A title and description
2. At least two sections with headings
3. At least two code blocks
4. Use of at least one variable
5. Try editing a code block after saving

```bash
echo "Congratulations on creating your first custom playbook!"
```
