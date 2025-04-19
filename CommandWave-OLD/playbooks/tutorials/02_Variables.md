# CommandWave: Variables and Substitution

This tutorial explains how to use variables in CommandWave to make your command playbooks more flexible and reusable.

## Understanding Variables

Variables allow you to create dynamic playbooks that can be reused with different values. In CommandWave, variables are denoted with a `$` symbol.

## Built-in Variables

CommandWave provides several built-in variables based on your terminal session:

```bash
# Display the built-in variables
echo "Terminal Port: $TERM_PORT"
echo "Terminal Name: $TERM_NAME"
```

## Creating Variables

You can create variables in two ways:

### 1. Using the Variables Panel

```bash
# No command needed - use the interface:
# 1. Locate the "Variables" section in the sidebar
# 2. Click the "Add Variable" button
# 3. Enter a Variable Title (user-friendly display name)
# 4. Enter a Variable reference (no spaces allowed, automatically prefixed with $)
# 5. Optionally provide an initial value
```

### 2. Defining Variables in the Terminal

```bash
# Define a variable directly in the terminal
export MY_VARIABLE="Hello World"

# Verify it exists
echo $MY_VARIABLE
```

## Variable Synchronization

CommandWave automatically synchronizes variables across all connected sessions:

```bash
# No command needed - variables sync automatically
# 1. When you set a variable in one browser window, it's available in all others
# 2. Variables persist between application restarts
# 3. Even custom variables sync between sessions
```

Variables are synchronized in real-time. If someone else changes a variable value in another browser window or device connected to the same server, your session will reflect those changes automatically. This is perfect for:

- Team collaboration on the same server
- Using CommandWave across multiple devices
- Ensuring consistency in distributed workflows

## Using Variables in Playbooks

Once defined, variables can be used in any command block:

```bash
# Example with a server address variable
ping -c 4 $SERVER_ADDRESS
```

```bash
# Example with multiple variables
ssh $USERNAME@$SERVER_ADDRESS -p $SSH_PORT
```

## Variable Substitution in Action

Let's see how variable substitution makes commands reusable:

```bash
# Define some directory paths
# (These would normally be in the Variables panel)
# TARGET_DIR="/var/log"
# BACKUP_DIR="/backup"

# Use variables to create a flexible backup command
mkdir -p $BACKUP_DIR
cp -r $TARGET_DIR $BACKUP_DIR/logs_$(date +%Y%m%d)
```

## Best Practices

1. Use clear, descriptive titles for your variables
2. Avoid spaces in variable references (use camelCase or snake_case)
3. Group related variables together
4. Set default values for common scenarios
5. For team environments, use standardized variable names

```bash
# Example of setting default values if not already defined
# (This would be in your actual shell script, not executed directly)
# SERVER_ADDRESS=${SERVER_ADDRESS:-"localhost"}
# SSH_PORT=${SSH_PORT:-22}
```

## Advanced Usage: Variable Manipulation

In more complex scenarios, you can manipulate variables:

```bash
# Extract a substring from a variable
FILENAME="document.txt"
echo ${FILENAME%.*}  # Removes extension, outputs "document"
```

```bash
# Default values for unset variables
echo ${UNDEFINED_VAR:-"default value"}
```

## Try It Yourself

Practice by creating and using variables:

```bash
# 1. Create TARGET_PATH variable in the Variables panel
# 2. Run this command to see its value
ls -la $TARGET_PATH
```

## Multi-Browser Synchronization Test

A great way to see variable synchronization in action:

```bash
# 1. Open CommandWave in two different browser windows
# 2. In Window 1: Create a new variable named "testSync" with value "Hello"
# 3. In Window 2: You'll see the variable appear automatically
# 4. In Window 2: Change the value to "Hello World"
# 5. In Window 1: You'll see the value update in real-time
```
