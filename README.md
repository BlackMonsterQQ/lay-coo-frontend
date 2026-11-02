# 岚途 LayCoo · 前端工程

Vue 3 + Vite + TypeScript + Pinia + Vue Router + Element Plus + ECharts。

本仓库只包含前端。后端是独立仓库 `lay-coo-backend`，本仓库通过 Vite 代理访问网关 `http://localhost:8080`。

## 界面预览

![首页](screenshots/home.png)

更多截图见 `screenshots/`。

## 用 WebStorm 打开

直接打开本仓库根目录：

```text
E:\lay-coo-frontend
```

WebStorm 会通过 `package.json` 自动识别为 npm 项目。

## 启动

```powershell
npm.cmd install
npm.cmd run dev
```

打开 http://localhost:5173 。

> Windows 下如果 PowerShell 禁止运行 `npm.ps1`，使用 `npm.cmd`，或把 WebStorm 的 Terminal 切换为 cmd。

## 与后端联调

- 开发服务器把 `/api` 代理到 `http://localhost:8080`（网关），配置见 [vite.config.ts](vite.config.ts)。
- 启动前端前，需要先启动后端 gateway 及对应微服务。
- 登录接口返回 JWT，前端保存在 `localStorage`，Axios 请求拦截器自动附加 `Authorization: Bearer <token>`。

## 构建

```powershell
npm.cmd run build
```

产物在 `dist/`。生产环境需要把 `/api` 反向代理到网关。

## 目录

```text
src/
├─ api/          # Axios 封装与接口定义
├─ components/   # 通用组件
├─ router/       # 路由与登录/管理员守卫
├─ stores/       # Pinia 状态
├─ styles/       # 全局样式与设计变量
├─ types/        # TypeScript 类型
├─ utils/        # 格式化等工具
└─ views/        # 页面
```

## 演示账号

- `admin / admin123`（管理员）
- `demo / demo123`（普通用户）
