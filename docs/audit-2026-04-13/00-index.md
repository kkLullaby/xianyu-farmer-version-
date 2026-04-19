# 项目全面扫描总览（2026-04-13）

## 1. 扫描目标
对项目进行一次全面扫描，输出三类结果：
1. 安全隐患
2. 明确 Bug
3. 未完成部分

## 2. 扫描范围与边界
- 范围：后端 Node 服务、前端 Uni-app/Vue 页面、HTML 页面、数据库 schema 与 SQL 脚本、关键文档。
- 已覆盖目录与文件类型：`server.js`、`auth.js`、`smsClient.js`、`userProfile.js`、`main_code.js`、`src/**`、`db/**`、`docs/**`、`*.html`。
- 边界：仅统计源码与后端实现，不纳入 `dist` 构建产物。

## 3. 风险分级标准
- P0/高危：可直接导致权限绕过、数据泄露、核心流程不可用。
- P1/中危：可导致业务异常、攻击面扩大、上线后高频故障。
- P2/低危：短期不阻断上线，但会累积技术债与维护成本。

## 4. 结果总计（去重后）
- 安全隐患：14 条（P0: 5，P1: 6，P2: 3）
- 明确 Bug：11 条（P0: 4，P1: 6，P2: 1）
- 未完成部分：24 条（阻断上线: 9，可延期: 15）

> 说明：部分问题存在根因重叠（如 `processor_requests` 字段不一致同时触发安全与功能缺陷），在分报告中做了交叉引用。

## 5. 报告清单
- [01-security-findings.md](./01-security-findings.md)
- [02-bug-findings.md](./02-bug-findings.md)
- [03-unfinished-items.md](./03-unfinished-items.md)
- [04-rescan-and-progress-2026-04-17.md](./04-rescan-and-progress-2026-04-17.md)
- [05-release-readiness-phase-plan-2026-04-17.md](./05-release-readiness-phase-plan-2026-04-17.md)
- [06-step1-release-gates-2026-04-17.md](./06-step1-release-gates-2026-04-17.md)
- [07-remediation-batch-2026-04-19.md](./07-remediation-batch-2026-04-19.md)
- [08-step2-entry-and-batch6-plan-2026-04-19.md](./08-step2-entry-and-batch6-plan-2026-04-19.md)

## 6. 最高优先级修复路线（建议）
1. 修复认证与授权边界（前端存储不可作为信任源）。
2. 修复 `processor_requests` 表结构/接口字段错配。
3. 移除硬编码密钥，改为环境变量与密钥轮换。
4. 收紧 CORS、补齐接口限流与鉴权校验。
5. 下线 Mock 登录与 Mock 短信，完成真实登录闭环。

## 7. 复核建议
1. 先处理 P0，再处理 P1；P2 可并行排期。
2. 每个修复项必须配套最小复测：接口用例 + 页面回归。
3. 统一更新 `docs/ARCHITECTURE.md` 与 `docs/README.md`，避免文档继续漂移。

## 8. 阶段状态（2026-04-19）
- 当前阶段：`Step 2 - 阻断项清零（In Progress）`
- 阶段文档：`05-release-readiness-phase-plan-2026-04-17.md`
- 当前执行文档：`08-step2-entry-and-batch6-plan-2026-04-19.md`
