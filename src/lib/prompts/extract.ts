export const EXTRACTION_SYSTEM_PROMPT = `你是 NeuronMap 的知识图谱提取引擎。用户会上传学习材料（PDF 课件、笔记、教材）。你的任务是把材料里的知识抽象成一个"知识宇宙"——概念节点和它们之间的关系。

## 三层节点结构（宇宙隐喻）

- **star（恒星）**：章节级的顶层核心概念。整份材料通常有 2-6 个恒星。对应最高层的主题。
- **planet（行星）**：从属于某个恒星的二级知识点。绕恒星运转。
- **asteroid（陨石）**：具体的定义、例子、公式、细节。绕行星运转。

判定层级时，优先参考材料本身的标题层级（一级标题→恒星，二级→行星，三级及更细→陨石），没有明确标题时按概念的抽象程度自行判断。

## 关系（边）

在有实质关联的节点之间建立边，用 relationType 描述关系类型，常见值：
- "contains"（包含 / 属于，如恒星包含行星）
- "depends"（依赖 / 前置知识）
- "related"（相关）
- "contrast"（对比 / 区别）

weight 是关系强度，0.0-1.0，越紧密越高。

## 要求

1. 只提取材料里**真实出现**的概念，不要编造或补充材料外的知识。
2. 每个节点的 summary 用 1-2 句话概括这个概念是什么，用中文。
3. 节点数量适中：一份材料通常 15-50 个节点，不要把每个词都拆成节点。
4. 图表、流程图里的关键概念也要提取，但如果图片细节看不清（箭头方向、小数字模糊），宁可保守，不要猜测不确定的关系。
5. 通过调用 save_knowledge_graph 工具返回结果。每个节点分配一个短 key（如 n1, n2），边用 key 引用节点。`

export const EXTRACTION_TOOL = {
  name: 'save_knowledge_graph',
  description: '保存从材料中提取的知识节点和关系',
  input_schema: {
    type: 'object' as const,
    properties: {
      nodes: {
        type: 'array',
        description: '知识节点列表',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string', description: '节点唯一短标识，如 n1、n2' },
            title: { type: 'string', description: '概念名称，简短' },
            summary: { type: 'string', description: '1-2 句话概括这个概念（中文）' },
            level: {
              type: 'string',
              enum: ['star', 'planet', 'asteroid'],
              description: '节点层级',
            },
            sourceHeading: {
              type: 'string',
              description: '来源标题或章节（可选）',
            },
          },
          required: ['key', 'title', 'summary', 'level'],
        },
      },
      edges: {
        type: 'array',
        description: '节点之间的关系',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string', description: '起点节点的 key' },
            to: { type: 'string', description: '终点节点的 key' },
            relationType: {
              type: 'string',
              description: 'contains / depends / related / contrast',
            },
            weight: { type: 'number', description: '关系强度 0.0-1.0' },
          },
          required: ['from', 'to', 'relationType'],
        },
      },
    },
    required: ['nodes', 'edges'],
  },
}
