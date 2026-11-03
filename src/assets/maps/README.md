# 世界地图数据

`world.json` 用于首页「世界地图选城市」，来源为 ECharts 4.9.0 的
`map/json/world.json`（Apache License 2.0）。

- 文件大小约 1 MB，由 `WorldCityMap.vue` 本地加载，不依赖外部 CDN。
- 地图只负责国家边界与投影，城市点位来自后端 `GET /api/v1/city/list` 的经纬度。
- 如需更精细的边界，可替换为 Natural Earth 的 GeoJSON，并保持 `FeatureCollection` 结构。
