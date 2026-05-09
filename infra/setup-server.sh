#!/bin/bash
# Kria EC2 server setup — run once on a fresh Ubuntu 22.04 t3a.medium
# Usage: bash setup-server.sh
set -e

echo "==> Updating system packages"
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> Installing Docker"
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker ubuntu

echo "==> Installing Nginx + Certbot"
sudo apt-get install -y nginx certbot python3-certbot-nginx

echo "==> Installing security tools"
sudo apt-get install -y fail2ban unattended-upgrades ufw

echo "==> Configuring UFW firewall"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "==> Configuring fail2ban"
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

echo "==> Enabling automatic security updates"
sudo dpkg-reconfigure --priority=low unattended-upgrades || true

echo "==> Hardening SSH"
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

echo "==> Done. Log out and back in for docker group to take effect."
echo "    Next: clone the repo, create .env.prod, copy nginx config, run certbot"
