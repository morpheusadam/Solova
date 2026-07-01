<div align="center">

# Solova

**A modern, lightweight, self-hosted web application — Dockerized and served securely over Cloudflare.**

[🌐 Live Demo](https://solova.lavzen.com) · [🐛 Report a Bug](https://github.com/morpheusadam/Solova/issues) · [✨ Request a Feature](https://github.com/morpheusadam/Solova/issues)

</div>

---

## About Solova

**Solova** is a self-hosted web application built and maintained under the [Lavzen](https://lavzen.com) platform. It ships as a minimal **Docker Compose** stack, serves over **HTTPS through a Cloudflare Tunnel**, and is designed to stay fast, portable, and easy to deploy on any machine that runs Docker — no public IP address or open firewall ports required.

> 🚧 **Project status:** early development. The current release is the deployment foundation with a placeholder landing page — the full application is being built on top of it.

## Key Features

- ⚡ **Lightweight** — served by Nginx (Alpine), minimal resource footprint
- 🐳 **One-command deployment** — `docker compose up -d` and you're live
- 🔒 **Secure by default** — HTTPS via Cloudflare Tunnel, no exposed ports
- 🔁 **Self-healing** — automatic container restart on failure or reboot
- 📦 **Portable** — runs anywhere Docker runs (Linux, WSL2, VPS, bare metal)

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Web server | Nginx (Alpine)                      |
| Runtime    | Docker / Docker Compose             |
| Edge & TLS | Cloudflare Tunnel + Cloudflare DNS  |
| Hosting    | Self-hosted (WSL2 / Linux)          |

## Quick Start

```bash
git clone https://github.com/morpheusadam/Solova.git
cd Solova
docker compose up -d
```

The app is now available at `http://127.0.0.1:8090`.

## Deployment

Production runs behind a **Cloudflare Tunnel**: the container binds only to `127.0.0.1`, and Cloudflare routes `solova.lavzen.com` to it over an outbound-only encrypted tunnel — no port forwarding, no exposed origin.

## Roadmap

- [x] Deployment foundation — Docker, Cloudflare Tunnel, custom subdomain
- [x] Placeholder landing page
- [ ] Core application *(in progress)*

## Author

Built by **[Morpheus Adam](https://github.com/morpheusadam)** · part of the **[Lavzen](https://lavzen.com)** ecosystem.

If you find this project useful, give it a ⭐ — it helps others discover it.
