# Installing Zerra

Zerra runs entirely on your own machine. There is no cloud account required.
All you need is **Docker Desktop** and **4 GB of free RAM**.

---

## Option 1 — One-line installer (recommended)

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/sjsreehari/zerra/main/install.sh | bash
```

**Windows (run PowerShell as Administrator):**
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm https://raw.githubusercontent.com/sjsreehari/zerra/main/install.ps1 | iex
```

The installer will:
1. Check that Docker and Git are installed
2. Clone the repository to `~/.zerra`
3. Generate a secure `JWT_SECRET` automatically
4. Start all services with `docker compose up -d`
5. Wait for the inference API to become healthy
6. Print the dashboard URL

---

## Option 2 — npm global CLI

Requires **Node.js 18+** and **Docker**.

```bash
npm install -g @zerra/cli
zerra init
```

This installs the `zerra` command globally and starts the Docker stack.

### CLI commands

| Command | Description |
|---|---|
| `zerra init` | Start Zerra and open the dashboard |
| `zerra doctor` | Check all prerequisites |
| `zerra scan <path>` | Scan a local path or GitHub URL |
| `zerra vault list` | List stored credential keys |
| `zerra vault set <key>` | Store a credential |
| `zerra vault github-token <url>` | Store a scoped GitHub token |
| `zerra logs` | Stream all service logs |
| `zerra stop` | Stop all services |
| `zerra update` | Pull latest images and restart |

---

## Option 3 — Manual Docker Compose

```bash
# 1. Clone
git clone https://github.com/sjsreehari/zerra
cd zerra

# 2. Configure
cp .env.example .env
# Open .env and set JWT_SECRET to a random 32-char string:
#   openssl rand -base64 32   (macOS/Linux)
#   [System.Web.Security.Membership]::GeneratePassword(32,6)   (PowerShell)

# 3. Start
docker compose up -d

# 4. Open
open http://localhost:3000    # macOS
start http://localhost:3000   # Windows
xdg-open http://localhost:3000  # Linux
```

---

## Option 4 — Pre-built Docker images (no clone needed)

For servers or CI where you don't want to build locally:

```bash
# Download only the Compose file
curl -O https://raw.githubusercontent.com/sjsreehari/zerra/main/compose.yaml
curl -O https://raw.githubusercontent.com/sjsreehari/zerra/main/.env.example
cp .env.example .env
# Edit .env — set JWT_SECRET

# Run with pre-built GHCR images
ZERRA_VERSION=0.2.0 docker compose up -d
```

---

## System requirements

| Component | Minimum | Recommended |
|---|---|---|
| RAM | 4 GB | 8 GB |
| Disk | 4 GB | 10 GB |
| OS | macOS 12+, Ubuntu 20.04+, Windows 10/11 | — |
| Docker | Desktop 4.x+ or Engine + Compose v2 | Latest |
| Node.js | 18+ (for CLI only) | 20 LTS |

---

## Service ports

| Service | Port | URL |
|---|---|---|
| Dashboard | 3000 | http://localhost:3000 |
| AI Agent / Inference API | 8000 | http://localhost:8000 |
| Gateway (Go) | 8080 | http://localhost:8080 |
| Nginx (optional) | 80 | http://localhost |

> **Firewall note:** All ports bind to `localhost` by default. Nothing is exposed to the internet unless you explicitly forward ports.

---

## Configuration

The `.env` file controls all settings. Key variables:

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | **Yes** | Signing key for auth tokens (32+ chars) |
| `GITHUB_TOKEN` | Optional | PAT for opening pull requests |
| `GITHUB_WEBHOOK_SECRET` | Optional | Validates webhook payloads |
| `OLLAMA_BASE_URL` | Optional | Local LLM (default: `http://localhost:11434`) |
| `ANTHROPIC_API_KEY` | Optional | Claude API for AI fixes |
| `OPENAI_API_KEY` | Optional | OpenAI API for AI fixes |
| `SLACK_WEBHOOK_URL` | Optional | Slack notifications |
| `DISCORD_WEBHOOK_URL` | Optional | Discord notifications |

See `.env.example` for the full reference.

---

## First-time setup checklist

1. ✅ Open http://localhost:3000
2. ✅ Register your local admin account (first user becomes admin)
3. ✅ Go to **Settings → Credentials** and add your GitHub Personal Access Token
4. ✅ Go to **Repositories → Add Repository** and paste a GitHub repo URL
5. ✅ Click **Scan Now** to run your first security scan
6. ✅ Review findings in **Findings** and open a fix PR from **Scans**

---

## Stopping and updating

```bash
# Stop all services (data is preserved)
docker compose stop

# Remove everything including data volumes (destructive!)
docker compose down -v

# Update to the latest release
zerra update
# or
git pull && docker compose pull && docker compose up -d
```

---

## Troubleshooting

### Services don't start
```bash
# Check logs
docker compose logs inference
docker compose logs gateway
docker compose logs postgres
```

### Inference API health check fails
- Make sure no other service is using port 8000
- Check: `docker compose logs inference -n 50`

### JWT_SECRET error on startup
- The `.env` file must have `JWT_SECRET` set to at least 32 characters
- Generate: `openssl rand -base64 32`

### Can't open pull requests
- Add a GitHub fine-grained PAT in **Settings → Credentials**
- Required permissions: `Contents: Read & Write`, `Pull Requests: Read & Write`

---

## Uninstalling

```bash
# Stop and remove containers + volumes
docker compose down -v

# Remove the Zerra data directory
rm -rf ~/.zerra

# Uninstall CLI (if installed via npm)
npm uninstall -g @zerra/cli
```

---

## Getting help

- 📖 [Documentation](https://github.com/sjsreehari/zerra/blob/main/docs/ARCHITECTURE.md)
- 🐛 [Report a bug](https://github.com/sjsreehari/zerra/issues/new?template=bug_report.yml)
- 💬 [Discussions](https://github.com/sjsreehari/zerra/discussions)
- 🔐 [Security issues](https://github.com/sjsreehari/zerra/blob/main/SECURITY.md)
