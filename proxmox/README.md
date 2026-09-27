# Proxmox VE Community Scripts installer

These are the MinimalPOI files for [Proxmox VE Community Scripts](https://community-scripts.org/),
laid out the way the upstream repository expects:

- `ct/minimalpoi.sh`: runs on the Proxmox host. It creates the LXC and also holds the `update_script()` hook.
- `install/minimalpoi-install.sh`: runs inside the new container. It installs Node, Python and uv,
  builds the app from the latest GitHub release and sets up the `minimalpoi` systemd service.
- `json/minimalpoi.json`: the catalogue metadata (slug, port, resources, notes).

This copy is the one we maintain. A submission to
[community-scripts/ProxmoxVED](https://github.com/community-scripts/ProxmoxVED) is a snapshot of it,
with one change: drop the `_CS_DEFAULT_URL=` line at the top of `ct/minimalpoi.sh`. That line
makes the engine fetch `install/minimalpoi-install.sh` from this repository instead of from
ProxmoxVED, so the script also works on its own:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/bardesss/minimalpoi/main/proxmox/ct/minimalpoi.sh)"
```

Run the one-liner on the Proxmox host to create a container. Run it inside the container to update
an existing install.

## Layout inside the container

| Path | Contents |
| --- | --- |
| `/opt/minimalpoi` | Release source, `backend/.venv` and the built `frontend/dist`. An update replaces it. |
| `/opt/minimalpoi.env` | Service settings (`MINIMALPOI_DATA_DIR`, `FORWARDED_ALLOW_IPS`, and optionally `SESSION_LIFETIME_DAYS`, `SECRET_KEY`) |
| `/data` | SQLite database, uploaded images, `secret.key`. Back this up. |

The service runs a single uvicorn worker on purpose: live route collaboration keeps its
update fan-out in process memory.
