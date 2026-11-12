# 🛠️ Panduan Troubleshooting: Aplikasi Tidak Bisa Diakses Setelah Deployment

Dokumen ini menjelaskan secara menyeluruh akar masalah, arsitektur, dan langkah pemecahan masalah (*troubleshooting*) apabila aplikasi yang telah dideploy di platform **Colyin** mengalami kendala akses (seperti **404 Page Not Found**, **502 Bad Gateway**, atau koneksi ditolak).

---

## 📋 Daftar Isi
1. [Arsitektur Alur Request & Peran `minipaas-controller`](#1-arsitektur-alur-request--peran-minipaas-controller)
2. [Penyebab Utama 1: Traefik Docker API Version Mismatch (Error 404)](#2-penyebab-utama-1-traefik-docker-api-version-mismatch-error-404)
3. [Penyebab Utama 2: Controller Tidak Berjalan atau Crash](#3-penyebab-utama-2-controller-tidak-berjalan-atau-crash)
4. [Penyebab Utama 3: Port Mismatch & Binding 0.0.0.0 (Error 502 Bad Gateway)](#4-penyebab-utama-3-port-mismatch--binding-0000-error-502-bad-gateway)
5. [Penyebab Utama 4: Container Tidak Terhubung ke Network `minipaas-global`](#5-penyebab-utama-4-container-tidak-terhubung-ke-network-minipaas-global)
6. [Penyebab Utama 5: Konflik Port Host dengan Nginx Utama](#6-penyebab-utama-5-konflik-port-host-dengan-nginx-utama)
7. [Checklist Diagnostik & Perintah Verifikasi Cepat](#7-checklist-diagnostik--perintah-verifikasi-cepat)

---

## 1. Arsitektur Alur Request & Peran `minipaas-controller`

Untuk memahami mengapa aplikasi bisa gagal diakses, perhatikan alur request di bawah ini:

```
[ Pengunjung / Browser ]
          │
          ▼  (Port 80 / 443)
┌──────────────────────────────────────────────────────────────┐
│  Host Nginx Utama (Reverse Proxy di VPS)                      │
│  Meneruskan domain wildcard *.sslip.io ke Port 8080          │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼  (Port 8080)
┌──────────────────────────────────────────────────────────────┐
│  minipaas-traefik (Traefik v3.6 Ingress Engine)              │
│  - Membaca Docker labels secara dinamis via docker.sock      │
│  - Meneruskan request berdasarkan Host(`domain.sslip.io`)    │
└──────────────────────────────┬───────────────────────────────┘
                               │  (Network: minipaas-global)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  app_<slug>_<deployId> (Container Aplikasi Pengguna)        │
│  - Menjalankan aplikasi (Next.js / Vite / Express / Python)  │
│  - Wajib binding ke 0.0.0.0:${PORT}                          │
└──────────────────────────────────────────────────────────────┘
```

### Mengapa `minipaas-controller` Wajib Aktif (*Running*)?
Container `minipaas-controller` adalah **Control Plane / Otak** dari platform Colyin. Controller bertugas:
1. **Membangun Container Image:** Mengkloning repositori Git, mendeteksi buildpack, dan mengompilasi image Docker.
2. **Menyematkan Traefik Labels:** Saat menjalankan container aplikasi baru, controller otomatis menempelkan label Docker berikut:
   - `traefik.enable=true`
   - `traefik.docker.network=minipaas-global`
   - `traefik.http.routers.router-<slug>.rule=Host("<domain>")`
   - `traefik.http.routers.router-<slug>.entrypoints=web`
   - `traefik.http.services.router-<slug>.loadbalancer.server.port=<internalPort>`
3. **Mengaitkan ke Jaringan Mesh:** Menghubungkan container ke Docker bridge network `minipaas-global` agar Traefik bisa berkomunikasi dengan container secara internal.
4. **Menyuntikkan Environment Variables:** Menyuntikkan `PORT=<internalPort>` dan konfigurasi lainnya.

> ⚠️ **Catatan Penting:** Jika `minipaas-controller` mati, proses redeploy, pembuatan container baru, auto-routing Traefik, dan rekonsiliasi state tidak akan berjalan.

---

## 2. Penyebab Utama 1: Traefik Docker API Version Mismatch (Error 404)

### Gejala:
- Container aplikasi berstatus `Up` di `docker ps`.
- Domain aplikasi dibuka di browser tetapi menampilkan **`404 page not found`** bawaan Traefik.
- Saat mengecek log Traefik (`docker logs minipaas-traefik`), muncul pesan error berulang:
  ```text
  ERR Provider error, retrying ... error="Error response from daemon: client version 1.24 is too old. Minimum supported API version is 1.40, please upgrade your client to a newer version" providerName=docker
  ```

### Akar Masalah:
Docker Engine versi modern (v26+, v27+, v29+) menghentikan dukungan (*deprecated*) terhadap Docker Client API lawas versi 1.24 (minimal meminta API v1.40 atau v1.44).
Image Traefik versi lama (`traefik:v3.2`) memiliki bug bawaan di Go SDK Docker di mana ia melakukan *fallback hardcode* ke API v1.24 saat inisialisasi. Akibatnya:
- Docker daemon menolak koneksi Traefik.
- Traefik **sama sekali tidak bisa membaca container** yang sedang berjalan.
- Tabel routing Traefik kosong, sehingga seluruh request berujung `404 page not found`.

### Solusi:
1. Perbarui image Traefik ke **`traefik:v3.6`** di `docker-compose.yml`.
2. Tambahkan environment variable `DOCKER_API_VERSION=1.44` pada service `traefik`:
   ```yaml
   traefik:
     image: traefik:v3.6
     container_name: minipaas-traefik
     environment:
       - DOCKER_API_VERSION=1.44
     volumes:
       - "/var/run/docker.sock:/var/run/docker.sock:ro"
     networks:
       - minipaas-global
   ```
3. Recreate container Traefik:
   ```bash
   docker compose pull traefik
   docker compose up -d --force-recreate traefik
   ```

---

## 3. Penyebab Utama 2: Controller Tidak Berjalan atau Crash

### Gejala:
- Klik tombol **Redeploy** di dashboard tidak memberikan respon atau log build terhenti.
- Container aplikasi tidak dibuat atau tidak diperbarui di Docker daemon.

### Verifikasi:
Cek apakah container controller aktif:
```bash
docker ps -a --filter "name=minipaas-controller"
```

Jika statusnya `Exited` atau restart berulang kali, periksa log penyebab crash:
```bash
docker logs minipaas-controller --tail 50
```

### Penyebab Umum Crash Controller:
1. **Disk Server Penuh:**
   Pembersihan cache buildpack Docker yang menumpuk:
   ```bash
   docker builder prune -af
   docker system prune -af
   ```
2. **Izin Docker Socket:**
   Pastikan controller memiliki akses ke `/var/run/docker.sock` sesuai yang tertera di `docker-compose.yml`.
3. **Database SQLite Terkunci:**
   Pastikan folder `./data` memiliki izin baca-tulis:
   ```bash
   chmod -R 755 /opt/colyin/data
   ```

Jalankan kembali controller:
```bash
docker compose up -d controller
```

---

## 4. Penyebab Utama 3: Port Mismatch & Binding 0.0.0.0 (Error 502 Bad Gateway)

### Gejala:
- Halaman browser menampilkan **`Bad Gateway`** (HTTP status code 502).

### Akar Masalah:
Error 502 terjadi saat **Traefik berhasil menemukan routing rule**, tetapi gagal menghubungi container tujuan di belakangnya. Ada dua penyebab teknis utama:

#### Kasus A: Port Mismatch
Colyin mengalokasikan port internal dinamis (misalnya `3002`) untuk aplikasi Anda dan memberi label Traefik:
```text
traefik.http.services.router-app.loadbalancer.server.port=3002
```
Namun, di dalam container, script start aplikasi (misalnya static server SPA `serve`) di-hardcode ke port default `3000`:
- Traefik mencoba menghubungkan ke `app_container:3002`.
- Tidak ada proses yang mendengarkan di port 3002 (hanya port 3000 yang aktif).
- Traefik menerima *Connection Refused* &rarr; Mengembalikan **Bad Gateway**.

#### Kasus B: Binding ke Localhost (127.0.0.1)
Banyak web server secara default hanya mendengarkan di `127.0.0.1` (localhost internal container). Di dalam arsitektur Docker:
- `127.0.0.1` hanya dapat diakses oleh proses di dalam container yang sama.
- Koneksi dari Traefik melalui bridge network ditolak karena server tidak mendengarkan di interface publik container (`0.0.0.0`).

### Solusi:
Di `src/lib/engine/buildpacks.ts`, pastikan command start server SPA mengikat secara dinamis ke IP **`0.0.0.0`** dan port **`${PORT}`**:
```bash
serve -s dist -l tcp://0.0.0.0:${PORT:-3000}
```
Untuk aplikasi Node.js / Express / Next.js, pastikan server mendengarkan `process.env.PORT`:
```js
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0");
```

---

## 5. Penyebab Utama 4: Container Tidak Terhubung ke Network `minipaas-global`

### Gejala:
- Traefik mengembalikan `502 Bad Gateway` atau `Gateway Timeout`.
- Di log Traefik muncul pesan `dial tcp <ip>: connection timed out`.

### Akar Masalah:
Agar Traefik dapat merutekan traffic HTTP ke container aplikasi, **keduanya harus berada di dalam network Docker bridge yang sama** (`minipaas-global`).

### Verifikasi:
Periksa apakah container aplikasi terdaftar di jaringan `minipaas-global`:
```bash
docker inspect <nama_container_app> --format '{{json .NetworkSettings.Networks}}'
```

### Solusi:
Jika network `minipaas-global` belum terhubung, hubungkan secara manual:
```bash
docker network connect minipaas-global <nama_container_app>
```
*(Controller Colyin versi terbaru secara otomatis melakukan koneksi ini pada tahap deployment).*

---

## 6. Penyebab Utama 5: Konflik Port Host dengan Nginx Utama

### Gejala:
- Domain aplikasi membuka website lain yang sudah ada di VPS (misalnya domain personal/portofolio Nginx).
- Muncul peringatan sertifikat SSL tidak cocok (*SSL certificate name mismatch*).

### Solusi: Arsitektur Nginx di Depan, Traefik di Belakang
Jika VPS Anda sudah menggunakan Nginx untuk website lain di port 80 dan 443, jangan jalankan Traefik di port 80/443. Gunakan konfigurasi port sekunder:

1. Di file `/opt/colyin/.env`:
   ```env
   HTTP_PORT=8080
   PUBLIC_HTTP_PORT=80
   HTTPS_PORT=8443
   ENABLE_HTTPS=false
   ```
2. Buat konfigurasi proxy di Nginx VPS Anda (`/etc/nginx/sites-available/colyin-wildcard.conf`):
   ```nginx
   server {
       listen 80;
       server_name *.sslip.io;

       location / {
           proxy_pass http://127.0.0.1:8080;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```
3. Aktifkan dan reload Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/colyin-wildcard.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 7. Checklist Diagnostik & Perintah Verifikasi Cepat

Gunakan tabel dan perintah ringkas di bawah ini setiap kali melakukan troubleshooting:

| Langkah | Perintah CLI | Indikator Berhasil |
| :--- | :--- | :--- |
| **1. Cek Status Core Containers** | `docker ps` | `minipaas-controller` dan `minipaas-traefik` berstatus `Up`. |
| **2. Cek Log Traefik** | `docker logs minipaas-traefik --tail 30` | Tidak ada error API version `client version 1.24 is too old`. |
| **3. Cek Label Traefik App** | `docker inspect <nama_app> --format '{{json .Config.Labels}}'` | Berisi `traefik.enable=true` dan Host rule yang sesuai. |
| **4. Cek Network App** | `docker inspect <nama_app> --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'` | Terdapat `minipaas-global`. |
| **5. Cek Port Aktif di Container** | `docker logs <nama_app> --tail 20` | Aplikasi mencetak listening pada port yang sesuai (misal: 3000 / 3002). |
| **6. Tes Koneksi Internal dari Traefik** | `docker exec minipaas-traefik wget -qO- http://<nama_app>:<port>` | Mengembalikan HTML response aplikasi tanpa error. |

Dengan mengikuti panduan di atas, seluruh kendala terkait aplikasi tidak bisa diakses setelah deployment dapat diidentifikasi dan diselesaikan dengan cepat dan terstruktur.
