# 阿里云短信接入说明（注册验证码）

## 1. 开通与准备
1. 登录阿里云控制台，开通短信服务
2. 创建短信签名（例如：农废宝）
3. 创建短信模板（验证码类），模板内容示例：`【农废宝】验证码：${code}，5分钟内有效。`
4. 记录以下信息：
   - AccessKeyId
   - AccessKeySecret
   - 短信签名（SignName）
   - 模板代码（TemplateCode）

## 2. 本地环境变量配置
在项目根目录创建/修改 `.env`（或以其他方式导出环境变量）：
```
ALIYUN_ACCESS_KEY_ID=你的KeyId
ALIYUN_ACCESS_KEY_SECRET=你的KeySecret
ALIYUN_SMS_SIGN=农废宝
ALIYUN_SMS_TEMPLATE=SMS_XXXXXX   # 你的模板ID，需包含 ${code}
```
> 注意：不要把 Key/Secret 提交到仓库。生产环境请使用安全的配置中心或 CI/CD 注入。

## 3. 依赖安装
已在 `package.json` 中加入以下依赖：
- `@alicloud/dysmsapi20170525`
- `@alicloud/openapi-client`
- `@alicloud/tea-openapi`
- `@alicloud/tea-util`

执行安装：
```bash
npm install
```

## 4. 发送封装
`smsClient.js` 已封装 `sendOtpSms(phone, code)`，内部会：
- 使用上述环境变量初始化客户端
- 调用阿里云短信 API 发送 6 位验证码
- 在失败时抛出错误（不记录验证码内容）

## 5. 后端接口
- `POST /api/auth/request-otp`
  - Body: `{ phone }`
  - 行为：校验手机号 → 60s 冷却 → 生成 6 位验证码 → 5 分钟过期 → 调用阿里云短信发送
- `POST /api/auth/register-phone`
  - Body: `{ phone, otp, password, role, full_name, agreementAccepted }`
  - 校验：协议勾选、手机号格式、验证码匹配/过期/尝试次数、密码规则(8-16位且含字母和数字)
  - 成功：写入用户（手机号为用户名），返回用户基本信息，不返回密码哈希

登录接口已支持手机号或用户名：
- `POST /api/login` Body: `{ username, password }` // username 可填手机号

## 6. 风控与安全
- 验证码 5 分钟有效，60s 发送冷却，最大 5 次校验失败后需重新获取
- 密码使用 bcrypt（随机盐）哈希；不记录明文密码或验证码
- 生产环境务必使用 HTTPS；限制可信域名/来源
- 日志请勿打印敏感字段（可对手机号做部分掩码）

## 7. 前端交互
- 注册表单已改为：手机号 + 滑块验证 + 短信验证码 + 密码 + 协议勾选
- 发送验证码按钮需完成滑块验证后方可点击；按钮含 60s 倒计时
- 密码输入处已提示规则（8-16 位且含数字和字母）

## 8. 常见问题
- **SignatureDoesNotMatch/InvalidAccessKeyId**：检查 AK/Secret 填写是否正确，是否绑定了子账户权限
- **isv.MOBILE_NUMBER_ILLEGAL**：手机号格式或归属地不符合要求；请用国内 11 位手机号测试
- **isv.BUSINESS_LIMIT_CONTROL**：触发频控（1 条/60s/同手机号）；稍后再试或降低调用频率
- 模板或签名未审核通过：需等待阿里云审核通过后再调用

## 9. 测试步骤
1. 配置好环境变量并 `npm install`
2. 启动后端：`node server.js`
3. 前端打开 `index.html`，点击“注册”
4. 填手机号 → 滑块验证 → 获取验证码 → 填写验证码与密码 → 勾选协议 → 注册
5. 用手机号 + 密码登录，验证成功

---
如需切换到生产域名，请在阿里云短信控制台配置对应的发送策略与频控，确保来源合法、频率可控。
