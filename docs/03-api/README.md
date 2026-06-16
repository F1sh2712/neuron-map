# 03 API Docs / 接口文档

这里放前后端接口约定。前端和后端都必须以这里的字段、路径和响应格式为准。

## API 最低标准

每个 API 必须说明：

- method
- path
- 用途
- 是否需要登录或权限
- 请求参数
- 请求 body
- 成功响应
- 错误响应
- 示例请求
- 示例响应

## Format / 推荐格式

````md
## API Name

METHOD /api/path

### Purpose

说明这个接口做什么。

### Request Params

| Name | Type | Required | Description |
|------|------|----------|-------------|

### Request Body

```json
{
  "field": "value"
}
```

### Success Response

```json
{
  "id": "example_id"
}
```

### Error Cases

- `400`: invalid input
- `401`: unauthorized
- `404`: not found
````

## Rules / 规则

- 前端不能靠猜测调用后端接口。
- 后端不能随意改变 response shape。
- 字段名称要稳定。
- 错误情况必须说明。
- 如果接口变更，要同步更新文档。
