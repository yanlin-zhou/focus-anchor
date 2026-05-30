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

第一次安装成功后，新标签页会先显示 no-code setup。完成设置后，之后的新标签页会默认显示 Safe Home：

- 安全摘要：只显示 `3 anchors ready`、`1 time-sensitive check today` 这类不泄密的信息。
- `Focus Peek`：用抽象条目提醒你有 Top 3，但默认不显示任务名、项目名或排序原因。
- `Reveal focus`：点击后才显示真实 Top 3 和卡片上下文。
- Google-style shortcuts：Gmail、Calendar、Drive、Maps、Search、Lark 等快捷入口。
- `Manage`：编辑卡片、数据和快捷入口。

## 3. 第一次无代码设置

第一次打开新标签页时，Focus Anchor 会进入 no-code setup，不需要改代码文件。

1. 打开一个新标签页。
2. 点击 `Start setup`。
3. 选择一个模板：`Project Progress`、`Routine Work`、`Ad Hoc Issue` 或 `Date Check`。
4. 创建 1 到 5 张卡片；建议先建 3 张，够用也不容易分心。
5. 在卡片内填写标题，并至少添加一个 `Today item`。
6. 点击每张卡片里的 `Save` 保存草稿编辑。
7. 有至少一个 today item 后，点击 `Finish setup` 开始使用。

每张卡片可以理解为一个你想保护注意力的工作上下文。比如一个项目、一个 routine、一件临时问题，或一个指定日期前后必须检查的事项。

## 4. 管理卡片、规则和数据

完成设置后，点击新标签页右上角的 `Manage` 可以打开管理页。

管理页现在分成三块：

- `Cards`：选择卡片后，可以编辑标题、类型、状态、重要性、是否 pinned、snooze 日期和排序说明。
- `Rules`：查看当前保存的 routine 或 date check 规则。当前版本先支持查看，后续会补上无代码编辑。
- `Data`：导出、导入或重置本浏览器里的本地数据。

数据操作说明：

- `Export JSON` 会下载当前本地数据，适合备份或迁移到另一台电脑。
- `Import JSON` 会先让你选择 `.json` 文件，再显示 `Import summary`。确认摘要无误后，点击 `Confirm import` 才会替换本地数据。
- `Reset data` 需要先打开确认区，再输入 `RESET`，最后点击 `Confirm reset`。这个操作只清除当前浏览器里的 Focus Anchor 数据。

## 5. 每天怎么用

建议日常只按这个顺序用：

1. 打开新标签页，先看 Safe Home 的安全摘要和 Focus Peek。
2. 如果正在 share screen，可以直接使用快捷入口，不需要 reveal priorities。
3. 如果准备开始做事，点击 `Reveal focus` 或按 `/` / `f` 打开真实 Top 3。
4. 先做 Top 3 的第一项，做完后点击 `Done`。
5. 如果要进入一组工作上下文，点击 `Open all` 打开这张卡片配置过的链接。
6. 临时想到今天必须做的小事，点击 `Quick Add`。
7. 如果某张卡今天不该打扰你，点击 `Snooze`，它会进入 Parking，明天再回来。
8. Backlog 默认不要打开；只有需要 review 低优事项时再点 `Show backlog`。

## 6. 更新插件代码

代码更新后：

```bash
git fetch origin
git switch main
git pull --ff-only origin main
```

然后去 `chrome://extensions` 里点击 `Focus Anchor` 的 reload 图标。

如果只是更新 UI 或逻辑，通常不需要清数据。需要备份或迁移时，优先在 Manage 页面使用 `Export JSON` 和 `Import JSON`。

## 7. 当前版本边界

现在这个版本已经适合本地试用，但还不是完整产品：

- no-code setup 已支持创建卡片和 today item；规则编辑仍在 Manage 页面后续迭代。
- 不会自动读取 Lark、日历、邮件或项目管理工具。
- 不会同步到其他设备。
- 屏幕共享不会自动检测；当前版本通过默认安全首页、主动 reveal 和自动隐藏来降低泄露风险。
- AI 学习机制还没有启用，但已经记录了 `behaviorEvents` 和 `dailySnapshots`，后续可以基于这些数据做优先级回顾和自我迭代。

## 8. 开发者附录：sampleData fixture

`src/domain/sampleData.js` 现在主要作为开发 fixture 和测试样例，不再是普通用户的主要配置路径。

如果你在开发时需要调整 fixture，可以修改 `goalCards` 数组。注意：普通首次打开不会再自动写入 `sampleData.js`；空 storage 会进入 no-code setup。修改 fixture 只影响测试或你手动调用 fixture 的开发场景。调试时可以在 Manage 页面重置本地数据，或在 DevTools Console 里清除 `focus-anchor-data` 后刷新。

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

`type` 支持 `project`、`routine`、`ad_hoc`、`deadline`。`includeInOpenAll: true` 表示点击卡片里的 `Open all` 时会一起打开这个链接。规则里的 `cadence` 支持 `weekly` 和 `biweekly`；指定日期提醒使用 `date_triggered_check` 和 `YYYY-MM-DD` 日期。

## 9. 常见问题

### 新标签页没有变成 Focus Anchor

检查：

- `Focus Anchor` 是否在 `chrome://extensions` 里启用。
- 是否选择了包含 `manifest.json` 的仓库根目录。
- Chrome 是否提示过恢复原 New Tab 页面；如果有，选择保留 Focus Anchor。
- 是否有另一个 New Tab 插件覆盖了它。

### 导入 JSON 后看起来不对

先确认文件来自 Focus Anchor 的 `Export JSON`。导入前会显示卡片数、open items、规则数和快照数；如果摘要明显不对，不要点击 `Confirm import`。

### 修改了 sampleData 但页面没变

这是正常的。旧数据已经存在 Chrome storage 里。普通使用优先通过 Manage 页面重置或导入数据；开发调试时也可以在 DevTools Console 清除 `focus-anchor-data` 后刷新。

### 页面空白

先在仓库里跑：

```bash
npm run check
npm test
```

如果都通过，再打开新标签页的 DevTools Console，看是否有报错。

### Open all 没有打开预期链接

确认对应 link 的 `includeInOpenAll` 是 `true`，并且 URL 是完整链接，例如 `https://example.com/report`。
