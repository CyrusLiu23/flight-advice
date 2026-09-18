# Flight Explorer · 直飞寰宇（网页版）

一个面向全球的直飞城市探索器：选一座城市作为出发地，看到它可以**直飞到达**的所有城市，点开任意目的地还能看到当地著名景点、景点距出发地的直线距离与地图链接。中文 / English 双语，零依赖、零后端，双击 `index.html` 即可运行。

![界面预览](screenshots/zh-home-and-detail.jpg)

## 发布到 GitHub Pages（让所有人访问）

这是一个纯静态站点，仓库根目录就是网站根目录，可以直接用 GitHub Pages 免费发布：

1. 在 GitHub 上新建一个 **Public** 仓库（例如 `flight-explorer`），不要勾选添加 README。
2. 在本地仓库目录里执行：

   ```bash
   cd outputs/flight-explorer-web
   git init -b main
   git config user.name "你的 GitHub 用户名"
   git config user.email "你的邮箱"
   git add -A
   git commit -m "feat: Flight Explorer 直飞寰宇"
   git remote add origin https://github.com/<用户名>/flight-explorer.git
   git push -u origin main
   ```

3. 打开仓库的 **Settings → Pages**，Source 选择 **Deploy from a branch**，Branch 选 **main**、目录选 **/(root)**，保存。
4. 等 1–2 分钟，访问 `https://<用户名>.github.io/flight-explorer/` 即可。

几点说明：

- 仓库里所有文件都会公开（页面、数据、README、截图），发布前确认没有不希望公开的内容。
- 站内引用全部是相对路径，部署在 `/<仓库名>/` 这样的子目录下也能正常工作；仓库里已放 `.nojekyll`，跳过 Jekyll 处理更快更稳。
- GitHub Pages 默认走 HTTPS，所以**浏览器定位功能在线上是可用的**（`file://` 打开时才不可用）。
- 之后每次更新内容，`git add -A && git commit -m "update" && git push` 即可，Pages 会自动重新发布。

如果更想用别的托管：Vercel / Netlify / Cloudflare Pages 都是把这个目录直接拖进去即可，步骤更少，但 GitHub Pages 的好处是内容和代码放在同一个仓库里。

## 功能

| 功能 | 说明 |
| --- | --- |
| 全球地球仪 | 纯 Canvas 手绘的正交投影地球仪：经纬网、城市点、大圆航线虚线动画；可拖拽旋转、滚轮缩放、点击圆点直接进入城市详情 |
| 出发地选择 | 搜索（中文 / 英文 / 全拼 / 拼音首字母 / 机场三字码）、热门出发地、浏览器定位（按坐标匹配最近城市） |
| 直飞列表 | 全部 / 国内 / 国际及港澳台筛选，按大洲过滤，按距离 / 名称 / 国家排序，每条显示 IATA 代码、直线距离、估算飞行时长、景点数量 |
| 目的地详情 | 距离、飞行时长、有无直飞、景点列表（含「距出发地直线」「距市中心」两种距离）、Google Maps 一键打开 |
| 收藏与分享 | 目的地收藏（localStorage）、URL 哈希路由（`#/from/shanghai/to/paris` 可直接分享某个城市对） |
| 双语切换 | 界面文案、城市名、国家/地区名、景点名与标签都会随语言切换 |
| 响应式 | 桌面双栏（信息 + 地球仪），移动端自动堆叠为单栏 |

## 快速开始

双击 `index.html`，或把它拖进浏览器窗口即可（不需要服务器、不需要联网）。数据与脚本都是本地文件，`file://` 直接可用。

如果想让定位功能正常工作，浏览器要求页面运行在 `https://` 或 `localhost` 下；直接双击打开时定位可能被浏览器拒绝，这时用搜索选择城市即可（页面会给出提示）。

想跑一个本地服务器（定位可用）：

```bash
cd outputs/flight-explorer-web
python3 -m http.server 8080
# 然后打开 http://localhost:8080
```

## 目录结构

```
flight-explorer-web/
├── index.html              页面结构
├── assets/
│   ├── styles.css          典雅主题样式（象牙白 + 深蓝 + 金）
│   ├── globe.js            Canvas 地球仪与大圆航线
│   └── app.js              状态、渲染、i18n、搜索、路由
└── data/
    ├── cities.js           154 座城市（中英双语 + 拼音 + IATA + 经纬度）+ 航线规则
    ├── attractions.js      513 个景点（中英双语简介 + 近似坐标）
    └── routes.js           全球航线规则引擎
```

## 数据规模

- **154 座城市**：中国大陆 57 座 + 港澳台 3 座 + 国际 94 座，覆盖亚洲、欧洲、非洲、北美洲、南美洲、大洋洲
- **513 个景点**：每座城市 3–4 个，含中英文名、标签、简介与近似坐标
- **航线**：以规则生成，平均每座城市 45 个直飞目的地

## 航线规则（演示数据）

数据是规则生成的演示数据，目标是让全球网络看起来合理、可用，而不是实时航班时刻。规则如下：

| 规则 | 内容 |
| --- | --- |
| R1 | 中国国内：枢纽互通、枢纽直飞全国、同区域中小城市按距离阈值连通 |
| R2 | 全球枢纽（中国 tier1 + 国际 tier1，如伦敦、巴黎、迪拜、东京、纽约、悉尼）之间互相直飞 |
| R3 | 国际城市之间：同大洲且距离 ≤ 3500km 视为直飞（洲内中短程网络） |
| R4 | 国际城市之间：同一细分区（东南亚、西亚、大洋洲…）视为直飞 |
| R5 | 每座城市至少连接最近的 5 座城市（≤ 6000km），保证网络连通、也补上真实的区域航线 |
| R6 | 国际城市 ↔ 中国城市：优先使用 `INTL_ROUTES` 的精选清单，其余按所在大洲套用枢纽清单 |
| R7 | `EXTRA_ROUTES` 补充规则覆盖不到的著名航线（斐济、马尔代夫、非洲、南美环线等） |

一个结果上的特点：**北京、上海这类超级枢纽在演示数据里几乎可以直飞所有城市**（153/154），这是枢纽规则的直接结果，也符合现实直觉；如果你想知道「小城市能飞哪儿」，把出发地换成三亚（41 城）、拉萨（25 城）、开普敦（18 城）、楠迪（21 城）会更有意思。

所有距离都是**大圆（直线）距离**，飞行时长按巡航 800km/h + 30 分钟起降估算，两者都只用于比较，不代表真实航班时刻。

## 接入真实数据

页面只依赖三个全局对象，替换数据源不需要改 `app.js`：

- `window.FE_CITIES`：城市数组
- `window.FE_ATTRACTIONS`：`{ cityId: [景点…] }`
- `window.FE_ROUTES`：提供 `distanceKm(a,b)`、`getDirectDestinationIds(cityId)`、`hasDirectFlight(a,b)`

可以把 `data/routes.js` 里的规则函数换成你自己的接口结果（例如把真实航线导出成 `{ beijing: ['shanghai', …] }`，只保留 `getDirectDestinationIds` 的实现），或把三个 `data/*.js` 换成构建产物。

## 数据从哪来

城市与景点数据由仓库根目录的构建脚本统一生成，和小程序共用同一份数据库：

```bash
node work/build-web-data.mjs
```

脚本会合并中文景点、英文名映射（`work/i18n-attractions.mjs`）与新增国际城市双语景点（`work/attractions-intl.mjs`），产出网页版的 `data/attractions.js`，并同步生成小程序的城市 / 景点 / 航线文件。

## 已知取舍

- 中国城市在英文模式下使用拼音名（Xi'an、Chengdu），符合国际惯例
- 部分中国城市的机场三字码取的是附近共用机场（苏州使用无锡硕放 WUX），没有民航机场的城市留空
- 少数「城市」实际是景区机场（九寨沟、张家界），景点数据以景区为主
- 英文模式下景点长简介使用英文，若某条数据没有英文简介会自动回退为中文
