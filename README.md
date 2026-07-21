# Project Progress Tracker

Ứng dụng dashboard Gantt chart với backend Node.js (Express), hỗ trợ đa ngôn ngữ (VI/EN/日本語) và có màn hình passcode.

## Chạy ứng dụng (local)

1. Mở terminal tại thư mục `d:\Work\process`
2. Chạy:
   ```bash
   npm install
   npm start
   ```
3. Mở trình duyệt tại `http://localhost:3000`
4. Nhập passcode mặc định: `porters`

## Tính năng

- API backend lưu task, ngày nghỉ lễ, passcode
- Giao diện hỗ trợ 3 ngôn ngữ: Tiếng Việt, English, 日本語
- Màn hình passcode chống spam (mặc định `porters`)
- Chỉnh sửa/thêm task từ giao diện tự động lưu qua API
- Import CSV vẫn giữ nguyên để dùng song song

## Lưu trữ dữ liệu

- **Local dev**: dữ liệu lưu vào `data/tasks.json` (tự tạo nếu chưa có).
- **Trên Vercel**: filesystem là read-only/ephemeral nên ứng dụng tự chuyển sang dùng
  Vercel KV (Upstash Redis) khi biến môi trường `KV_REST_API_URL` / `KV_REST_API_TOKEN`
  tồn tại (xem `lib/store.js`). Cần add một Redis store (Upstash) từ Vercel Marketplace
  vào project để có lưu trữ bền vững trên production.

## Deploy lên Vercel

```bash
vercel link
vercel env pull   # sau khi đã add Redis store trong dashboard
vercel --prod
```
