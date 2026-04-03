# PoE Timeless Jewels

《流亡黯道》永恆珠寶查詢工具，提供單點 Seed 查詢、天賦樹範圍檢視、詞綴反查，以及交易連結。

## 功能
- 永恆珠寶 / 將軍 / Seed 查詢
- 天賦樹插槽影響範圍高亮
- 依詞綴與權重反查 Seed
- 國際服與台服交易搜尋按鈕
- 本機收藏珠寶清單
- 收藏 JSON 匯入 / 匯出
- 開站自動預設為當前聯盟

## Frontend
在 `frontend` 目錄執行：

```bash
pnpm install
pnpm dev
pnpm build
pnpm check
```

## 更新紀錄

### 2026-04-03
- 新增「收藏珠寶」功能，可把重要珠寶加入自訂列表。
- 收藏項目支援流派、重要屬性、預估價值編輯。
- 收藏項目保留國際服 / 台服交易按鈕。
- 新增收藏 JSON 匯入與匯出。
- 網站開啟時改為預設選取當季聯盟。
- README 重整，移除先前衝突標記與損壞內容。

## 資料來源
- 官方台服網站：[pathofexile.tw](https://pathofexile.tw/)
- PoEDB 永恆珠寶資料參考：
  - [繁中](https://poedb.tw/tw/Timeless_Jewel)
  - [英文](https://poedb.tw/us/Timeless_Jewel)
- Extracted data: [Vilsol/go-pob-data](https://github.com/Vilsol/go-pob-data)

## 2026-04-03 修正紀錄（收藏與反查）
- 修正收藏資料存在時，反查結果不易顯示的版面問題：反查結果區塊改為先顯示，收藏區塊移到後方。
- 收藏珠寶改為預設收合，新增 `展開收藏/收合收藏` 按鈕。
- 左上角面板按鈕改為「圖示 + 文字」，收合後也可清楚辨識「展開面板」。
- 交易條件文案調整：`一口價` 改為 `即刻購買`、`面交` 改為 `面對面交易`。
- 詞綴顯示改為中英文雙語（結果卡、Seed 詞綴列表、收藏快照與重點詞綴）。
- 2026-04-04：收藏珠寶改為右側獨立視窗，並在左側標題列加入「收藏珠寶」切換按鈕。

## 2026-04-04 更新
- 修正：切換珠寶時不再重置已選的技能樹插槽。
- 調整：詞綴改為中英分色顯示，英文以獨立顏色呈現。
- 修正：詞綴翻譯模板會依數值條件選取，降低中英對照不一致。
- 調整：反查預設改為全選強力天賦（小天賦預設排除）。
- 文案：將「顯著天賦」統一改為「強力天賦」。
- 2026-04-04：優化「珠寶 / 將軍」選單可讀性，放大字級與高度。
- 2026-04-04：修正部分詞綴中英對照錯配（優先依英文模板翻譯）。

## 2026-04-04 交易修正（本次）
- 修正交易條件套用邏輯：即刻購買 與 面對面交易 同時勾選時改為不套 sale type（不限）。
- 重構交易詞綴查詢：移除 disabled filter 方案，改為穩定的 count + min:1 分組查詢，避免詞綴條件被市集忽略。
- 台服詞綴查詢改為雙軌：優先將軍 pseudo stat，並保留台服 stat id fallback，提升詞綴代入成功率。
- 聯盟值改為優先使用 id（非顯示名稱），並在交易 URL path segment 做 encodeURIComponent，降低聯盟路由錯誤。
## 2026-04-04 交易修正補充
- 交易條件改為單一模式：即刻購買 / 面對面交易 / 不限，避免舊版雙開關互相覆蓋。
- 國際服 sale_type 對應：即刻購買 -> priced、面對面交易 -> unpriced。
- 台服 sale_type 對應：即刻購買 -> buyout、面對面交易 -> facetoface。
- 聯盟下拉排除 Solo Self-Found (SSF) 自力聯盟，避免選到不可交易聯盟。
- 反查結果卡與收藏珠寶卡共用同一組交易設定（模式與當前選擇聯盟）。
- 修正聯盟翻譯大小寫比對：MIRAGE / HARDCORE MIRAGE / RUTHLESS MIRAGE / HC RUTHLESS MIRAGE 等全大寫名稱也會正確顯示中文。

## 2026-04-04 交易條件語意修正（本次）
- 將前端命名從 `TradeSaleMode` 統一調整為 `TradeCondition`，避免誤解成「販售型式」。
- 交易條件選項改為對齊官網語意：`即刻購買`、`面對面（聯盟上線）`、`面對面（上線）`、`不限`。
- 國際服查詢新增狀態映射：`面對面（聯盟上線）` 會套用 `status=onlineleague`，其餘條件維持 `status=online`。
- 台服維持相容：兩種面對面條件皆映射為 `sale_type=facetoface`。
- 2026-04-04：修正國際服 `sale_type` 映射為 `buyout/facetoface`，避免 `即刻購買` 被錯誤解讀為面對面交易。
- 2026-04-04：調整狀態映射：`即刻購買` 與 `不限` 改用 `status=any`，僅面對面條件使用 `online/onlineleague`。
- 2026-04-04：台服相容修正：`即刻購買` 改為 `status=online`，避免台服將查詢誤判為非即刻購買條件。
- 2026-04-04：新增 Firebase Hosting GitHub Actions 自動部署（PR Preview + main Live）。

## Firebase Hosting 自動部署

已新增 GitHub Actions workflow：
- `.github/workflows/firebase-hosting.yml`

觸發規則：
- `pull_request`：自動部署到 Firebase Hosting Preview Channel（會回寫 PR 留言）
- `push` 到 `main`：自動部署到 Firebase Hosting `live`

需要在 GitHub Repository Secrets 新增：
- `FIREBASE_SERVICE_ACCOUNT_POE_TIMELESS_JEWELS`

建立方式（擇一）：
1. 在 Firebase Console 建立可部署 Hosting 的 Service Account JSON，完整內容貼到上述 Secret。
2. 於本機執行 `firebase init hosting:github` 讓 Firebase 自動幫你建立 workflow 與 secrets（如需覆蓋目前設定）。

## 2026-04-04 部署策略調整
- 停用 Firebase Hosting GitHub Actions 自動部署，改為手動部署。
- 手動部署指令：`firebase deploy --only hosting --project poe-timeless-jewels`

## 2026-04-04 致謝與來源補充
- 本專案目前維護版 GitHub：`https://github.com/Lucifer631217/PoE-Timeless-Jewels.git`
- 本專案基於原作者專案修改：`https://github.com/Vilsol/timeless-jewels.git`
- 感謝原作者 **Vilsol** 開源此專案，提供重要的基礎與資料流程。
- README 資料來源補充：`https://github.com/Vilsol/timeless-jewels.git`
