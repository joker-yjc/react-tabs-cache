# 快速开始

本指南将帮助你快速在 React 项目中集成 `@jcyao/react-tabs-cache`。

## 1. 安装

```bash
npm install @jcyao/react-tabs-cache
# 或
yarn add @jcyao/react-tabs-cache
# 或
pnpm add @jcyao/react-tabs-cache
```

> **注意**：请确保你的项目中已安装 `react >= 18.0.0`、`antd >= 5.0.0` 和 `react-router-dom >= 6.0.0`。

## 2. 核心接入步骤

接入 `@jcyao/react-tabs-cache` 需要三个核心步骤：配置 Provider、定义路由适配器、以及使用布局组件。

### 第一步：配置 Provider

`TabsCacheProvider` 不需要必须包裹在 `main.tsx` 最外层。你只需要将其包裹在**需要使用标签页缓存功能的组件树**外层即可。

例如，你可以将其直接放在布局组件（Layout）中：

```tsx
import { TabsCacheProvider, TabsLayout } from '@jcyao/react-tabs-cache';

const AppLayout = () => {
  return (
    <TabsCacheProvider>
      <div className="admin-container">
        <SideMenu />
        <div className="main-content">
          {/* 只有 TabsLayout 及其内部页面会共享此缓存上下文 */}
          <TabsLayout />
        </div>
      </div>
    </TabsCacheProvider>
  );
};
```

> **提示**：如果你的应用中有多个互不干扰的标签页区域（例如主后台和弹窗内的局部多页），你可以分别嵌套多个 `TabsCacheProvider`，它们之间的缓存状态是完全隔离的。

### 第二步：配置路由适配器与同步

在你的布局组件中，配置 `RouteAdapter` 以告知库如何解析路由标题，并启用 `useRouteSync`。

```tsx
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TabsLayout, useRouteSync, createRouteAdapter } from '@jcyao/react-tabs-cache';

// 1. 定义路由配置
const routes = [
  { path: '/dashboard', title: '仪表盘' },
  { path: '/users', title: '用户管理' },
  { path: '/users/:id', title: '用户详情' },
];

const AppLayout = () => {
  const navigate = useNavigate();

  // 2. 创建路由适配器（用于解析标题等信息）
  const adapter = useMemo(() => createRouteAdapter(routes), []);

  // 3. 启用路由与标签页自动同步
  useRouteSync({ routeAdapter: adapter });

  return (
    <div className="app-layout">
      {/* 4. 渲染标签页布局 */}
      <TabsLayout onTabChange={(key) => navigate(key)} />
    </div>
  );
};
```

### 第三步：页面生命周期回调

对于被缓存的页面，如果你需要在每次切换回该标签时刷新数据，请使用 `useRouteEnterCallback`。

```tsx
import { useRouteEnterCallback } from '@jcyao/react-tabs-cache';

const UserList = () => {
  useRouteEnterCallback(() => {
    console.log('用户列表已激活，开始刷新数据...');
    // fetchUserList();
  });

  return <div>用户列表内容</div>;
};
```

## 3. 进阶用法

### 页面修改拦截

如果页面有未保存的表单，可以使用 `usePageModified` 来标记并拦截切换。

```tsx
import { usePageModified } from '@jcyao/react-tabs-cache';

const UserEdit = () => {
  const { registerModifyFlag } = usePageModified();

  return (
    <Form onValuesChange={() => registerModifyFlag('user_form', true)}>
      {/* 表单内容 */}
    </Form>
  );
};
```

### 手动操作标签页

```tsx
import { useTabsCache } from '@jcyao/react-tabs-cache';

const MyComponent = () => {
  const { closeOtherTabs, removeTab } = useTabsCache();
  
  return <Button onClick={() => closeOtherTabs('current-key')}>关闭其他</Button>;
};
```

## 运行示例项目

项目中包含一个完整的示例，演示了组件库的核心功能。

### 启动步骤
1. 进入项目根目录。
2. 安装依赖（如果尚未安装）：`npm install`。
3. 运行示例命令：`npm run dev:example`。
4. 在浏览器中访问：`http://localhost:5173`。

### 示例功能演示
示例项目位于 `example/` 目录，重点演示了以下场景：

1. **表单状态保持 (Settings/Requirement Intake)**：
   - 在“设置”或“需求介入”页面输入表单内容。
   - 切换到其他标签页再切回，表单内容将完整保留，不会重置。
2. **生命周期回调 (Dashboard)**：
   - `Dashboard` 页面使用了 `useRouteEnterCallback`。
   - 每次切回到该标签时，都会触发控制台日志输出，模拟重新加载数据的场景。
3. **动态标签标题 (Users)**：
   - 演示了如何通过 `titleResolver` 根据路由参数（如用户 ID）动态生成标签标题。
4. **路由同步 (AppShell)**：
   - 展示了 `useRouteSync` 如何与 `react-router-dom` 配合，实现 URL 变化时自动创建/激活标签。

---

## 4. 常见问题 (FAQ)

- **为什么标签页没有显示内容？**
  请确保你的 `TabsLayout` 放置在正确的路由上下文中，并且 `useRouteSync` 已正确配置 `routeAdapter`。
- **Provider 应该放在哪里？**
  `TabsCacheProvider` 只需要包裹在 `TabsLayout` 及其相关 Hooks（如 `useRouteSync`）的共同父级即可。它不强制要求放在 `BrowserRouter` 之外，也不强制放在全局入口。这使得你可以方便地在局部业务（如某个子模块）中按需引入。
- **如何自定义标签标题？**
  在 `createRouteAdapter` 的第二个参数中可以配置 `titleResolver` 函数，支持根据路由参数动态生成标题。
