# TypeScript 最佳实践

## 类型定义
- 始终显式声明函数返回类型
- 优先使用 interface 而非 type（除非需要联合类型）
- 避免使用 any，使用 unknown 代替

## 命名规范
- 组件使用 PascalCase: `UserProfile`
- 函数使用 camelCase: `getUserData`
- 常量使用 UPPER_SNAKE_CASE: `MAX_RETRY_COUNT`

## 代码组织
- 按功能模块组织文件，非按类型
  ✅ `features/auth/AuthService.ts`
  ❌ `services/AuthService.ts`

## 示例代码
```typescript
// ✅ 好的实践
interface User {
  id: string;
  name: string;
}

async function getUser(id: string): Promise<User> {
  // ...
}

// ❌ 避免的写法
function getUser(id: any) {
  // ...
}