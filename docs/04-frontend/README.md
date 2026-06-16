# 04 Frontend Guidelines / 前端说明

这里放前端实现说明、页面结构、组件说明和交互规则。

## 最低要求

每个前端功能至少说明：

- route / page
- 用户流程
- 输入字段
- 校验规则
- loading 状态
- empty 状态
- error 状态
- success 状态
- API 调用

## 规则

- 页面文件、组件文件和 API 调用逻辑不要全部堆在一个文件里。
- 表单必须处理 required fields 和错误提示。
- 用户看不到技术错误堆栈。
- 前端显示的数据字段必须和 API 文档一致。
- 如果暂时没有真实后端，必须说明 mock data 放在哪里。

## 页面说明模板

```md
## Page Name / 页面名称

- Route:
- Purpose:
- User:
- Data needed:
- API used:
- Main states:
- Known limitations:
```
