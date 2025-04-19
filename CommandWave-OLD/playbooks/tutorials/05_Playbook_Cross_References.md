# CommandWave: Playbook Cross-References

This tutorial explains how to create and use cross-references between playbooks, allowing you to build an interconnected knowledge base.

## What are Playbook Cross-References?

Cross-references are links between playbooks that allow you to create a network of connected documentation. This is especially useful for:

- Breaking complex workflows into smaller, focused playbooks
- Creating a hierarchy of documentation (general guides linking to specific techniques)
- Establishing relationships between related tasks

## Creating Cross-References

To create a reference to another playbook, use this special syntax:

```markdown
[Link text](playbook:filename.md)
```

For example:

```markdown
See our [Network Scanning Guide](playbook:Network_Security_Scanning.md) for more details.
```

When clicked, CommandWave will load the referenced playbook automatically.

## Example Use Cases

### Main Index Playbook

Create a central index that links to all your specialized playbooks:

```markdown
# Penetration Testing Playbooks

## Information Gathering
- [Network Scanning](playbook:Network_Security_Scanning.md)
- [Web Enumeration](playbook:Web_Enumeration.md)

## Exploitation
- [Windows Exploitation](playbook:Windows_Exploitation.md)
- [Linux Exploitation](playbook:Linux_Exploitation.md)

## Post-Exploitation
- [Privilege Escalation](playbook:Privilege_Escalation.md)
- [Data Exfiltration](playbook:Data_Exfiltration.md)
```

### Procedural Workflows

Create step-by-step workflows that connect multiple playbooks:

```markdown
# Network Assessment Workflow

1. [Initial Reconnaissance](playbook:Initial_Recon.md)
2. [Network Scanning](playbook:Network_Security_Scanning.md)
3. [Vulnerability Assessment](playbook:Vulnerability_Assessment.md)
4. [Exploitation](playbook:Exploitation.md)
5. [Documentation](playbook:Report_Writing.md)
```

## Synchronized Playbook References

When you upload or create a new playbook, it becomes immediately available for cross-referencing across all browser sessions:

```bash
# No command needed - playbooks synchronize automatically
# 1. Create a new playbook in one browser window
# 2. The playbook is immediately available for cross-referencing in other windows
# 3. Any changes to playbooks sync across all sessions
```

## Best Practices for Cross-References

1. **Use Descriptive Link Text**: Make link text clear and descriptive
2. **Consistent Naming**: Use a consistent naming convention for playbooks
3. **Avoid Circular References**: Be careful not to create loops of references
4. **Maintain Hierarchy**: Create a logical structure (general → specific)
5. **Keep Context**: Ensure each playbook provides enough context to stand alone

## External Links vs. Playbook Links

CommandWave differentiates between cross-references and external links:

- Playbook references: `[Text](playbook:filename.md)` - Opens in CommandWave
- External links: `[Text](https://example.com)` - Opens in a new browser tab

## Try It Yourself

Create a series of connected playbooks:

1. Create a main index playbook that references other playbooks
2. Create several topic-specific playbooks
3. Add cross-references between related playbooks
4. Test the navigation by clicking the links

```bash
echo "You've completed the Playbook Cross-References tutorial!"
```
