# Arknight_nogambling

## 1.说明
因为PRTS网站的抽卡的沉浸感与还原感不够，所以采用AI制作了本项目。卡池的概率计算方法参考了PRTS网站的抽卡模拟器。
尽量还原了界面ui，音乐音效，开包动画，10连抽的结果展示，单抽时干员登场的背景和语音等内容。
目前只完成了“将雪投火”卡池。

## 2.使用方式

可以直接[在线体验](https://zrjzsyyx.github.io/arknights_nogambing/)，也可以下载到本地运行：

1. [下载项目压缩包](https://github.com/zrjzsyyx/arknights_nogambing/archive/refs/heads/main.zip)，完整解压后，双击文件夹里的 `index.html`，用浏览器打开。
2. 选择单抽或十连。开包时，按住右侧的拉链头向左拖动，也可以点击按钮直接开包。
3. 干员登场时会播放日语报到语音，并显示中文字幕。十连可以逐个查看干员，也可以跳过动画，直接看全部结果。

下载后可以断网使用，不需要安装额外的软件或启动服务器。请保留整个项目文件夹，单独复制 `index.html` 无法运行。

如果没有声音，先点击页面，再检查声音按钮和设置里的音量。抽卡记录保存在当前浏览器中，换浏览器或清理浏览器数据后，记录可能会丢失。

## 3.素材来源及免责声明

- 卡池数据、抽卡算法、干员立绘和日语报到语音来自 [PRTS](https://prts.wiki/w/寻访模拟)。
- 界面图片、包体模型、动画、音乐和音效来自《明日方舟》客户端资源。部分图片及音频通过 [ArknightsAssets2](https://github.com/ArknightsAssets/ArknightsAssets2) 获取。
- 干员资料和客户端配置参考了 [ArknightsGameData](https://github.com/Kengxxiao/ArknightsGameData)。第三方代码、字体的说明及许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

本项目是非官方同人作品，仅供非商业学习和体验使用，与鹰角网络无关。游戏相关素材的版权归鹰角网络及相应权利人所有，仓库公开不代表这些素材可以自由使用或用于商业用途。

抽卡结果只用于本地模拟，不会同步到游戏账号，也不能用来预测游戏中的实际抽卡结果。如有素材使用方面的问题，请通过仓库的 Issues 联系处理。
