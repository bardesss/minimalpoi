#!/usr/bin/env bash
_CS_DEFAULT_URL="https://raw.githubusercontent.com/bardesss/minimalpoi/main/proxmox"
_cs_boot="${COMMUNITY_SCRIPTS_CORE_DIR:-$(dirname "${BASH_SOURCE[0]}")/../../core}/core/build.func"
source "$_cs_boot" 2>/dev/null || source <(curl -fsSL "${COMMUNITY_SCRIPTS_CORE_URL:-https://raw.githubusercontent.com/community-scripts/core/main}/core/build.func")

# Copyright (c) 2021-2026 community-scripts ORG
# Author: Bardesss (bardesss)
# License: MIT | https://github.com/community-scripts/ProxmoxVED/raw/main/LICENSE
# Source: https://github.com/bardesss/minimalpoi

APP="MinimalPOI"
var_tags="${var_tags:-maps;travel}"
var_cpu="${var_cpu:-2}"
var_ram="${var_ram:-2048}"
var_disk="${var_disk:-8}"
var_os="${var_os:-debian}"
var_version="${var_version:-13}"
#var_arm64="${var_arm64:-no}" # unset = ask the user; set yes/no only when verified
var_unprivileged="${var_unprivileged:-1}"

header_info "$APP"
variables
color
catch_errors

function update_script() {
  header_info
  check_container_storage
  check_container_resources

  if [[ ! -d /opt/minimalpoi ]]; then
    msg_error "No ${APP} Installation Found!"
    exit
  fi

  if check_for_gh_release "minimalpoi" "bardesss/minimalpoi"; then
    msg_info "Stopping Service"
    systemctl stop minimalpoi
    msg_ok "Stopped Service"

    CLEAN_INSTALL=1 fetch_and_deploy_gh_release "minimalpoi" "bardesss/minimalpoi" "tarball"

    NODE_VERSION="26" setup_nodejs
    PYTHON_VERSION="3.14" setup_uv

    msg_info "Updating Python Environment"
    cd /opt/minimalpoi/backend
    $STD uv sync --locked --no-editable --no-install-project --python 3.14
    msg_ok "Updated Python Environment"

    msg_info "Building Frontend"
    cd /opt/minimalpoi/frontend
    $STD npm ci --no-audit --no-fund
    $STD npm run build
    rm -rf /opt/minimalpoi/frontend/node_modules
    msg_ok "Built Frontend"

    cat <<EOF >/opt/minimalpoi/version.env
MINIMALPOI_VERSION=$(cat ~/.minimalpoi)
EOF

    msg_info "Starting Service"
    systemctl start minimalpoi
    msg_ok "Started Service"
    msg_ok "Updated successfully!"
  fi
  exit
}

start
build_container
description

msg_ok "Completed Successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW}Access it using the following URL:${CL}"
echo -e "${GATEWAY}${BGN}http://${IP}:7676${CL}"
