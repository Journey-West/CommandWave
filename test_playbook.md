# Sample Penetration Testing Playbook

This is a sample playbook demonstrating the CommandWave playbook format. It contains commands and explanations that can be used during a penetration test.

## Reconnaissance Phase

First, let's scan the target network to identify live hosts:

```bash
sudo nmap -sn $TargetIP/24 -oN network_scan.txt
```

Then, perform a more detailed scan on the discovered hosts:

```bash
sudo nmap -sV -sC -p- -T4 $TargetIP -oA detailed_scan
```

## Vulnerability Assessment

Check for common web vulnerabilities:

```bash
nikto -h http://$TargetIP
```

## Exploitation

If you find SSH running with weak credentials, try:

```bash
hydra -l $Username -P $Wordlist ssh://$TargetIP
```

## Post Exploitation

After gaining access, check system information:

```bash
uname -a
id
hostname
ifconfig
```
