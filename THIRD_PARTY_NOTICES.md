# 第三方数据与代码

## ECDICT

`scripts/seed.ts` 在可联网环境下从 [ECDICT](https://github.com/skywind3000/ECDICT) 的 `ecdict.csv` 筛选 `gk` 标签词条，用于初始化高中词库。ECDICT 项目按 MIT License 发布；导入后的词条仍建议在正式产品中根据学校教材和发行范围做一次人工校对。

种子脚本会校验真实高中词条数量和四级拓展词。数据源不可用、高中词少于 3000 条或缺少四级词时直接停止，避免把占位内容写入正式词库。
