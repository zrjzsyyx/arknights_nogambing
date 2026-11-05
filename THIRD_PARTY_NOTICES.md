# 素材与第三方代码

本项目中的游戏美术、动画、音乐、音效和日语语音归鹰角网络及相应权利人所有，不属于本项目自编代码的授权范围。公开可获取的客户端素材不等于官方开源素材。

- 模型、骨骼、贴图、界面素材及粒子参数来自明日方舟客户端资源；原始资源版本、文件校验和与出处记录在 `dist/assets/official/provenance.json`、`dist/reveal-assets.json`。
- 全部日语报到语音与原始中文字幕的出处和文件哈希记录在 `dist/voices.json`。离线包只改变资源加载容器，没有重新合成或压缩音频。
- 立绘、横幅、抽卡池资料及概率核心参考 PRTS；核心代码保留在 `dist/prts-core.js`，具体来源及原始源码哈希记录在 `dist/pool.json`。
- Three.js 使用 MIT 许可证，原许可证随 `dist/vendor/` 分发，打包脚本保留其法律声明。
- 思源黑体的原始许可证见 `dist/assets/official/SourceHanSans-LICENSE.txt`。Bender、Novecento 及其他素材按原有来源保留。
- esbuild 仅是开发时的构建工具，终端用户运行 HTML 不需要安装它。

离线数据包、音频脚本和字体内嵌内容均由现有素材的相同字节生成；没有以新的资源授权替代原始权利声明。
