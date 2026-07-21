# 第三方数据与代码

## ECDICT

`scripts/seed.ts` 在可联网环境下从 [ECDICT](https://github.com/skywind3000/ECDICT) 的 `ecdict.csv` 筛选 `gk` 标签词条，用于初始化高中词库。ECDICT 项目按 MIT License 发布；导入后的词条仍建议在正式产品中根据学校教材和发行范围做一次人工校对。

开发机无法联网时，脚本会使用内置的少量真实示例词和可重复的占位练习词，确保页面和复习逻辑可以先跑通。
