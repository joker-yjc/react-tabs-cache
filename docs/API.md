# API 参考

## Hooks

### `useTabsCache`
管理标签页状态的核心 Hook。

**返回值**:
- `tabs`: `TabItem[]` - 当前所有标签页。
- `activeTabId`: `string` - 当前活跃标签页 ID。
- `addTab(tab: TabItem)`: `void` - 添加新标签页。
- `removeTab(tabId: string)`: `void` - 移除指定标签页。
- `setActiveTab(tabId: string)`: `void` - 激活指定标签页。
- `closeOtherTabs(tabId: string)`: `void` - 关闭其他标签页。
- `closeAllTabs()`: `void` - 关闭所有标签页。

---

### `useRouteSync`
同步路由与标签页状态。

**参数**:
- `options`:
    - `resolveTitle`: `(pathname: string) => string` - 自定义标题解析逻辑。
    - `autoAdd`: `boolean` - 路由变化时是否自动添加标签页（默认 `true`）。

---

### `useRouteEnterCallback`
注册标签页激活时的回调函数（类似于 `onPageShow`）。

**示例**:
```tsx
useRouteEnterCallback(() => {
  console.log('页面进入，开始加载数据...');
  fetchData();
});
```

---

### `usePageModified`
管理页面的修改状态（例如表单是否已编辑）。

**返回值**:
- `registerModifyFlag(key, value)`: 注册或更新修改标记。
- `isModified`: `boolean` - 页面是否被修改。
- `showConfirmDialog(action)`: 显示确认对话框。
- `clearModifyFlag()`: 清除修改标记。

---

### `useCommonTabAction`
封装常用的标签页操作，如表格刷新。集成 `useRouteEnterCallback` 自动在进入页面时刷新。

**参数**:
- `options`:
    - `tableRef`: 关联的表格引用（支持 `reload`, `reset` 方法）。
    - `autoRefresh`: 是否开启定时刷新。

**返回值**:
- `refresh()`: 执行刷新逻辑。
- `refreshing`: `boolean` - 是否正在刷新。
- `lastRefreshAt`: `number` - 上次刷新时间。

---

## 组件

### `TabsLayout`
标签页布局容器组件。

**属性 (Props)**:
- `tabsProps`: `TabsProps` (antd) - 透传给 Ant Design Tabs 组件的属性。
- `onTabChange`: `(key: string) => void` - 标签切换回调。
- `onTabEdit`: `(key: any, action: 'add' | 'remove') => void` - 标签编辑回调。
- `renderTabLabel`: `(tab: TabItem) => React.ReactNode` - 自定义标签标题渲染。

---

## 核心类

### `TabsCacheManager`
单例管理器，通常不需要直接使用，建议通过 `useTabsCache` 访问。

**关键事件**:
- `tab:added`: 新标签页添加。
- `tab:activated`: 标签页激活。
- `tab:removed`: 标签页移除。
