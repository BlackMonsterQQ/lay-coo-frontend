# 中国地图数据

`china.json` 用于首页「中国城市网络」，来源为 ECharts 4.9.0 的
`map/json/china.json`（Apache License 2.0）。

- 文件大小约 60 KB，由 `ChinaCityMap.vue` 本地加载，不依赖外部 CDN。
- 地图只负责省级边界与投影，城市点位来自后端 `GET /api/v1/city/list` 的经纬度。
- 当前覆盖 339 个国内地级及以上城市（含直辖市、香港、澳门）。
- 如需更精细的边界，可替换为 DataV / Natural Earth 的 GeoJSON，并保持 `FeatureCollection` 结构。
