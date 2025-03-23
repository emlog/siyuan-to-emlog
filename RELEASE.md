## 命令

- pnpm install
- pnpm run build
- pnpm run dev

## 插件仓库

* [siyuan-to-emlog](https://github.com/emlog/siyuan-to-emlog)

## 开发流程

- pnpm run dev #运行后将打包好的插件放在思源笔记插件目录下
- 打开思源，点击右上角的插件按钮，选择插件，点击启用
- 开始调试。

## 发布流程

* 修改：package.json 版本号
* 修改：plugin.json 版本号
* 修改： changelog.md
* 打标签：git tag v0.1.x
* 推送标签：git push origin v0.1.x
* 打包：pnpm run build
* 发布：github 上创建新的 release


## 开发参考

* https://github.com/siyuan-note/petal
* https://github.com/siyuan-note/plugin-sample/blob/main/README_zh_CN.md
* https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md
* [https://github.com/siyuan-note/bazaar](https://github.com/siyuan-note/bazaar)
* https://github.com/winter60/plugin-flomo-sync/
* https://github.com/tengfei-xy/siyuan-plugin-share-system/blob/main/src/index.ts