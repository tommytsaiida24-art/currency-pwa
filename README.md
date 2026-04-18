# 匯率轉換器 PWA

一個簡單易用的匯率轉換應用，支援離線使用！

## 📱 功能

- ✅ 即時匯率查詢（Frankfurter API）
- ✅ 支援 30+ 種貨幣
- ✅ 收藏常用幣別
- ✅ 交換貨幣功能
- ✅ 離線緩存（上次更新的匯率）
- ✅ 可安裝到 iPhone/Android 主畫面

## 🚀 部署方式

### 方式一：直接用 Python 在本機測試

```bash
cd /home/tommiclaw/currency-pwa
python3 -m http.server 8080
```

然後用 iPhone 瀏覽器開啟 `http://你的電腦IP:8080`

### 方式二：部署到 Vercel（免費）

1. 把 `currency-pwa` 資料夾上傳到 GitHub
2. 到 vercel.com 連接 GitHub
3. 匯入專案，一鍵部署！
4. 獲得一個免費網址，例如：`currency-app.vercel.app`

### 方式三：部署到 GitHub Pages（免費）

1. 把資料夾上傳到 GitHub
2. 開啟 Settings → Pages
3. 選擇 `main` branch
4. 等幾分鐘就能用了

## 📋 需要的檔案

```
currency-pwa/
├── index.html          # 主頁面
├── styles.css          # 樣式
├── app.js              # 主程式
├── service-worker.js   # 離線支援
├── manifest.json       # PWA 設定
├── icon-192.png        # 圖示（192x192）
├── icon-512.png        # 圖示（512x512）
└── README.md           # 說明文件
```

## 🎨 如何更換圖示

1. 製作 192x192 和 512x512 的 PNG 圖片
2. 命名為 `icon-192.png` 和 `icon-512.png`
3. 放在同一個資料夾

## 📱 如何安裝到 iPhone

1. 用 Safari 開啟部署的網址
2. 點擊分享按鈕 ⬆️
3. 向下滾動，點「加入主畫面」
4. 點擊「新增」完成！

## 🔧 自訂修改

- 想換 API？修改 `app.js` 裡的 `API_URL`
- 想加新幣別？Frankfurter API 自動支援
- 想改顏色？修改 `styles.css` 裡的 `gradient`

## 📄 License

MIT
