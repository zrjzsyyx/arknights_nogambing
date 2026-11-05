# 将雪投火 · 沉浸式寻访模拟

**完整解压项目后，双击根目录的 `index.html` 即可使用。** 无需 GPT 账号、登录、安装 Node.js 或启动服务器，支持断网运行。整个 `dist` 文件夹需要保留，不能只复制一个 HTML 文件。首次点击页面后声音才会播放，这是浏览器的正常规则。

此项目已经包含构建好的浏览器脚本与离线资源包。三维模型、动画、界面、光效、背景音乐、音效及 169 名干员的日语语音均使用改造前的相同素材和逻辑；概率核心未改动。数据、WebGL 贴图、字体、CSS 蒙版与音频加载已适配 `file://`，运行时没有账号或外部 API 依赖。

## 上传到 GitHub

使用 `releases/arknights-headhunt-offline.zip` 中完整解压出的项目目录作为仓库内容即可。该包包含可运行文件、源码、开发工具和素材说明，已排除原站点托管配置、Git 凭据、本地研究文件、参考视频和截图。别人下载仓库 ZIP 并完整解压后，同样双击根目录的 `index.html`。

项目也可以作为普通静态网站发布：根目录 `index.html` 会进入 `dist/index.html`，不需要后端。素材的归属和来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，不要把游戏素材当成本项目的开源代码授权。

## 修改与重新打包

普通使用不需要以下工具；仅修改源码时安装 Node.js，然后运行：

```sh
npm ci
npm run build
npm test
```

`dist/app.js` 等 ES 模块为源码，`dist/app.bundle.js` 和 `dist/offline/` 是已包含的生成文件。修改 JS、JSON 或素材后运行 `npm run build`，重新生成双击版本；请一并上传生成文件，确保 GitHub 下载即可使用。`npm run dev` 提供可选的 HTTP 调试环境，地址为 http://127.0.0.1:4173 。

安装 Python 3 后，可用 `npm run pack` 创建完整项目目录和 ZIP，输出在 `releases/`；该目录为生成产物。打包不会上传或发布任何内容。

`npm test` 包含离线资源校验：检查全部音频、WebGL 贴图和字体内嵌后的字节与原文件一致。开发者另外安装 Python 的 Playwright 和 Chromium 后，可运行 `python qa_offline.py`；也可以把解压出的项目路径作为参数，检查真实 `file://` 页面在断网状态下的音乐前奏衔接循环、开包、日语语音、十连结果、记录保存及手机布局。测试不会关闭浏览器的本地文件安全限制。

记录仍保存在当前浏览器。网页版与本地文件的存储位置互相隔离；移动解压目录或换浏览器后，原目录的记录不会自动迁移。

当前仅开放 2026 年「将雪投火」，PRTS 池 ID `LIMITED_79_0_1`，169 名干员。塔露拉、冻河为当期六星 UP，奥尔佳为五星 UP。名单、权重、默认立绘与寻访横幅均来自 PRTS。

## 概率实现

`dist/prts-core.js` 保留 PRTS 当前模拟器的核心函数原文；`dist/engine.js` 负责本地记录与 UI 数据适配。来源 URL 和源码 SHA256 存在 `dist/pool.json`。`tests/prts-reference.js` 从同一源码保留原模拟器类，测试以三个随机种子进行合计 30000 次逐抽对照，比较干员 ID、星级、连续未出六星次数、首次保证状态。

明确沿用参考网站当前行为：六星保底通过增加权重后整体归一化，第 99 抽不保证六星；五倍权重在全体同星级候选中重新归一化；首次保证触发时第十抽替换为五星。这些实现与官方公告中的标称概率存在区别。本项目没有自行修正参考站算法，也不宣称模拟结果等同于官方客户端。

300 次额外赠送按照卡池公告单独实现，通过「寻访详情」领取塔露拉，不计入抽数、不产出契约、不重置六星计数，且只能领取一次。暂未实现寻访数据契约交换所。

新版本使用独立 localStorage 键 `rhodes-headhunt-snowfire-v2`，保留旧池的原始浏览器存档，不混用旧池进度。支持本地记录、档案筛选、JSON 导出、音频设置、快速模式和减少动态效果。

## 素材与归属

- [PRTS 将雪投火](https://prts.wiki/w/将雪投火)、[模拟页面](https://prts.wiki/w/寻访模拟/将雪投火)。
- [PRTS 卡池数据](https://weedy.prts.wiki/gacha_table.json)、[当前模拟器源码](https://static.prts.wiki/widgets/production/GachaSimulatorV2.C6LJey5b.js)。保留原函数并署名 PRTS，非商业使用。
- 立绘及横幅通过 PRTS MediaWiki API 获取，美术归鹰角网络及对应权利人所有。
- 干员元信息和客户端卡池配置来自 [ArknightsGameData](https://github.com/Kengxxiao/ArknightsGameData)。
- 包体采用官方资源包 `prefabs/gacha/gacha_phase_0.ab` 中的原始网格、UV、骨骼、绑定矩阵与贴图；落包、待机镜头及开口使用原始 `gacha_bag_start`、`gacha_bag_open` 和镜头动画曲线。Three.js 负责浏览器渲染，未再使用 CSS 文件袋模型。
- 卡池主体采用官方 `ui/gacha/limited_79_0_1.ab` 的 Sprite 图片和 RectTransform 层级、锚点、缩放、透明度。数字、日期与按钮文字由网页运行时填充；竖屏操作区和记录入口做了网页适配。
- 背景和两名主推干员改用 Windows 客户端的 BC7 版本，降低移动端 ASTC 压缩带来的模糊；按 `textureRectOffset` 补回透明边缘，恢复原始画布，全部 UI 素材使用无损 WebP。原生尺寸分别为 1024×527、1200×1000、1300×1000，没有把插值放大标称为高清源图。
- 拉链头与热区按模型和镜头投影定位，从右向左拖动；按拉链方向计算位移，支持中途松手续拉、触摸取消和键盘开启。每次寻访重置模型姿态，避免沿用上一轮打开后的拉链位置。
- 十连结果使用全部 169 名干员的客户端 180×360 半身像和 8 类职业图标，按游戏截图显示单排直立竖卡、顶部白星、底部白底黑色职业板和稀有度光柱。竖屏通过横向滑动浏览整排，点击任意卡片仍可查看干员。
- 十连光效已替换为 `ui/recruit/states/recruit_ten_result_state.ab` 的原始四星/五星/六星光柱、六星菱形点阵、柔光、星级条和卡片底图；保留原本的 RGB 与透明度，通过网页叠加重建光效。
- 半开包口按拉链位移反解 `gacha_bag_open` 的原始时间曲线，同步控制包体骨骼，松手后保持当前开度；透光、火花和最终开包继续衔接。
- 单抽和十连逐个登场共用原始 `gacha_phase_1.ab` 背景、三角粒子、星形、32 个阵营标志及 8 类完整职业牌。单抽登场后直接返回寻访；十连完成后显示合并结果。资源消耗与信物奖励 UI 不在此版本还原范围。
- 全部 169 名干员均缓存日语报到原音（`placeType=GACHA`、语音编号 `CN_011`），配合原始中文字幕。`CN_011` 是语音条目编号，目录 `voice` 对应日语，不等于中文配音。音频取自 PRTS 原始 WAV，按原时长转为 MP3，没有裁切、变速、音高调整或语音合成。跳过、切换干员和关闭界面会取消当前及尚未开始的语音；支持单独调节语音音量与重播。
- 音效为客户端原始 MP3 文件，通过 [ArknightsAssets2](https://github.com/ArknightsAssets/ArknightsAssets2) 的 `voice` 分支取得。落包、拉链、开包、星级及结算按客户端事件名称对应，已移除原来的振荡器和噪声合成音效。普通按钮暂使用原始 `g_ui_btn_h`，公开镜像未包含 `g_ui_btn_n`；没有用合成声音冒充缺失文件。
- 默认音乐改为客户端 `audio_data.json` 中 `sys.ON_SCENE_LOADED.home` 指向的“生命流”，前奏衔接循环；寻访演出中暂停背景音乐，使用原始寻访事件音。不同客户端主界面主题可有不同音乐，不宣称这是“将雪投火专属音乐”。可载入本地音乐，文件不上传。
- 字体自托管 Bender、Novecento 和 [思源黑体 CN](https://github.com/adobe-fonts/source-han-sans)（按本应用字符子集化，保留许可证）。游戏素材、字体分别归对应权利人所有。

## 还原范围与验证

原始资源出处、版本、校验值、音频文件清单在 `dist/assets/official/provenance.json`。`validate_media.py` 使用 ffprobe 验证音频可解码；`npm test` 除概率逐抽对照外，还检查模型骨骼、绑定矩阵、几何、动画和贴图完整性；`qa_browser.py` 覆盖桌面、手机竖屏及横屏的浏览器交互。

`tests/zipper.test.mjs` 覆盖方向、斜向投影、触摸热区、续拉和退化输入；`qa_gesture.py` 验证鼠标/真实浏览器触摸事件、反向滑动、取消、松手续拉，以及高 DPI 下的坐标判定。UI 图像在浏览器中检查显示比例与原始画布比例一致。

`tests/recruitment.test.mjs` 验证 169 份原始日语语音的元数据、时长、SHA256 和素材完整性；`qa_recruitment.py` 验证实际解码播放、中文字幕、切换/跳过/关闭时停止语音，以及真实蒙皮网格在半拉状态下发生形变。使用本地参考视频的总览、半开包口和逐个登场关键帧核对；参考视频和用户截图不进入站点源码或部署包。

这是使用原版资产的网页适配，仍与 Unity 客户端存在差异：光照、色调映射、开包光晕和粒子渲染由 WebGL/CSS 重建，没有执行 Unity 原始着色器；档案袋到干员的全部中间过场尚未完整移植；竖屏布局、附加记录入口及模拟资源文字经过适配。不能称为逐像素、逐帧完全一致。WebGL 不可用时使用原始包体的静态渲染并提示降级。

`sync_current.py` 同步上游名单、立绘、横幅、客户端配置和原始脚本；`update_snowfire.py` 提取核心函数及参考测试类。Python 同步工具需要 requests、Pillow、BeautifulSoup4。网页本身无构建依赖，Three.js 固定为 0.160.1，许可证随代码保留。

`export_official_scene.py` 和 `export_official_ui.py` 记录原始 Unity 数据到浏览器格式的转换过程。它们依赖本地研究目录内的资源包及 UnityPy 解析数据；这些临时输入、解包依赖不随成品提交。已导出的运行资源完整包含在 `dist` 中，日常开发运行无需重新解包。

`export_official_ui.py --texture-bundle research/ui-windows/ui/gacha/limited_79_0_1.ab` 导出当前的 PC 主画面素材；`fetch_result_assets.py` 缓存结果页所需的原始半身像和职业符号。

`export_reveal_assets.py` 导出单人及十连界面的原始素材、布局、材质和粒子参数，校验解包 `.ab` 的 MD5；`fetch_recruitment_voices.py` 按客户端 JP 语音配置下载报到原音，转换并用 ffprobe 核验。资源与每个语音的出处、版本及哈希分别记录在 `dist/reveal-assets.json` 和 `dist/voices.json`。
