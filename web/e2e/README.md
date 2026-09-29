# 金额键盘浏览器回归

首次运行安装浏览器：`npx playwright install chromium webkit`。

在 `web/` 下执行：

```bash
npm run typecheck
npm test
python3 scripts/generate_pwa_icons.py
npm run build
npm run test:e2e
```

测试自动启动本地 preview，覆盖 Chromium 手机尺寸、WebKit 手机尺寸和 Chromium 桌面尺寸。
API 使用固定分类/账户数据，不连接线上服务；测试基于按键坐标和真实触摸，检查模态顶层、背景隔离、关闭及焦点恢复。
Service Worker 在此组测试中禁用，因此它不替代手机主屏幕 PWA 验收。真机需确认加载的是新资源，再检查短按输入、点遮罩不误选分类、收起后分类可选以及备注输入后重新打开键盘。
