# 05 Backend Guidelines / 后端说明

这里放后端实现说明、接口设计、业务规则和服务边界。

## 最低要求

每个后端功能至少说明：

- endpoint
- 请求校验
- 业务规则
- 数据模型
- 响应格式
- 错误情况
- 测试或验证方式

## 规则

- Controller / route 不要塞满复杂业务逻辑。
- 输入必须校验。
- 错误 response 要稳定。
- 不要把 secret 写进代码。
- 不要在日志中输出敏感数据。
- 数据库字段变更要有说明。

## Endpoint 说明模板

```md
## Endpoint Name / 接口名称

- Method:
- Path:
- Purpose:
- Request:
- Response:
- Error cases:
- Data touched:
- Verification:
```
