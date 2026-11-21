BOLA168 - Paket website siap deploy

Isi:
- index.html: tampilan live score, hari ini, jadwal
- netlify/functions/football.js: proxy aman ke API-Football
- netlify.toml: konfigurasi Netlify

PENTING:
1. API_FOOTBALL_KEY harus ditambahkan di Netlify > Site configuration > Environment variables.
2. Fungsi Netlify harus ter-deploy. Upload manual melalui Netlify Drop bisa saja tidak menerbitkan Functions pada beberapa alur; jika fungsi tidak muncul, deploy repository melalui GitHub atau Netlify CLI.
3. Website mencoba memuat ulang data setiap 60 detik. Kuota, liga, dan data yang tersedia mengikuti paket API-Football.
4. H2H endpoint disediakan sebagai /api/football?h2h=IDTIM1-IDTIM2; tampilan pemilih H2H belum dibuat pada versi ini.
