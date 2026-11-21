# 手持掃描線（暫名 HAND SLIT）— 發想紀錄

紀錄日期：2026-11-17

## 概念

延續 [SCAN STUDIO](https://oliverluo0723.github.io/SCAN_STUDIO/) 的「時間拉扯過的影像」，這類風格叫 **slit-scan（狹縫掃描）**：影像的一個空間軸被換成時間軸。

新作品的差別：**掃描線握在手裡**。用鏡頭追蹤手，雙手食指之間的連線就是掃描線，可以移動、旋轉、拉長；線每一幀從素材上取一條，貼到成品的下一欄。

| | SCAN STUDIO | 新作品 |
|---|---|---|
| 誰在動 | 機器掃，人移動圖片 | 人拿著掃描線去掃 |
| 輸入 | 滑鼠、觸控 | 手部追蹤（鏡頭） |
| 技術 | 原生 canvas | p5.js |

## 已決定

- 以 p5.js 為基礎
- 主軸是手持掃描線（試玩版試過，手感可以）
- 兩種素材模式：匯入圖片、相機；**第一版先做圖片模式**
- 之後要加：用手勢決定開始 / 暫停
- 檔案組織：多個 JS 模組，不用打包工具
- 追蹤函式庫：直接用 MediaPipe（@mediapipe/tasks-vision 0.10.14）
- 第一版已完成，見 `README.md`；設計 `docs/superpowers/specs/2026-11-17-hand-slit-design.md`
- 2026-11-21 改成「一張紙，一次」：圖和參數由作者定，觀眾只有手；不能重來，紙滿印上日期與時長才能拿走。設計 `docs/superpowers/specs/2026-11-21-one-sheet-design.md`

## 還沒決定

- 跟 SCAN STUDIO 的關係：第一版暫時沿用它的外觀，當作同系列
- 相機模式的主要玩法
- 是否加入臉部控制、哪些表情對應哪些參數

## 架構（第一版已照此實作）

```
素材        追蹤         解讀           掃描          成品
Source  →  Tracker  →  Interpreter →  Scanner   →  Output
圖片/相機    手的座標點    掃描線端點       沿線取樣      高解析緩衝
                        + 指令          貼到成品      + 匯出
```

- 素材只對外提供「這個座標的顏色」，所以加相機模式不用動其他部分
- 解讀器只輸出「掃描線兩個端點」和「指令」；手、滑鼠、觸控、之後的臉都翻譯成這個格式，手勢開始 / 暫停加在這一層
- 成品緩衝和畫面預覽分開，取樣與匯出用全解析度
- p5 管畫布、繪圖迴圈、預覽；逐像素取樣用瀏覽器原生像素緩衝

## 手勢與表情的配置想法

原則：連續動作配連續參數、瞬間動作配開關；手管空間、臉管時間；不用不由自主的動作當開關。

| 動作 | 可以控制 | 穩定度 |
|---|---|---|
| 雙手食指連線 | 掃描線位置、角度、長度 | 高 |
| 單手拇指＋食指 | 短掃描線 | 高 |
| 捏合 | 記錄 / 停止 | 很高 |
| 握拳、張掌（停留 1 秒） | 開始 / 暫停、清除、匯出 | 高 |
| 嘴巴張開程度 | 線寬 | 很高 |
| 頭左右傾斜 | 速度或延遲量 | 很高 |
| 嘴角上揚 | 速度 | 高 |

不建議使用：眨眼（會誤觸）、眉毛（幅度小、個人差異大）、複雜單手手勢、情緒分類（不可靠）。

## 試玩版

位置：`spike/index.html`（用完可丟，不是正式版的基礎；正式版在根目錄）

- p5.js 1.9.4 + ml5.js 1.4.0 的 handPose
- 啟動：在 `spike/` 內執行 `python3 -m http.server 8765`，開 http://localhost:8765/
- 操作：雙手食指拉線；單手時線在拇指與食指間；沒鏡頭可用滑鼠拖。`Space` 錄製/暫停、`C` 清除、`S` 存圖
- 限制：成品只有 720 × 480；直接掃預覽畫面而不是原圖

## 可以借用的觀點

以下都是轉述，不是原文引用；多數來自二手資料（展覽導覽、評論、整理文章），正式寫創作論述前要回頭查原典。

### 藝術家

**Camille Utterback（《Liquid Time》）— 身體是進入時間的介面**
身體一次只能存在於一個地點、一個時刻，但在她的作品裡，身體反而成了讓多個時間同時並存的工具。她的軟體不再把「一格畫面」當成播放的最小單位，而是把畫面拆開。評論稱這種效果為「video cubism」。
→ 對本作：手也是只能在一個地方的東西，但它掃過的每一條線屬於不同時刻。這句話幾乎可以直接當作品說明的骨幹。

**David Hockney（「joiners」拼貼攝影，1982–87）— 單張照片是「獨眼、凍結」的觀看**
他認為一般照片是從單一視點、在一瞬間看世界，不符合人實際觀看的方式；人是邊移動邊看、花時間看的。他用多張不同時刻、不同角度的照片拼成一張，把時間放回影像裡，並連結到立體派。拼貼之間看得見的接縫，標示了作者的在場和時間的經過。
→ 對本作：成品裡的錯位、斷裂、條紋不是瑕疵，是「這張圖花了時間、有人在場」的證據。支持保留手抖的痕跡而不是全部抹平。

**Daniel Crooks（time slice 系列）— 只用真實拍到的東西**
他強調作品只用現實中存在的影像，不用濾鏡或 CG，也不剪接；變形完全來自重新排列時間和空間。
→ 對本作：扭曲不是後製特效，是擷取過程本身造成的。這是 slit-scan 跟「套濾鏡」的根本差別，也是對外說明作品時最需要講清楚的一點。

**Adam Magyar（《Stainless》、《Urban Flow》）— 用機器看見人眼看不到的時間**
他把終點攝影用的 slit-scan 技術拿去拍地鐵和人流，日常通勤變成對時間流逝與感知的凝視。（這次沒找到他本人的原話，以上是媒體的描述。）
→ 對本作：技術的來源是量測儀器，不是藝術工具，這種「挪用機器」的血統跟 SCAN STUDIO 模擬掃描器是同一條線。

### 理論

**Vilém Flusser《攝影的哲學思考》— 跟機器對玩**
相機內建一套程式，一般使用者只是在程式允許的範圍內操作。他把實驗攝影定義為「對抗裝置地玩」：不照規則用，讓影像裡出現機器程式沒預料到的東西。攝影者是玩家而不是工人。
→ 對本作：掃描器的「程式」是等速、直線、由上到下。把掃描線交到人手上，等於把這套程式拆掉重寫。SCAN STUDIO 是在機器運作時干擾它，本作更進一步，讓人取代機器的那個部件。

**Henri Bergson — 時間不能被切成格子**
他認為運動和時間（他稱為「綿延」）是連續不可分的，電影用一格格靜止畫面重組出運動，只是一種錯覺。
→ 對本作：slit-scan 剛好不是「一格一格」。它的每一條線都來自不同時刻，整張圖沒有任何一個「瞬間」，可以說比一般照片更接近連續的時間。

**Gilles Deleuze《電影》— 直接呈現時間的影像**
他反過來用 Bergson 的論點，主張電影可以呈現時間本身，並區分出「時間－影像」：不是按順序排列的時間，而是多個「現在」並置。
→ 對本作：一張掃描成品裡，左邊和右邊是不同的「現在」，並排在同一個平面上。

**Étienne-Jules Marey（連續攝影，1880 年代）— 把時間攤在一張圖上**
他為了研究運動，把連續動作記錄在同一張底片上，是用影像把時間空間化的起點。
→ 對本作：歷史上的源頭，寫脈絡時從這裡開始講。

### 整理成本作的三個論點

1. **變形是記錄，不是特效**（Crooks、Hockney）：圖上的每一處扭曲都對應一個真實發生過的手部動作。
2. **手取代了機器的一部分**（Flusser）：把原本由馬達控制的掃描頭交給人，機器的規律換成身體的不規律。
3. **一張圖裡沒有「瞬間」**（Bergson、Deleuze、Utterback）：成品是一段時間的切面，不是某一刻的快照。

## 前人作品調查

結論：**沒找到「用手拿著掃描線去掃」的作品**，瀏覽器加手部追蹤驅動 slit-scan 的組合也沒搜到。但搜尋範圍有限（主要是 Golan Levin 的目錄，只更新到 2015 年，加上幾輪網路搜尋），只能說不常見，不能說沒人做過。

### 最接近的

| 作品 | 互動方式 | 跟本作的差別 |
|---|---|---|
| Camille Utterback《Liquid Time》(2000) | 人越靠近螢幕，正前方的區域越深入時間 | 用身體位置，不是手持線；素材是預錄影片 |
| Sascha Pohflepp《Meandering》(2004) | 滑鼠手勢框出時間錯位的區域 | 滑鼠；框的是區域不是線 |
| Fels、Mase、Lee《Video Cubism》(1999) | 即時移動切面，切「寬 × 高 × 時間」的影片立方體 | 運算邏輯最像，但不是手勢 |
| James Seo《Asynchrony》(2006) | 使用者自己畫時間錯位地圖 | 目錄原文沒讀到完整描述，待確認 |

### 身體在固定的縫前面動

- Daniel Rozin《Time Scan Mirror》(2004)：身體經過畫面中央的固定線被記錄
- Christian Kessler《Transverser》(1998)：觀眾走進一道光束，那道光就是縫
- Steina Vasulka《Bent Scans》(2002)：走進鏡頭看到稍早的自己
- Glen Murphy《Robot Mirror》(2005)：用每個像素的亮度決定時間錯位量
- Bill Spinhoven《The Time Stretcher》(1988–94)：早期互動 slit-scan 裝置，資料很少
- Kevin Atkinson《Face Time》(2007)：效果跟著追蹤到的臉
- Kitasenju Design《SUPER SLIT SCAN》(2022 起展出)：每 30 秒自動換效果，觀眾不控制

### 其他相關

- Alvaro Cassinelli《Khronos Projector》(2005)：目錄描述為「縮時影像的空間瀏覽器」。印象中是按壓可變形螢幕把局部推向未來，**這點這次沒查證到，待確認**
- Masayuki Akamatsu《Timetracks》(2009)：iPhone app，可調掃描線寬度和間隔
- Martin Reinhart & Virgil Widrich《tx-transform》(1998)：空間軸與時間軸對調的技術與短片
- Myrto Amorgianou 的 slit-scan 互動裝置（Behance）：頁面讀不到，內容未確認

### 經典參考（非互動）

- Douglas Trumbull：《2001 太空漫遊》星門片段
- Adam Magyar《Stainless》：slit-scan 拍地鐵月台
- Daniel Crooks 的 time slice 影像
- Zbigniew Rybczyński《The Fourth Dimension》(1988)

### 本作的定位

前人多半是「縫固定，人在前面動」或「用身體位置影響時間」。本作是「縫握在手裡，可旋轉、拉長」，成品是一張不能重來、印著日期與時長的紙。圖和規則由作者決定，觀眾只貢獻手的動作，所以它不是讓人拿去做圖的工具，也不是照出自己的鏡子。最值得看的是《Liquid Time》（互動手感）和《Video Cubism》（運算邏輯）。

### 關鍵字

slit-scan、scanography / scanner art、time displacement、strip photography、rolling shutter、spatiotemporal imaging

### 來源

- [An Informal Catalogue of Slit-Scan Video Artworks and Research — Golan Levin](http://www.flong.com/archive/texts/lists/slit_scan/index.html)
- [SUPER SLIT SCAN — Kitasenju Design](https://kitasenjudesign.com/work/superslitscan/)
- [Tx-transform — Wikipedia](https://en.wikipedia.org/wiki/Tx-transform)
- [Hand Landmarker — Google AI Edge](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker)
- [Slit-scan: the effect that trades space for time — Modulate](https://modulate.to/effects/slit-scan)

觀點部分：

- [Liquid Time Series — Camille Utterback](https://camilleutterback.com/projects/liquid-time-series/)
- [Liquid Time — Gray Area](https://grayarea.org/?p=10888)
- [Liquid Time — Exploratorium](https://annex.exploratorium.edu/seeing/about/seeing_gallery_past_liquid_time.html)
- [Utterback gallery guide — Frist Art Museum](https://fristartmuseum.org/wp-content/uploads/utterback_gallery_guide.pdf)
- [Exploring David Hockney's Joiners — MyArtBroker](https://www.myartbroker.com/artist-david-hockney/articles/exploring-david-hockneys-joiners)
- [Space-time joiner photographs — Edward Tufte](https://www.edwardtufte.com/notebook/space-time-joiner-photographs/)
- [Bending Time With Artist Daniel Crooks — NZEDGE](https://www.nzedge.com/?p=67371)
- [Daniel Crooks: In Conversation — QAGOMA](https://blog.qagoma.qld.gov.au/?p=13465)
- [A Conversation with Daniel Crooks — Lawrence Weschler](https://www.lawrenceweschler.com/library/article/a-conversation-with-melbourne-video-artist-daniel-crooks.html)（全文未讀，值得找來看）
- [A Photographer Who Tinkers With Time — Nautilus](https://nautil.us/a-photographer-who-tinkers-with-time-234772)
- [Adam Magyar — Wikipedia](https://en.wikipedia.org/wiki/Adam_Magyar)
- [Art: Acting Against the Program of the Apparatus — Flusser Studies](https://www.flusserstudies.net/sites/www.flusserstudies.net/files/media/attachments/tratnik-art-acting-against-program-apparatus.pdf)
- [Vilém Flusser on Artistic Freedom](https://geronimocristobal.com/2020/02/29/villem-flusser-on-artistic-freedom)
- [Photography and Duration: Time Exposure and Time-Image — Rhizomes](https://rhizomes.net/issue23/plummer/)
- [Henri Bergson vs. Gilles Deleuze on Movement — TheCollector](https://thecollector.com/henri-bergson-gilles-deleuze-movement)
