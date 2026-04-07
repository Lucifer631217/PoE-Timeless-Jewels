# PoE Timeless Jewels

流亡黯道（Path of Exile）永恆珠寶查詢與計算工具。

## 主要功能

- 依珠寶類型、種子（Seed）與條件篩選結果
- 顯示對應詞綴與天賦樹影響
- 支援 JSON 匯出與匯入
- 前端以 WASM 計算，提供快速查詢體驗

## 資料來源

- 台服官網：https://pathofexile.tw/
- 國際服官網：https://www.pathofexile.com/
- PoEDB（繁中）：https://poedb.tw/tw/Timeless_Jewel
- PoEDB（英文）：https://poedb.tw/us/Timeless_Jewel
- 上游專案：https://github.com/Vilsol/timeless-jewels
- 參考資料：https://github.com/Vilsol/go-pob-data

本地資料優先參考：

- `go-pob-data-main/data/3.27/raw`
- `go-pob-data-main/data/3.27/tree`
- `go-pob-data-main/data/3.27/stat_translations`

## 本機開發

### 前端

```bash
cd frontend
pnpm install
pnpm dev
```

### 前端建置

```bash
cd frontend
pnpm build
```

## 部署（Cloudflare Pages）

目前部署目標為 Cloudflare Pages。

建議設定：

- Root directory：`frontend`
- Build command：
  `GOOS=js GOARCH=wasm GOTELEMETRY=off go build -o static/calculator.wasm ../wasm && pnpm install && pnpm build`
- Output directory：`build`
- Production branch：`main`

## 版本與更新紀錄

### 2026-04-07（v1.3.3）

- 版本更新至 `v1.3.3`，強制刷新 `calculator.wasm` 請求鍵，避免舊快取命中。
- 修正 Cloudflare Pages 的 WASM 部署流程：建置時先產生 `static/calculator.wasm`。
- 調整 `_redirects` 規則，避免 `calculator.wasm` 被 SPA fallback 改寫為 `index.html`。
- 前端新增 WASM 初始化失敗顯示與重試按鈕，避免無限 loading。

### 2026-04-07（部署切換）

- 移除 Firebase 部署設定（`firebase.json`、`.firebaserc`）。
- 新增 Cloudflare Pages 自動部署 workflow。
- 新增 `_headers` 與 `_redirects` 以對齊快取與路由策略。

---

若發現部署後頁面卡在載入，請先檢查：

1. `https://poe-timeless-jewels.pages.dev/calculator.wasm` 回應是否為 `application/wasm`
2. Pages 建置命令是否包含 `go build -o static/calculator.wasm ../wasm`
3. 是否使用最新部署（建議無痕視窗驗證）
