# 全量复扫与修复进度（2026-04-17）

## 1. 扫描范围与方法
- 扫描范围：后端 `server.js`、短信与鉴权相关模块、旧 H5 入口（`index.html`/`auth.js`/`main_code.js`）、uni 页面（`src/pages/**`）、文档一致性。
- 扫描方法：
  1. 静态检索：`rg` 搜索鉴权、静态暴露、XSS、Mock/占位、敏感配置。
  2. 关键代码精读：权限中间件、文件访问控制、订单与申报查询路径。
  3. 动态验证：本地启动服务后，直接请求敏感路径验证可利用性。

---

## 2. 本轮关键结论（摘要）
- 已确认多项历史问题已修复：短信真实化、OTP 入库与限流、processor_requests 模型收敛、登录页闭环、密码哈希轮数统一等。
- 仍存在高风险问题：**项目根目录静态暴露**，可直接访问源码与数据库文件。
- 旧 H5 代码仍有大量 `innerHTML` 注入面和本地 token 依赖，安全面尚未收口。
- 管理端与多条业务页面仍存在占位与 Mock 回退，影响上线稳定性和联调真实性。

---

## 3. 安全漏洞复扫结果

### 3.1 高危（P0）

#### NEW-SEC-001 根目录静态暴露导致源码/数据库可被直接下载
- 证据代码：`server.js:605` 使用 `app.use(express.static(path.join(__dirname)));`
- 复现实验（本地）：
  - 请求 `/server.js` 返回 `HTTP/1.1 200 OK`，可读源码。
  - 请求 `/db/schema.sql` 返回 `HTTP/1.1 200 OK`。
  - 请求 `/data/agri.db` 返回 `HTTP/1.1 200 OK`，文件头为 `SQLite format 3`。
- 风险：代码泄露、数据泄露、攻击者快速掌握接口与鉴权细节。
- 结论：**未修复，且风险高于原 SEC-004（上传目录暴露）**。

### 3.2 中危（P1）

#### SEC-009 多处注入面（旧 H5）仍未完成收敛
- 证据示例：`main_code.js:35`、`index.html:782`、`auth.js:323`（及大量 `innerHTML` 命中）
- 风险：若拼接内容混入不可信输入，存在 DOM XSS 攻击面。
- 结论：**未修复（旧 H5 主体）**。

#### NEW-SEC-002 文件访问支持 query token，存在 token 泄露面
- 证据：`server.js:533-540`（`getTokenFromRequest` 支持 `req.query.token`）
- 风险：token 可能通过 URL、日志、Referer 泄露。
- 结论：**待修复**。

### 3.3 低危（P2）

#### SEC-013 token 仍落地在客户端存储
- 证据：`src/utils/request.js:12-20`（`uni.getStorageSync('agri_auth_token')`）
- 风险：与 XSS 叠加时存在会话窃取面。
- 结论：**未修复（策略层）**。

#### SEC-014 安全响应头仅部分落地
- 证据：
  - 已有：`server.js:281-287`（`X-Content-Type-Options`、`X-Frame-Options`、`Cache-Control`）
  - HSTS：`server.js:384`（仅在鉴权成功路径设置）
  - 缺失：全局 CSP、`Referrer-Policy`、`Permissions-Policy` 等
- 结论：**部分修复**。

---

## 4. Bug 复扫结果（功能与一致性）

### 4.1 阻断/高优先级未完成
- 管理端设置页仍占位：`src/pages/admin/settings/index.vue:8`
- 管理端统计页仍占位：`src/pages/admin/statistics/index.vue:8`
- 管理端用户页仍占位：`src/pages/admin/users/index.vue:3`
- 农户申报列表混入 Mock：`src/pages/farmer/report/list.vue:77-113`
- 农户供货大厅混入 Mock：`src/pages/farmer/supply/index.vue:110-164`
- 商户财务中心仍为 Mock：`src/pages/merchant/finance/index.vue:50-56`
- 订单详情失败回退 Mock（商户）：`src/pages/merchant/orders/detail.vue:162-170`、`src/pages/merchant/orders/detail.vue:185-205`
- 订单详情失败回退 Mock（处理商）：`src/pages/processor/orders/detail.vue:167-176`、`src/pages/processor/orders/detail.vue:190-212`

### 4.2 文档一致性问题
- 架构文档仍以旧 H5（`auth.js/main_code.js`）为主体：`docs/ARCHITECTURE.md:10-22`
- 与当前 uni 主体并行状态不一致，容易误导验收与维护。

---

## 5. 历史问题修复进度矩阵

### 5.1 安全项（SEC）
| 编号 | 当前状态 | 说明 |
|---|---|---|
| SEC-001 前端身份可伪造 | 部分修复 | uni 页面已大量改为 `/api/me` 回源；但旧 H5 仍依赖本地会话/本地 token。 |
| SEC-002 JWT 密钥硬编码 | 已修复 | 生产环境要求 `JWT_SECRET`，未配置则拒绝启动。 |
| SEC-003 SQL 动态字段拼接 | 已修复 | 本轮未检出 SQL 模板插值注入模式。 |
| SEC-004 上传文件静态暴露 | 回归风险 | 仲裁文件访问已加鉴权，但根目录静态暴露导致更广泛泄露。 |
| SEC-005 授权边界不完整 | 基本修复 | 订单/申报等路径已大量绑定 token 主体；建议补自动化负测。 |
| SEC-006 CORS 全放开 | 已修复 | 已配置白名单 origin。 |
| SEC-007 OTP 内存存储 | 已修复 | 已落库，含过期/尝试次数。 |
| SEC-008 缺少限流 | 已修复 | 登录/注册/OTP 已接入限流。 |
| SEC-009 innerHTML 注入面 | 未修复 | 旧 H5 命中仍非常多。 |
| SEC-010 API Key 前端暴露 | 已修复 | 改为后端 `/api/config/amap` 返回 key。 |
| SEC-011 仅 MIME 上传校验 | 已修复 | 已加入 magic bytes 校验。 |
| SEC-012 哈希轮数不一致 | 已修复 | 已统一由 `BCRYPT_ROUNDS` 配置驱动。 |
| SEC-013 本地 token + XSS 叠加 | 未修复 | 仍在客户端存储 token。 |
| SEC-014 HTTPS/安全头策略 | 部分修复 | 已有部分安全头，仍缺全局 CSP 等。 |

### 5.2 Bug 项（BUG）
| 编号 | 当前状态 | 说明 |
|---|---|---|
| BUG-001 processor_requests 接单字段不存在 | 已修复 | 字段与迁移已补齐。 |
| BUG-002 processor_requests 字段不一致 | 已修复 | 命名已统一并做兼容迁移。 |
| BUG-003 登录页占位 | 已修复 | 已替换为可用登录/注册页。 |
| BUG-004 认证与文档冲突 | 部分修复 | 认证实现前进，但文档与旧 H5 仍有偏差。 |
| BUG-005 哈希策略不一致 | 已修复 | register / register-phone / seed 已统一。 |
| BUG-006 查询越权可能 | 基本修复 | 抽样接口已绑定主体；需负向回归测试闭环。 |
| BUG-007 OTP 防刷不足 | 已修复 | 限流 + 冷却 +尝试次数已覆盖。 |
| BUG-008 多页面依赖 Mock | 未修复 | 多个业务页仍混入 Mock。 |
| BUG-009 管理后台入口无功能 | 未修复 | settings/statistics/users 仍占位。 |
| BUG-010 短信服务 Mock | 已修复 | `smsClient.js` 已接阿里云模式并支持环境控制。 |
| BUG-011 架构文档偏离代码 | 未修复 | `docs/ARCHITECTURE.md` 未同步到 uni 主体。 |

---

## 6. TODO 阻断项进度（来自 03-unfinished-items）
| 编号 | 当前状态 | 说明 |
|---|---|---|
| TODO-001 登录占位 | 已完成 |
| TODO-002 短信 Mock | 已完成 |
| TODO-003 认证信任边界前端化 | 部分完成 |
| TODO-004 processor_requests 未收敛 | 已完成 |
| TODO-005 管理设置占位 | 未完成 |
| TODO-006 管理统计占位 | 未完成 |
| TODO-007 用户管理占位 | 未完成 |
| TODO-008 关键业务依赖 Mock | 未完成 |
| TODO-009 文档未对齐 | 未完成 |

---

## 7. 建议下一批修复优先级
1. **立即修复 P0**：收紧静态资源暴露范围（禁止项目根目录直出，按白名单发布静态目录）。
2. **并行修复 P1**：旧 H5 `innerHTML` 高风险点收敛（至少先覆盖登录、仲裁、列表渲染主链路）。
3. **清理阻断 Bug**：完成 admin settings/statistics/users 基本可用版本，移除业务页 Mock 回退。
4. **补文档与自动化负测**：统一架构文档到 uni 主体；新增越权与匿名访问负向测试。

---

## 8. 备注
- 本报告基于 2026-04-17 当前工作区快照与本地动态验证生成。
- 已确认服务进程在验证后关闭。

---

## 9. 增量修复记录（2026-04-17 当日继续）

### 9.1 已完成
- NEW-SEC-001（P0）根目录静态暴露：已修复。
  - 后端改为白名单根文件发布，移除项目根目录静态直出。
  - 仲裁证据访问路由前置并强制鉴权。
- NEW-SEC-002（P1）query token 泄露面：已修复。
  - 仲裁文件访问仅接受 `Authorization: Bearer <token>`。
  - 前端旧 H5 文件预览改为携带 Authorization 拉取 blob。
- SEC-009（P1）旧 H5 注入面：阶段性收敛。
  - `auth.js` 已新增统一转义工具（HTML / JS 单引号上下文）。
  - CMS 三列表渲染（公告/案例/广告）已完成 ID 白名单、文本转义、图片路径白名单。
  - 仲裁管理列表 `loadArbitrationRequests` 与仲裁详情 `showArbitrationDetail` 已完成核心动态字段收敛。
  - 用户侧仲裁进度列表 `loadMyArbitrations` 已完成同类收敛。
  - 仲裁提交文件预览 `setupFilePreview` 已由 `innerHTML` 拼接改为安全 DOM 节点构建。

### 9.2 当前结论
- 根目录源码/数据库可直接下载的问题已解除。
- 仲裁文件 query token 泄露链路已解除。
- 旧 H5 仲裁主链路注入风险已明显下降，但全量 `innerHTML` 收敛仍未完成。

### 9.3 下一批建议（延续）
1. 继续扫描并收敛旧 H5 剩余高风险 `innerHTML`（优先订单/列表主链路）。
2. 逐步替换内联 `onclick` 模式，改为事件绑定，减少 JS 上下文注入面。
3. 对关键页面补最小回归清单（登录、仲裁列表/详情、文件预览、罚款支付按钮）。

---

## 10. 阶段转入记录（2026-04-17）
- 已从“多轮问题修复”转入“上线准备阶段管理”。
- 阶段总览文档：`05-release-readiness-phase-plan-2026-04-17.md`
- 当前执行步骤：`Step 1 - 上线门禁定义`。
- Step 1 执行文档：`06-step1-release-gates-2026-04-17.md`

### 10.1 转入目的
- 将上线前工作由问题驱动转为门禁驱动，保证每项上线风险可量化、可验证、可签署。

### 10.2 当前状态
- Step 1 文档已创建，状态为 `In Review`。
- 下一动作为确认门禁阈值与证据格式，确认后进入 Step 2（阻断项清零）。