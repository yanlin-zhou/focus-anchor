# Focus Anchor 安装和使用指南

Focus Anchor 第一版是一个本地运行的 Chrome New Tab 插件。安装后，每次打开新标签页，它会把今天最重要的 3 件事放在最上面，下面是默认折叠的重点卡片和 Backlog。

当前版本不会自动读取 Lark、日历或项目管理系统；数据默认保存在本机 Chrome 的 extension storage 里。

## 1. 准备代码

推荐先用一个干净目录安装：

```bash
git clone git@github.com:yanlin-zhou/focus-anchor.git
cd focus-anchor
```

如果你已经有本地仓库，并且本地 `main` 没有自己的提交，可以更新到远端最新版：

```bash
git fetch origin
git switch main
git pull --ff-only origin main
```

如果 `git pull --ff-only` 提示本地 `main` 和远端历史不一致，不要直接 reset。最省心的方式是重新 clone 一个干净目录来加载插件。

## 2. 在 Chrome 里安装插件

1. 打开 `chrome://extensions`。
2. 打开右上角 `Developer mode`。
3. 点击 `Load unpacked`。
4. 选择这个仓库根目录，也就是包含 `manifest.json` 的目录，不要选择 `src`。
5. 确认扩展列表里出现 `Focus Anchor`。
6. 打开一个新标签页。
7. 如果 Chrome 询问是否保留新的 New Tab 页面，选择保留。

安装成功后，新标签页会显示：

- 顶部一句自然语言 summary。
- `Top 3 Today Items`：今天最应该先做的 3 件事。
- `Focus Lane`：默认折叠的 3 张重点卡片。
- `Backlog`：默认折叠，降低认知负担。
- `Parking / Paused`：被暂停或 snooze 的卡片。

## 3. 第一次配置自己的事项

第一版还没有完整的设置页，所以自己的项目、routine、链接需要先改 seed data：

```text
src/domain/sampleData.js
```

重点改 `goalCards` 数组。每张卡片可以理解为一个你想保护注意力的工作上下文。

常用字段：

```js
{
  id: "card-biweekly-report",
  title: "Biweekly report",
  type: "routine",
  importance: 5,
  status: "active",
  todayItems: [],
  links: [],
  rules: []
}
```

字段说明：

- `id`：唯一 ID，建议用英文小写和短横线。
- `title`：卡片标题。
- `type`：支持 `project`、`routine`、`ad_hoc`、`deadline`。
- `importance`：1 到 5，越高越容易排到前面。
- `status`：通常用 `active`；也支持 `paused` 和 `done`。
- `todayItems`：手动放入今天要做的事项。
- `links`：和这个卡片相关的文档、Dashboard、Repo、Lark thread 等链接。
- `rules`：周期性或指定日期自动生成事项。

手动事项示例：

```js
{
  id: "item-report-polish",
  goalCardId: "card-biweekly-report",
  title: "Polish narrative and risks section",
  status: "open",
  source: "manual",
  scheduledFor: todayKey,
  doneAt: null,
  skippedAt: null,
  note: "",
  createdAt: nowIso,
  updatedAt: nowIso
}
```

链接示例：

```js
{
  id: "link-report-doc",
  goalCardId: "card-biweekly-report",
  label: "Lark Doc",
  url: "https://example.com/report",
  kind: "doc",
  includeInOpenAll: true,
  createdAt: nowIso,
  updatedAt: nowIso
}
```

`includeInOpenAll: true` 表示点击卡片里的 `Open all` 时会一起打开这个链接。

## 4. 配置 routine 和日期提醒

每隔一段时间要自动出现的事情，可以放到卡片的 `rules` 里。

每周或每两周 routine 示例：

```js
{
  id: "rule-report-biweekly-polish",
  goalCardId: "card-biweekly-report",
  type: "routine",
  titleTemplate: "Polish narrative and risks section",
  schedule: {
    cadence: "biweekly",
    weekdays: [3],
    startDate: "2026-05-06"
  },
  active: true,
  lastGeneratedFor: null,
  createdAt: nowIso,
  updatedAt: nowIso
}
```

说明：

- `cadence` 支持 `weekly` 和 `biweekly`。
- `weekdays` 使用 JavaScript 的星期编号：`0` 是周日，`1` 是周一，`2` 是周二，`3` 是周三，`4` 是周四，`5` 是周五，`6` 是周六。
- `startDate` 用 `YYYY-MM-DD`。

指定日期提醒示例：

```js
{
  id: "rule-check-launch-on-may-30",
  goalCardId: "card-launch",
  type: "date_triggered_check",
  titleTemplate: "Check whether launch deliverable is done",
  schedule: { date: "2026-05-30" },
  active: true,
  lastGeneratedFor: null,
  createdAt: nowIso,
  updatedAt: nowIso
}
```

到了 `schedule.date` 当天，这条规则会生成一个 open item，并参与 Top 3 排序。

## 5. 让配置生效

改完 `src/domain/sampleData.js` 后：

1. 打开 `chrome://extensions`。
2. 找到 `Focus Anchor`。
3. 点击 reload 图标。
4. 打开一个新标签页。

注意：`sampleData.js` 只在第一次打开时写入本地数据。如果你已经打开过插件，Chrome storage 里已经有旧数据，修改 `sampleData.js` 不会自动覆盖旧数据。

想重新使用新的 seed data，可以清掉本地数据：

1. 打开 Focus Anchor 新标签页。
2. 右键页面，选择 `Inspect`。
3. 在 Console 里执行：

```js
await chrome.storage.local.remove("focus-anchor-data");
location.reload();
```

刷新后会重新从 `sampleData.js` 初始化。

## 6. 每天怎么用

建议日常只按这个顺序用：

1. 打开新标签页，看 `Today's anchor`。
2. 先做 `Top 3 Today Items` 的第一项。
3. 做完后点击 `Done`，让它从 Top 3 里消失。
4. 如果需要上下文，点击卡片的 `Expand`，查看今天的事项和相关链接。
5. 如果要进入一组工作上下文，点击 `Open all` 打开这张卡片配置过的链接。
6. 临时想到今天必须做的小事，点击 `Quick Add`。
7. 如果某张卡今天不该打扰你，点击 `Snooze`，它会进入 Parking，明天再回来。
8. Backlog 默认不要打开；只有需要 review 低优事项时再点 `Show backlog`。

## 7. 更新插件代码

代码更新后：

```bash
git fetch origin
git switch main
git pull --ff-only origin main
```

然后去 `chrome://extensions` 里点击 `Focus Anchor` 的 reload 图标。

如果只是更新 UI 或逻辑，通常不需要清数据。只有改了 `sampleData.js` 并希望重新初始化时，才需要按上面的方式清掉 `focus-anchor-data`。

## 8. 当前版本边界

现在这个版本已经适合本地试用，但还不是完整产品：

- 没有设置页，卡片和规则主要通过 `src/domain/sampleData.js` 配置。
- 不会自动读取 Lark、日历、邮件或项目管理工具。
- 不会同步到其他设备。
- AI 学习机制还没有启用，但已经记录了 `behaviorEvents` 和 `dailySnapshots`，后续可以基于这些数据做优先级回顾和自我迭代。

## 9. 常见问题

### 新标签页没有变成 Focus Anchor

检查：

- `Focus Anchor` 是否在 `chrome://extensions` 里启用。
- 是否选择了包含 `manifest.json` 的仓库根目录。
- Chrome 是否提示过恢复原 New Tab 页面；如果有，选择保留 Focus Anchor。
- 是否有另一个 New Tab 插件覆盖了它。

### 修改了 sampleData 但页面没变

这是正常的。旧数据已经存在 Chrome storage 里。执行：

```js
await chrome.storage.local.remove("focus-anchor-data");
location.reload();
```

### 页面空白

先在仓库里跑：

```bash
npm run check
npm test
```

如果都通过，再打开新标签页的 DevTools Console，看是否有报错。

### Open all 没有打开预期链接

确认对应 link 的 `includeInOpenAll` 是 `true`，并且 URL 是完整链接，例如 `https://example.com/report`。
