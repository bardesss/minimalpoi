#!/usr/bin/env bash

# Copyright (c) 2021-2026 community-scripts ORG
# Author: Bardesss (bardesss)
# License: MIT | https://github.com/community-scripts/ProxmoxVED/raw/main/LICENSE
# Source: https://github.com/bardesss/minimalpoi

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

NODE_VERSION="26" setup_nodejs
PYTHON_VERSION="3.14" setup_uv

fetch_and_deploy_gh_release "minimalpoi" "bardesss/minimalpoi" "tarball"

msg_info "Setting up Python Environment"
cd /opt/minimalpoi/backend
# Keep the managed interpreter readable by the service user (not under /root).
export UV_PYTHON_INSTALL_DIR=/opt/minimalpoi/python
$STD uv sync --locked --no-editable --no-install-project --python 3.14
msg_ok "Set up Python Environment"

msg_info "Building Frontend"
cd /opt/minimalpoi/frontend
$STD npm ci --no-audit --no-fund
$STD npm run build
rm -rf /opt/minimalpoi/frontend/node_modules
msg_ok "Built Frontend"

msg_info "Configuring MinimalPOI"
mkdir -p /data
cat <<EOF >/opt/minimalpoi.env
MINIMALPOI_DATA_DIR=/data
# Behind a reverse proxy, set this to the proxy's IP so the app sees the real
# client IP and the https scheme (the LXC equivalent of the image's TRUST_PROXY).
FORWARDED_ALLOW_IPS=127.0.0.1
EOF
cat <<EOF >/opt/minimalpoi/version.env
MINIMALPOI_VERSION=$(cat ~/.minimalpoi)
EOF
msg_ok "Configured MinimalPOI"

msg_info "Creating Service"
id -u minimalpoi &>/dev/null || useradd --system --home /opt/minimalpoi --shell /usr/sbin/nologin minimalpoi
chown -R minimalpoi: /data /opt/minimalpoi
cat <<EOF >/etc/systemd/system/minimalpoi.service
[Unit]
Description=MinimalPOI
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=minimalpoi
Group=minimalpoi
WorkingDirectory=/opt/minimalpoi/backend
EnvironmentFile=/opt/minimalpoi.env
EnvironmentFile=-/opt/minimalpoi/version.env
Environment=HOME=/data
ExecStart=/opt/minimalpoi/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 7676 --workers 1
Restart=on-failure
RestartSec=5
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=/data
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable -q --now minimalpoi
msg_ok "Created Service"

motd_ssh
customize
cleanup_lxc
