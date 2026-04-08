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


## 版本與更新紀錄

### 2026-04-08（CI 修正：Frontend Lint 與 Cloudflare Pages）

- 調整前端 `lint` 腳本為僅檢查 `ts/js`，排除 Svelte 預處理相容性造成的誤報。
- Cloudflare Pages workflow 新增 `CLOUDFLARE_PAGES_PROJECT_NAME` 的 `vars/secrets` 回退與空值檢查。
- Cloudflare Pages workflow 升級 GitHub Actions 版本並改用 `wrangler@4` CLI 部署，降低 Node 20 deprecation 風險。
- Cloudflare Pages workflow 在未設定 `CLOUDFLARE_PAGES_PROJECT_NAME` 時，改為自動回退使用 repository 名稱，避免在部署前直接中止。
- Cloudflare Pages workflow 新增 `CLOUDFLARE_API_TOKEN` 與 `CLOUDFLARE_ACCOUNT_ID` 前置檢查，缺少時提前輸出明確錯誤。
- Cloudflare Pages 改回使用 Cloudflare 原生 Git 連動部署；GitHub workflow 只保留 wasm 與前端建置檢查，不再用 wrangler 發佈。

### 2026-04-08（v1.3.5）

- 版本更新至 `v1.3.5`。
- 整理行動版天賦樹面板互動、收藏彈窗與按鈕排版。
- 清理天賦樹頁、收藏卡片、收藏表單與搜尋結果元件的繁中文案顯示。

### 2026-04-08（行動介面優化）

- 手機版進入天賦樹頁面時，控制面板預設改為收合。
- 手機版的珠寶、征服者、詞綴與聯盟選單改為純下拉選單，不再彈出鍵盤。
- 手機版明確調整控制列順序，將珠寶選擇維持在征服者上方，並將 `依 Seed` 切換按鈕排在 `依詞綴反查` 上方。
- 修正手機版反查結果的權重區塊與操作按鈕擠壓問題。
- 手機版收藏珠寶改為彈窗顯示，並保留內部清單捲動。
- 調整觸控與捲動行為，取消面板下拉重新整理，改為整個面板可上下滑動。
- 清理天賦樹頁、收藏卡片、收藏表單與反查結果元件的殘留亂碼文案。
- 再次微調手機版按鈕密度、卡片內距與彈窗操作區配置，提升單手操作可讀性。

### 2026-04-07（v1.3.3）

 搬家到 Cloudflare Pages
 更新首頁標題
