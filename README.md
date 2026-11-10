<p align="center">
  <img src="./public/logo.png" width="120" height="120" alt="Colyin Logo" />
</p>

<h1 align="center">Colyin</h1>

<p align="center">
  <strong>Self-Hosted PaaS & Modern Serverless Engine</strong><br />
  A lightweight, developer-friendly alternative to Coolify, Railway, and Vercel for self-hosting apps, databases, and message brokers on any server.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Docker-Engine-2496ED?style=flat-square&logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat-square&logo=tailwind-css" alt="TailwindCSS v4" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma" alt="Prisma" />
</p>

---

## 🌟 Overview

**Colyin** is an all-in-one, self-hosted Platform-as-a-Service (PaaS) designed to give developers the effortless deployment experience of modern cloud platforms (like Vercel and Railway) on their own VPS or bare-metal server, without the complexity of Kubernetes.

Connect your Git repository, and Colyin handles source code cloning, stack detection, container compilation, SSL certificate provisioning, internal mesh networking, and reverse proxy routing automatically.

---

## ✨ Key Features

### 🚀 Automated Git CI/CD
- **One-Click Deployments:** Deploy directly from GitHub repositories (Public and Private).
- **Git Push Webhooks:** Automatic deployments whenever you push code to your target branch.
- **Real-Time Telemetry:** Stream live build logs and runtime health checks via SSE.

### 🧠 Smart Stack Detection & Auto-Buildpack
- Automatic language & framework detection for **Node.js (Next.js, Vite, Express, NestJS)**, **Python (FastAPI, Django, Flask)**, **Go**, **PHP**, and **Static Sites**.
- **Universal Dockerfile Synthesis:** Automatically generates multi-stage production Dockerfiles if your repository doesn't have one.

### 🗄️ Dedicated Addons & Managed Databases
All addons run as **fully dedicated, isolated instances** (no shared data, dedicated ports, unique persistent volumes, and encrypted passwords):
- 🐘 **PostgreSQL:** Dedicated database instance with built-in **Web SQL Studio** in the browser (execute queries without installing DBeaver or JDBC drivers).
- ⚡ **Redis:** Ultra-fast in-memory cache with built-in **Web Redis Studio & Cache Inspector** (Key-Value explorer, real-time memory metrics, and live RESP CLI console).
- 🐰 **RabbitMQ:** AMQP message broker on port `10002` + official **Web Management Console** on port `15672` (`http://localhost:15672`).
- 🪣 **MinIO:** High-performance S3-compatible object storage with web console.

### ⚡ Smart Dual-Engine Architecture
- **Production Mode (Docker Online):** Deploys official OCI Docker containers (`postgres:16-alpine`, `redis:7-alpine`, `rabbitmq:3-management-alpine`), isolated bridge networks, and CPU/RAM cgroups v2 quotas.
- **Development Mode (Local Standalone):** Seamless bare-metal fallback when Docker is offline, enabling full development on laptops without the memory overhead of Docker Desktop.

### 🌐 Automated Ingress & Reverse Proxy
- Integrated reverse proxy listening on **Ports 80 (HTTP) and 443 (HTTPS)**.
- **Zero-Config Domains:** Automatic wildcard subdomains via `*.sslip.io` using your server's public IP, or point your own custom domain.
- Transparent SSL termination with automated Let's Encrypt certificates.

### 👥 Team Collaboration & RBAC Security
- Granular permissions with **Admin**, **Developer**, and **Viewer** roles.
- All sensitive tokens and database passwords are encrypted at rest using **AES-256-GCM**.

---

## 🏛️ System Architecture

```mermaid
flowchart TB
    User([🌐 Users / Web Browsers])
    Dev([💻 Developer / Laptop])

    subgraph Server ["🖥️ Server VPS / Host"]
        subgraph Edge ["Edge Layer (Ports 80 & 443)"]
            Ingress["Traefik v3 / Colyin Ingress Proxy\n(Auto HTTPS / Let's Encrypt)"]
        end

        subgraph Core ["Colyin Platform Core (Port 3000)"]
            Controller["Colyin Controller & Next.js Dashboard"]
            Prisma[(SQLite / Database Engine)]
        end

        subgraph Addons ["Managed Addons (Isolated Containers)"]
            PG["PostgreSQL :10000\n(Web SQL Studio)"]
            Redis["Redis :10001\n(Web Redis Studio)"]
            Rabbit["RabbitMQ :10002\n(Web Console :15672)"]
        end

        subgraph Apps ["User Applications"]
            App1["App A (e.g. Next.js :3001)"]
            App2["App B (e.g. FastAPI :3002)"]
        end
    end

    User -->|HTTPS| Ingress
    Ingress -->|Forward| App1
    Ingress -->|Forward| App2
    Ingress -->|Forward| Controller

    Dev -->|Manage| Controller
    Dev -->|DBeaver / TablePlus| PG
    Dev -->|RedisInsight / redis-cli| Redis
    Dev -->|Web Browser :15672| Rabbit

    App1 -.->|Internal Network| PG
    App2 -.->|Internal Network| Redis
    App2 -.->|AMQP| Rabbit
```

---

## 🔌 Default Port Reference

| Service | Protocol | Default Port | Description |
| :--- | :--- | :--- | :--- |
| **Colyin Dashboard** | HTTP/HTTPS | `3000` | Web control panel & management UI |
| **Ingress HTTP** | HTTP | `80` | Reverse proxy edge router |
| **Ingress HTTPS** | HTTPS | `443` | SSL/TLS wildcard reverse proxy |
| **PostgreSQL** | Wire (PGlite / Docker) | `10000` | Dedicated database port (DBeaver / Prisma) |
| **Redis** | RESP Wire | `10001` | Dedicated cache port (ioredis / RedisInsight) |
| **RabbitMQ AMQP** | AMQP 0-9-1 | `10002` | Message queue worker protocol |
| **RabbitMQ Web UI** | HTTP | `15672` | Official RabbitMQ Web Management Console |

---

## 🚀 Installation & Quick Start

### 📖 Tutorial Pemasangan Lengkap di Server VPS (Step-by-Step)

Panduan ini ditujukan untuk Anda yang ingin memasang Colyin dari nol di server VPS baru (misal: DigitalOcean, AWS EC2, IDCloudHost, Contabo, Hetzner, atau Linode).

#### Langkah 1: Persiapan VPS & Buka Port Firewall
Pastikan server Anda menggunakan **Ubuntu 22.04 LTS atau 24.04 LTS**. Di panel cloud provider Anda (Security Groups / Firewall), pastikan port-port berikut diizinkan (*Inbound Allow*):
* `22` (SSH)
* `80` & `443` (HTTP & HTTPS Ingress Reverse Proxy)
* `3000` (Colyin Web Dashboard)
* `10000 - 10020` (Public Range untuk PostgreSQL & Redis)
* `15672` (RabbitMQ Web Management Console)

#### Langkah 2: Login ke VPS via SSH
Buka terminal di komputer/laptop Anda, lalu hubungkan ke VPS:
```bash
ssh root@ip_vps_anda
```

#### Langkah 3: Download Colyin dari GitHub
Download source code Colyin ke direktori `/opt/colyin`:
```bash
git clone https://github.com/your-username/colyin.git /opt/colyin
cd /opt/colyin
```

#### Langkah 4: Jalankan Script Pemasangan Otomatis (1 Command)
Jalankan script installer bawaan Colyin:
```bash
bash install.sh
```

**Proses yang berjalan otomatis:**
1. Mengupdate package apt server dan menginstall curl & git.
2. Menginstall Docker Engine & Docker Compose resmi terbaru (jika belum ada).
3. Mengatur rule firewall UFW server.
4. Mendeteksi IP Public VPS Anda secara otomatis dan membuat file `.env` dengan encryption master key acak.
5. Membangun container dan menjalankan Colyin di latar belakang via Docker Compose.

#### Langkah 5: Buka Dashboard & Buat Akun Administrator Pertama
1. Buka browser di laptop Anda dan akses:
   ```
   http://<ip_vps_anda>:3000
   ```
2. Anda akan diarahkan ke halaman login/register.
3. Daftarkan akun pertama Anda. **User pertama yang mendaftar secara otomatis diberikan hak akses `ADMIN` penuh.**

#### Langkah 6: Konfigurasi Domain Publik (Settings)
1. Di dashboard Colyin, buka menu **Settings & Team** di navbar atas.
2. Periksa kolom **Wildcard Domain**:
   * Jika tidak punya nama domain: Cukup biarkan terisi `<ip_vps_anda>.sslip.io`. Setiap aplikasi Anda otomatis dapat diakses publik dari internet!
   * Jika punya nama domain sendiri (misal `apps.domainanda.com`):
     * Di DNS provider domain Anda (Cloudflare, Niagahoster, dll), tambahkan **DNS A Record**: `*.apps` mengarah ke IP VPS Anda.
     * Masukkan `apps.domainanda.com` pada kolom Wildcard Domain di dashboard Colyin, lalu klik **Save Settings**.

#### Langkah 7: Deploy Service Pertama & Database Addons
1. Di halaman **Projects**, buat project baru (misal: `production`).
2. **Deploy Aplikasi:**
   * Klik **"New Service"** &rarr; masukkan URL Git repository Anda (Public atau Private).
   * Klik **"Deploy"**. Sistem akan otomatis mendeteksi stack, compile OCI container, dan memberikan URL HTTPS aktif.
3. **Tambah Database / Message Broker:**
   * Klik **"New Addon"** &rarr; pilih **PostgreSQL**, **Redis**, atau **RabbitMQ**.
   * Buka halaman addon untuk melihat connection string dan mengakses **Web SQL Studio** (Postgres), **Web Redis Studio**, atau **RabbitMQ Web Management Console** (`http://<ip_vps>:15672`).

---

---

## 🔄 Panduan Memperbarui (Upgrade / Update) Colyin di Server VPS

Ketika ada pembaruan fitur, rilis versi baru, atau patch keamanan pada Colyin, Anda dapat memperbarui instalasi Colyin di server VPS Anda dengan sangat mudah dan aman.

> [!NOTE]
> **Jaminan Keamanan Data (Zero Data Loss):**
> Database Colyin disimpan secara persisten di folder host `./data/prod.db` dan kredensial enkripsi tersimpan di file `.env`. Menjalankan proses update **TIDAK AKAN MENGHAPUS** project, aplikasi, database addons (PostgreSQL, Redis, RabbitMQ), domain SSL, maupun akun pengguna Anda.

### Cara 1: Update Cepat via Git & Docker Compose (Rekomendasi)
Buka terminal dan hubungkan ke VPS Anda via SSH, lalu jalankan:

```bash
# 1. Pindah ke direktori Colyin
cd /opt/colyin

# 2. Ambil update kode terbaru dari repository Git
git pull

# 3. Rebuild dan restart container Colyin di latar belakang
docker compose up -d --build
```

Proses ini hanya memakan waktu 30–60 detik. Setelah container baru aktif, Anda dapat langsung me-refresh browser Anda.

---

### Cara 2: Update via One-Line Script Installer
Anda juga bisa menjalankan ulang script installer bawaan Colyin:

```bash
cd /opt/colyin
bash install.sh
```

Script installer Colyin secara otomatis mendeteksi database `./data/prod.db` dan file `.env` yang sudah ada, sehingga sistem akan menjaga konfigurasi lama dan hanya memperbarui container ke versi terbaru.

---

### 🔧 Perintah Perawatan & Maintenance Server

Berikut perintah terminal yang berguna saat mengelola server Colyin di `/opt/colyin`:

```bash
# 1. Melihat status seluruh container Colyin
docker compose ps

# 2. Melihat realtime log Colyin controller & Traefik
docker compose logs -f

# 3. Restart seluruh service Colyin
docker compose restart

# 4. Memperbarui Colyin ke versi kode terbaru dari Git
git pull
docker compose up -d --build

# 5. Menghentikan Colyin sementara
docker compose down
```

### Option 2: Docker Compose Deployment

If you already have Docker installed on your server:

1. Clone repository:
   ```bash
   git clone https://github.com/your-username/colyin.git
   cd colyin
   ```

2. Create your `.env` configuration:
   ```bash
   cp .env.example .env
   ```
   *(Ensure `PUBLIC_IP` and `WILDCARD_DOMAIN` are set to your server's IP or domain).*

3. Start services:
   ```bash
   docker compose up -d --build
   ```

---

### Option 3: Local Development (Without Docker)

You can run Colyin locally on Windows, macOS, or Linux without installing Docker Desktop:

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/your-username/colyin.git
   cd colyin
   npm install
   ```

2. Initialize database schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. Start local development server & daemons:
   ```bash
   # Terminal 1: Next.js Frontend & API
   npm run dev

   # Terminal 2: Background Addons Engine (PostgreSQL, Redis, RabbitMQ)
   npm run addons

   # Terminal 3: Ingress Reverse Proxy (Ports 80/443)
   npm run ingress
   ```

4. Open **`http://localhost:3000`** in your browser.

---

## ⚙️ Environment Configuration (`.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Set to `production` on live servers |
| `PUBLIC_IP` | `localhost` | Public IP of the VPS for remote database connections |
| `WILDCARD_DOMAIN` | `127.0.0.1.sslip.io` | Wildcard base domain (e.g. `103.xxx.sslip.io` or `apps.domain.com`) |
| `ENCRYPTION_MASTER_KEY`| *(auto-generated)* | 64-character hex master key for AES-256-GCM encryption |
| `DATABASE_URL` | `file:./dev.db` | SQLite storage file path |
| `ADMIN_ALERT_EMAIL` | `admin@example.com` | Email recipient for system alerts & notifications |
| `GITHUB_CLIENT_ID` | *(optional)* | GitHub OAuth App client ID for private repos |
| `GITHUB_CLIENT_SECRET`| *(optional)* | GitHub OAuth App client secret |

---

## 🔐 Credentials, Security & Default Admin Setup

Colyin menerapkan standar keamanan enterprise untuk instalasi mandiri:

### 1. Unique Master Credentials (Auto-Generated)
Ketika Colyin pertama kali di-deploy di VPS baru:
- Sistem secara otomatis membuat akun Administrator pertama dengan email dan **password unik acak berkekuatan tinggi** (16 karakter alfanumerik & simbol).
- Password unik ini otomatis dicatat ke dalam file:
  ```bash
  cat /opt/colyin/colyin-credentials.txt
  ```
- File ini aman dan hanya dapat dibaca oleh pengguna dengan akses root/sudo di server Anda.
- Saat `NODE_ENV=production`, **tidak ada akun dummy atau sample credentials yang bocor** ke publik.

### 2. Cara Reset / Mengubah Password Admin
Jika Anda lupa password administrator atau ingin menggantinya langsung dari terminal server:
```bash
node scripts/reset-admin-password.js admin@colyin.local PasswordBaru123!
```
Password baru akan langsung di-hash menggunakan BCrypt dan file `colyin-credentials.txt` akan diperbarui secara otomatis.

### 3. Role-Based Access Control (RBAC) & Collaborator
Sebagai Administrator, Anda dapat membuat akun kolaborator untuk tim Anda di menu **Settings -> Team & Users**:
- **ADMIN:** Hak penuh untuk mengelola pengguna, menghapus project, mengubah domain global, dan mengonfigurasi alert.
- **DEVELOPER:** Dapat membuat, mendeploy, dan mengonfigurasi aplikasi serta database addons.
- **VIEWER:** Akses *read-only* untuk memantau status aplikasi, metriks, dan build logs tanpa izin mengubah konfigurasi.

---

## ⚡ Panduan Setup Auto-Deploy GitHub Webhook

Colyin mendukung continuous deployment (CI/CD) otomatis langsung dari GitHub tanpa menghabiskan kuota menit GitHub Actions Anda:

### Langkah-langkah:
1. Buka repository Anda di GitHub, lalu klik tab **Settings** &rarr; **Webhooks** &rarr; **Add webhook**.
2. Masukkan konfigurasi berikut:
   - **Payload URL:** `https://<domain-colyin-anda>/api/webhooks/github` (atau `http://<ip-vps>:3000/api/webhooks/github`)
   - **Content type:** Pilih `application/json`
   - **Secret:** *(Opsional)* Jika Anda mengisi `GITHUB_WEBHOOK_SECRET` di `.env`, masukkan string yang sama di sini.
   - **Which events would you like to trigger this webhook?:** Pilih **Just the push event**.
   - **Active:** Pastikan dicentang.
3. Klik **Add webhook**.
4. **Selesai!** Setiap kali Anda menjalankan `git push` ke branch utama (atau branch target yang dipilih), GitHub akan mengirim notifikasi ke Colyin, dan server Colyin akan langsung men-clone kode terbaru, menjalankan build Nixpacks/Docker, dan merestart aplikasi tanpa downtime.

---

## 🔑 Deploy Private Git Repository

Untuk men-deploy repositori privat dari GitHub / GitLab:
1. **Menggunakan Personal Access Token (PAT):**
   - Buat Fine-Grained atau Classic PAT di GitHub (`Settings -> Developer settings -> Personal access tokens`) dengan izin `repo:read`.
   - Di Colyin saat menambahkan Service, masukkan Git URL dalam format:
     ```text
     https://<TOKEN>@github.com/username/private-repo.git
     ```
   - Atau simpan sebagai environment variable aplikasi dengan nama `GIT_AUTH_TOKEN`. Colyin mengenkripsi token ini menggunakan **AES-256-GCM** sebelum disimpan ke database.
2. **Menggunakan GitHub OAuth App:**
   - Masukkan `GITHUB_CLIENT_ID` dan `GITHUB_CLIENT_SECRET` Anda di menu **Settings -> GitHub OAuth**.
   - Colyin akan mengautentikasi akun Anda secara native.

---

## 📚 Edisi Platform: Core vs Cloud

Colyin hadir dalam dua edisi yang saling melengkapi:
- **Colyin Core (Repository ini):** Edisi murni self-hosted open-source tanpa beban landing page promosi. Langsung masuk ke console inti setelah login untuk mengelola server dan cluster Anda sendiri.
- **Colyin Cloud (`colyin-cloud`):** Layanan managed cloud computing (SaaS) siap pakai bagi mereka yang ingin mendeploy tanpa harus menyewa atau merawat server VPS sendiri. Dilengkapi landing page modern, dokumentasi interaktif, dan multi-region cluster.

---

## 🔌 Managed Addon Ports & Access Details

| Addon | Protocol | Internal / Host Port | Web GUI Console | Default Credentials |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | TCP / Wire | `10000` | In-Console SQL Studio | Auto-generated per database |
| **Redis** | RESP / TCP | `10001` | In-Console Redis Studio CLI | `colyin_redis_secret` |
| **RabbitMQ** | AMQP / TCP | `10002` | `http://localhost:15672` | `guest` / `guest` |
| **Ingress HTTP** | HTTP | `80` | Automatic Router | N/A |
| **Ingress HTTPS**| HTTPS | `443` | Auto TLS Certificate | N/A |

---

## 🌐 REST API Endpoints Quick Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/system/status` | Docker daemon online status and resource telemetry |
| `GET` | `/api/auth/me` | Current authenticated session payload and RBAC role |
| `POST` | `/api/auth/login` | Authenticate with work email and password |
| `POST` | `/api/projects` | Provision a new isolated project virtual network |
| `POST` | `/api/applications` | Create and bind application to a project canvas |
| `POST` | `/api/deployments/trigger` | Trigger asynchronous container build and deployment |
| `GET` | `/api/addons/redis/keys` | Browse active Redis keys and cache values |
| `POST` | `/api/addons/redis/cli` | Execute raw RESP command in live Redis engine |

---

## 🤝 Contributing to Open Source

Colyin is 100% open-source software under the **MIT License**. We welcome contributions from developers worldwide!

### How to Contribute:
1. **Fork the Repository** on GitHub.
2. **Create a Feature Branch:** `git checkout -b feature/amazing-feature`.
3. **Commit your changes:** `git commit -m 'feat: add amazing feature'`.
4. **Push to the Branch:** `git push origin feature/amazing-feature`.
5. **Open a Pull Request** describing your changes and test coverage.

### Development Guidelines:
- Ensure clean code standards with `npm run lint`.
- Verify TypeScript types without errors using `npx tsc --noEmit`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) &mdash; feel free to customize, self-host, and distribute.
Colyin is built by developers, for developers.
