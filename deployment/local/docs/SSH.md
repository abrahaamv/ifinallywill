# SSH Remote Access Setup

Set up secure SSH access to manage your server from your development laptop.

## Why SSH?

- Remotely manage your server
- Run deployment commands from anywhere
- Transfer files securely
- No need to be physically at the server

## Step 1: Enable SSH on Server

```bash
# On your server

# Install OpenSSH server
sudo apt install openssh-server -y

# Start and enable SSH
sudo systemctl enable ssh
sudo systemctl start ssh

# Check status
sudo systemctl status ssh
```

## Step 2: Configure SSH Security

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config
```

Recommended settings:

```bash
# Disable root login
PermitRootLogin no

# Disable password authentication (after setting up keys)
# PasswordAuthentication no

# Allow specific users only
AllowUsers yourusername

# Change default port (optional, for extra security)
# Port 2222

# Limit authentication attempts
MaxAuthTries 3
```

```bash
# Restart SSH after changes
sudo systemctl restart ssh
```

## Step 3: Set Up SSH Keys (Recommended)

### On Your Development Laptop

```bash
# Generate SSH key pair (if you don't have one)
ssh-keygen -t ed25519 -C "your-email@example.com"

# This creates:
# ~/.ssh/id_ed25519 (private key - NEVER share)
# ~/.ssh/id_ed25519.pub (public key - share this)
```

### Copy Key to Server

```bash
# From your laptop
ssh-copy-id username@server-local-ip

# Or manually:
cat ~/.ssh/id_ed25519.pub | ssh username@server-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Disable Password Auth (After Keys Work)

```bash
# On server, edit SSH config
sudo nano /etc/ssh/sshd_config

# Change:
PasswordAuthentication no

# Restart SSH
sudo systemctl restart ssh
```

## Step 4: Find Server IP

### Local IP (for same network)

```bash
# On server
ip addr show | grep "inet " | grep -v 127.0.0.1

# Usually something like 192.168.1.x
```

### Public IP (for remote access)

```bash
curl ifconfig.me
```

## Step 5: Connect from Laptop

### Same Network (Local)

```bash
ssh username@192.168.1.xxx
```

### Different Network (Remote)

**Option A: Cloudflare Tunnel SSH (Recommended)**

```bash
# On your laptop, install cloudflared
brew install cloudflare/cloudflare/cloudflared  # macOS
# or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation

# Add to your tunnel routes (in Cloudflare Dashboard):
# ssh.yourdomain.com → ssh://localhost:22

# Connect via tunnel
cloudflared access ssh --hostname ssh.yourdomain.com
```

**Option B: Port Forwarding (Less Secure)**

1. Log into your router
2. Forward port 22 (or custom SSH port) to server local IP
3. Connect: `ssh username@your-public-ip`

**Option C: Tailscale (Easy Alternative)**

```bash
# Install Tailscale on both devices
# https://tailscale.com/download

# On server
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# On laptop
# Install Tailscale app
# Connect to same Tailscale network

# Connect via Tailscale IP
ssh username@100.x.x.x
```

## Step 6: SSH Config (Convenience)

Create `~/.ssh/config` on your laptop:

```bash
# AI Platform Server (local)
Host ai-platform-local
    HostName 192.168.1.xxx
    User platform
    IdentityFile ~/.ssh/id_ed25519

# AI Platform Server (via Cloudflare)
Host ai-platform
    HostName ssh.yourdomain.com
    User platform
    IdentityFile ~/.ssh/id_ed25519
    ProxyCommand cloudflared access ssh --hostname %h

# AI Platform Server (via Tailscale)
Host ai-platform-ts
    HostName 100.x.x.x
    User platform
    IdentityFile ~/.ssh/id_ed25519
```

Now you can simply:

```bash
ssh ai-platform
```

## Common SSH Commands

```bash
# Connect
ssh ai-platform

# Run single command
ssh ai-platform "cd ~/platform/deployment/local && ./scripts/status.sh"

# Copy files to server
scp file.txt ai-platform:~/

# Copy files from server
scp ai-platform:~/file.txt .

# Sync directories
rsync -avz ./local-folder/ ai-platform:~/remote-folder/

# Port forwarding (access server port locally)
ssh -L 8080:localhost:80 ai-platform
# Now localhost:8080 on laptop → server's localhost:80
```

## Quick Update Workflow

From your development laptop:

```bash
# 1. Push changes to GitHub
git add .
git commit -m "Update feature"
git push

# 2. SSH and update server
ssh ai-platform "cd ~/platform/deployment/local && ./scripts/update.sh"

# 3. Check status
ssh ai-platform "cd ~/platform/deployment/local && ./scripts/status.sh"
```

Or create a script on your laptop:

```bash
#!/bin/bash
# deploy-to-server.sh

echo "Pushing to GitHub..."
git push

echo "Updating server..."
ssh ai-platform "cd ~/platform/deployment/local && ./scripts/update.sh"

echo "Done!"
```

## Troubleshooting

### Connection Refused

```bash
# Check SSH is running on server
sudo systemctl status ssh

# Check firewall
sudo ufw status
# Should show: 22/tcp ALLOW
```

### Permission Denied

```bash
# Check key permissions
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub

# Check server authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Connection Timeout

- Check server is on and connected to network
- Verify correct IP address
- Check firewall/router settings

### Host Key Changed Warning

```bash
# If you reinstalled the server
ssh-keygen -R server-ip
```

## Security Best Practices

1. **Use SSH keys**, not passwords
2. **Disable root login**
3. **Use non-standard port** (optional)
4. **Keep server updated**
5. **Use fail2ban** to block brute force:

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```
