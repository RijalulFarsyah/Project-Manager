Pertama saya baca dua berkas yang relevan:

- `server/routes/projectRoutes.js`
- `server/models/assignmentModel.js`

Lalu saya perbaiki dengan cara berikut:

1. Masukkan import helper assignment ke `projectRoutes.js`:
   - `getAssignmentsForTask`, `addAssignment`, `deleteAssignment` dari `../models/assignmentModel.js`

2. Tambahkan endpoint tugas-level yang baru di `projectRoutes.js`:
   - `GET /:id/tasks/:taskId/dependencies`
     - Validasi `projectId` dan `taskId`
     - Verifikasi tugas ada dan milik proyek ini
     - Mengambil dependencies proyek lewat `getDependenciesForProject(projectId)`
     - Me-filter hasil ke dependency di mana `predecessor_id === taskId || successor_id === taskId`
     - Response: `{ success: true, data: [...] }`
   - `GET /:id/tasks/:taskId/assignments`
     - Validasi dan verifikasi tugas sama seperti di atas
     - Mengambil penugasan lewat `getAssignmentsForTask(taskId)`
     - Response: `{ success: true, data: [...] }`
   - `POST /:id/tasks/:taskId/assignments`
     - Validasi proyek + tugas + tubuh request
     - Menambahkan penugasan lewat `addAssignment(taskId, member_id)`
     - Menangani `blocked` dan `conflict`
     - Response sukses: `{ success: true, data: ..., message: 'Penugasan berhasil ditambahkan.' }`
   - `DELETE /:id/tasks/:taskId/assignments/:assignmentId`
     - Validasi proyek + tugas + assignmentId
     - Memverifikasi tugas
     - Menghapus lewat `deleteAssignment(assignmentId)`
     - Response sukses: `{ success: true, data: null, message: 'Penugasan berhasil dihapus.' }`

3. Menyesuaikan `server/models/assignmentModel.js`:
   - `getAssignmentsForTask(taskId)` dibiarkan ada dan tetap mengembalikan daftar penugasan untuk tugas tersebut.
   - `getAssignmentsForTaskWithTeam(taskId, projectId)` juga dibiarkan ada (bisa dipakai nanti untuk kasus join team_members di level tugas, tapi endpoint yang ditambahkan tidak mengandalkannya secara langsung).

Batasan
- Saya tidak mengubah rute yang lebih tinggi atau mount (`/api/projects` / `/api/tasks`) dan tidak mengubah endpoint proyek-level yang sudah ada.
- Saya tidak memverifikasi hasil runtime melalui server/API langsung; jika nama/struktur tabel atau helper model berbeda di lingkungan Anda, error bisa muncul dari model/DB, bukan dari perubahan route ini.

Jika Anda ingin, saya juga bisa tambahkan endpoint `POST`/`DELETE` tugas-level dependency di `projectRoutes.js` nanti.