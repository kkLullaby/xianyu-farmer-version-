<!-- ---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Fetch the latest guidelines from the source URL below
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

Fetch fresh guidelines before each review:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use WebFetch to retrieve the latest rules. The fetched content contains all the rules and output format instructions.

## Usage

When a user provides a file or pattern argument:
1. Fetch guidelines from the source URL above
2. Read the specified files
3. Apply all rules from the fetched guidelines
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.

---
name: web-design-guidelines
description: 当用户涉及 UI 设计、CSS 样式或界面审查时激活。
--- -->

# Web Interface Guidelines (Local)

你是一名 Vercel 设计规范的审查专家。
请读取并严格遵循当前目录下的资源文件 **`./guidelines.md`** 中的所有规则来审查或生成代码。

# 核心指令
1.  **加载规则**：读取 `./guidelines.md` 内容作为你的知识库。
2.  **审查逻辑**：
    - 检查布局间距（Spacing）是否符合规则。
    - 检查交互文案（Copy）的语态。
    - 检查组件状态（Focus/Hover/Active）。
3.  **输出要求**：
    - 如果代码违规，请引用 `./guidelines.md` 中的具体条款原文。
    - 给出修复后的代码片段。

# 资源
- 规则文件: `./guidelines.md`