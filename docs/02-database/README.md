# 02 Database Guidelines / 数据说明

这里放数据模型、表结构、字段说明和数据约束。

## 最低要求

如果项目使用数据库，必须说明：

- tables / collections
- 字段
- 字段类型
- 必填字段
- 关系
- 索引，如果相关
- seed / mock data

## 规则

- 字段命名要稳定。
- 不要保存明文密码。
- 不要提交真实学生数据。
- 不要提交生产数据库连接串。
- mock data 必须能看出是假的。

## 表结构说明模板

```md
## Table Name / 表名

Purpose:

| Field | Type | Required | Description |
|-------|------|----------|-------------|

Relationships:

Open questions:
```
