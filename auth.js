/**
 * 农业废品回收系统 - 身份认证与分流管理
 */

// ====== 身份信息管理 ======
const authSystem = {
    // API 基础 URL - 动态获取当前域名和端口
    get API_BASE() {
        // 如果是通过 Cloudflare 或其他代理访问，使用当前页面的 origin
        // 否则使用 localhost:4000
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:4000';
        } else {
            // 使用当前页面的 origin
            return window.location.origin;
        }
    },
    
    // 当前登录用户信息
    currentUser: null,

    // Socket.io 实例
    socket: null,
    unreadCounts: {},

    // OTP 计时器句柄
    otpTimer: null,
    otpCountdown: 0,

    // 滑块校验状态
    sliderVerified: false,
    
    // 初始化认证系统
    init() {
        console.log('[AuthSystem] Initializing...');
        this.checkLoginStatus();
        this.bindLoginEvents();
        this.bindRegisterEvents();
        this.initSlider();
        if (this.currentUser) this.initSocket();
        console.log('[AuthSystem] Initialized successfully');
    },
    
    // 检查是否已登录
    checkLoginStatus() {
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.redirectToDashboard();
        }
    },
    
    // 绑定登录按钮事件
    bindLoginEvents() {
        const self = this;
        const loginBtn = document.querySelector('.btn-login');
        const signupBtn = document.querySelector('.btn-signup');
        
        console.log('[AuthSystem] bindLoginEvents - loginBtn:', loginBtn, 'signupBtn:', signupBtn);
        
        if (loginBtn) {
            loginBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('[AuthSystem] Login button clicked');
                self.openLoginModal();
            });
        } else {
            console.warn('[AuthSystem] Login button not found');
        }

        if (signupBtn) {
            signupBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('[AuthSystem] Signup button clicked');
                self.openLoginModal();
                self.switchTab('register');
            });
        } else {
            console.warn('[AuthSystem] Signup button not found');
        }
    },

    // 绑定注册相关事件（发送验证码）
    bindRegisterEvents() {
        const sendOtpBtn = document.getElementById('btn-send-otp');
        if (sendOtpBtn) {
            sendOtpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.requestOtp();
            });
        }
    },

    // 初始化滑块验证
    initSlider() {
        const track = document.getElementById('slider-track');
        const knob = document.getElementById('slider-knob');
        const text = document.getElementById('slider-text');
        if (!track || !knob || !text) return;

        const maxX = () => track.clientWidth - knob.clientWidth;

        const reset = () => {
            knob.style.left = '0px';
            track.style.background = '#f0f0f0';
            text.textContent = '按住滑块拖动验证';
            text.style.color = '#666';
            this.sliderVerified = false;
        };

        const complete = () => {
            knob.style.left = maxX() + 'px';
            track.style.background = '#e8f8f2';
            text.textContent = '验证通过';
            text.style.color = '#27ae60';
            this.sliderVerified = true;
        };

        let dragging = false;
        let startX = 0;
        let knobStart = 0;

        const onMove = (clientX) => {
            if (!dragging) return;
            const delta = clientX - startX;
            let pos = knobStart + delta;
            if (pos < 0) pos = 0;
            if (pos > maxX()) pos = maxX();
            knob.style.left = pos + 'px';
            if (pos >= maxX() * 0.95) complete();
        };

        const onMouseMove = (e) => onMove(e.clientX);
        const onTouchMove = (e) => {
            if (e.touches && e.touches.length) onMove(e.touches[0].clientX);
        };

        const stop = () => {
            if (!dragging) return;
            dragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', stop);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', stop);
            if (!this.sliderVerified) reset();
        };

        const start = (clientX) => {
            dragging = true;
            startX = clientX;
            knobStart = parseInt(knob.style.left || '0', 10);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', stop);
            document.addEventListener('touchmove', onTouchMove, { passive: true });
            document.addEventListener('touchend', stop);
        };

        knob.addEventListener('mousedown', (e) => {
            e.preventDefault();
            start(e.clientX);
        });
        knob.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length) {
                start(e.touches[0].clientX);
            }
        }, { passive: true });

        // 点击轨道快速填充
        track.addEventListener('click', (e) => {
            const rect = track.getBoundingClientRect();
            const pos = e.clientX - rect.left;
            if (pos >= maxX() * 0.95) complete();
        });

        // 初始化
        reset();
        this.sliderReset = reset;
    },
    
    // 打开登录弹窗
    openLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            console.log('[AuthSystem] Login modal opened');
        } else {
            console.error('[AuthSystem] login-modal element not found!');
            alert('登录弹窗加载失败，请刷新页面');
        }
    },
    
    // 关闭登录弹窗
    closeLoginModal() {
        document.getElementById('login-modal').style.display = 'none';
    },
    
    // 处理登录逻辑
    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            this.showAlert('请输入用户名和密码', 'warning');
            return;
        }
        
        try {
            // 调用后端 API 登录
            const response = await fetch(`${this.API_BASE}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                this.showAlert(data.error || '登录失败', 'error');
                return;
            }
            
            // 登录成功，保存用户信息
            this.currentUser = {
                id: data.id,
                username: data.username,
                role: data.role,
                name: data.full_name,
                loginTime: new Date().toLocaleString('zh-CN')
            };
            
            // 保存到 sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // 连接 Socket
            this.initSocket();

            // 更新UI
            this.updateNavbar();
            
            // 显示欢迎信息
            this.showAlert(`登录成功！欢迎 ${this.currentUser.name}`, 'success');
            
            // 关闭登录弹窗
            this.closeLoginModal();
            
            // 2秒后跳转到仪表板
            setTimeout(() => this.redirectToDashboard(), 2000);
            
        } catch (error) {
            console.error('登录错误:', error);
            this.showAlert('网络错误，请检查后端服务是否启动', 'error');
        }
    },
    
    // 处理注册逻辑（手机号 + 短信验证码）
    async handleRegister() {
        const phone = document.getElementById('reg-phone').value.trim();
        const otp = document.getElementById('reg-otp').value.trim();
        const password = document.getElementById('reg-password').value.trim();
        const confirmPassword = document.getElementById('reg-confirm-password').value.trim();
        const role = document.getElementById('reg-role').value;
        const name = document.getElementById('reg-name').value.trim();
        const agreement = document.getElementById('reg-agree').checked;

        if (!agreement) return this.showAlert('请先阅读并勾选《隐私政策》《服务协议》', 'warning');
        if (!/^1[3-9]\d{9}$/.test(phone)) return this.showAlert('请输入正确的手机号', 'warning');
        if (!otp) return this.showAlert('请输入短信验证码', 'warning');
        if (!password || !confirmPassword) return this.showAlert('请输入密码并确认', 'warning');
        if (password !== confirmPassword) return this.showAlert('两次输入的密码不一致', 'error');
        if (!(password.length >= 8 && password.length <= 16 && /[A-Za-z]/.test(password) && /[0-9]/.test(password))) {
            return this.showAlert('密码需8-16位，并同时包含数字和字母', 'warning');
        }
        if (!role) return this.showAlert('请选择身份', 'warning');
        if (!name) return this.showAlert('请输入真实姓名', 'warning');

        try {
            const response = await fetch(`${this.API_BASE}/api/auth/register-phone`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone,
                    otp,
                    password,
                    role,
                    full_name: name,
                    agreementAccepted: true
                })
            });

            const data = await response.json();

            if (!response.ok) {
                this.showAlert(data.error || '注册失败', 'error');
                return;
            }

            this.showAlert('注册成功！请使用手机号登录', 'success');

            // 清空表单
            document.getElementById('reg-phone').value = '';
            document.getElementById('reg-otp').value = '';
            document.getElementById('reg-password').value = '';
            document.getElementById('reg-confirm-password').value = '';
            document.getElementById('reg-name').value = '';
            document.getElementById('reg-role').selectedIndex = 0;
            document.getElementById('reg-agree').checked = false;

            // 1.5秒后关闭模态框并切回登录标签
            setTimeout(() => {
                this.switchTab('login');
                this.closeLoginModal();
            }, 1500);

        } catch (error) {
            console.error('注册错误:', error);
            this.showAlert('网络错误，请检查后端服务是否启动', 'error');
        }
    },

    // 发送短信验证码
    async requestOtp() {
        const phone = document.getElementById('reg-phone').value.trim();
        const btn = document.getElementById('btn-send-otp');
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            this.showAlert('请输入正确的手机号', 'warning');
            return;
        }
        if (!this.sliderVerified) {
            this.showAlert('请先完成滑块验证', 'warning');
            return;
        }
        if (this.otpCountdown > 0) return; // 已在冷却中

        try {
            const resp = await fetch(`${this.API_BASE}/api/auth/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const data = await resp.json();
            if (!resp.ok) {
                this.showAlert(data.error || '验证码发送失败', 'error');
                return;
            }
            this.showAlert('验证码已发送，请注意查收', 'success');
            this.startOtpCountdown(btn);
        } catch (err) {
            console.error('发送验证码错误:', err);
            this.showAlert('发送失败，请稍后重试', 'error');
        }
    },

    startOtpCountdown(btn) {
        this.otpCountdown = 60;
        const update = () => {
            if (this.otpCountdown <= 0) {
                btn.disabled = false;
                btn.textContent = '发送验证码';
                if (this.sliderReset) this.sliderReset();
                return;
            }
            btn.disabled = true;
            btn.textContent = `重新发送(${this.otpCountdown}s)`;
            this.otpCountdown -= 1;
            this.otpTimer = setTimeout(update, 1000);
        };
        update();
    },
    
    // 退出登录
    logout() {
        if (confirm('确认要退出登录吗？')) {
            sessionStorage.removeItem('currentUser');
            this.currentUser = null;
            this.updateNavbar();
            this.showAlert('已退出登录', 'success');
            // 返回首页
            document.getElementById('content-area').innerHTML = `
                <div style="animation: fadeIn 0.6s ease; text-align: center; padding-top: 50px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">🍊</div>
                    <h1 style="font-family: 'Noto Sans SC', sans-serif; font-size: 48px; color: var(--text-dark); margin-bottom: 10px; font-weight: 700;">欢迎来到农废宝</h1>
                    <p style="color: var(--text-medium); font-size: 20px; letter-spacing: 1px;">柑橘果肉废物回收数字化管理平台</p>
                    <p style="color: #888; margin-top: 10px;">请登录后继续操作</p>
                    <div style="width: 80px; height: 4px; background: linear-gradient(90deg, var(--primary-green), var(--citrus-orange)); margin: 40px auto; border-radius: 2px;"></div>
                </div>
            `;
        }
    },
    
    // 根据身份分流到对应页面
    redirectToDashboard() {
        const role = this.currentUser.role;
        
        switch(role) {
            case 'admin':
                this.showAdminDashboard();
                break;
            case 'farmer':
                this.showFarmerDashboard();
                break;
            case 'recycler':
                this.showRecyclerDashboard();
                break;
            case 'processor':
                this.showProcessorDashboard();
                break;
            default:
                this.showAlert('未知的身份', 'error');
        }
    },
    
    // ====== 三个身份的仪表板 ======
    
    // 管理员仪表板
    showAdminDashboard() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation: fadeIn 0.5s;">
                <h1 class="page-title">
                    👨‍💼 管理员工作台
                </h1>
                <p style="color: var(--text-medium); font-size: 14px; margin-top: -20px;">登录时间：${this.currentUser.loginTime}</p>
                
                <div class="dashboard-grid">
                    <!-- 系统概览卡片 -->
                    <div class="glass-card" style="padding: 24px; border-left: 6px solid var(--citrus-orange);">
                        <h3 style="color: var(--citrus-orange); margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                            📊 系统概览
                        </h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <p style="margin: 5px 0;">注册用户: <strong>328</strong></p>
                            <p style="margin: 5px 0;">农户: <strong>156</strong></p>
                            <p style="margin: 5px 0;">回收商: <strong>172</strong></p>
                            <p style="margin: 5px 0;">待审核: <strong style="color: var(--citrus-orange);">12</strong></p>
                        </div>
                    </div>
                    
                    <!-- 用户管理卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('user-management')" style="padding: 24px; border-left: 6px solid var(--primary-green); cursor: pointer;">
                        <h3 style="color: var(--primary-green); margin: 0 0 10px 0;">👥 用户管理</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">管理所有用户账户，审核、禁用、删除等操作</p>
                        <button style="background: var(--primary-green); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">进入管理</button>
                    </div>
                    
                    <!-- 申报审核卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('audit-reports')" style="padding: 24px; border-left: 6px solid var(--citrus-gold); cursor: pointer;">
                        <h3 style="color: var(--citrus-gold); margin: 0 0 10px 0;">📝 申报审核</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">审核农户的处理申报，核实处理数据和文件</p>
                        <button style="background: var(--citrus-gold); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">审核申报</button>
                    </div>
                    
                    <!-- 数据统计卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('data-stats')" style="padding: 24px; border-left: 6px solid var(--primary-light); cursor: pointer;">
                        <h3 style="color: var(--primary-light); margin: 0 0 10px 0;">📈 数据统计</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看平台各类数据，处理量、用户活跃度等</p>
                        <button style="background: var(--primary-light); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">查看统计</button>
                    </div>
                    
                    <!-- 系统设置卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('system-settings')" style="padding: 24px; border-left: 6px solid var(--text-medium); cursor: pointer;">
                        <h3 style="color: var(--text-medium); margin: 0 0 10px 0;">⚙️ 系统设置</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">配置平台参数，管理处理点、费用等</p>
                        <button style="background: var(--text-medium); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">进入设置</button>
                    </div>
                    
                    <!-- 仲裁管理卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('arbitration-management')" style="padding: 24px; border-left: 6px solid #e74c3c; cursor: pointer;">
                        <h3 style="color: #e74c3c; margin: 0 0 10px 0;">⚖️ 仲裁管理</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">处理订单纠纷，查看仲裁请求并做出裁决</p>
                        <button style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">进入管理</button>
                    </div>
                </div>
            </div>
        `;
        // 更新侧边栏
        this.updateSidebar('admin');
    },
    
    // 农户仪表板
    showFarmerDashboard() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation: fadeIn 0.5s;">
                <h1 class="page-title">
                    🌾 农户工作台 - ${this.currentUser.name}
                </h1>
                <p style="color: var(--text-medium); font-size: 14px; margin-top: -20px;">登录时间：${this.currentUser.loginTime}</p>
                
                <div class="dashboard-grid">
                    <!-- 我的统计卡片 -->
                    <div class="glass-card" style="padding: 24px; border-left: 6px solid var(--primary-green);">
                        <h3 style="color: var(--primary-green); margin: 0 0 15px 0;">📊 我的统计</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <p style="margin: 5px 0;">今年处理总量: <strong>2,580 斤</strong></p>
                            <p style="margin: 5px 0;">申报记录数: <strong>18</strong></p>
                            <p style="margin: 5px 0;">已批准: <strong style="color: var(--primary-green);">16</strong></p>
                            <p style="margin: 5px 0;">待审核: <strong style="color: var(--citrus-orange);">2</strong></p>
                        </div>
                    </div>
                    
                    <!-- 回收商求购卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('recycler-demands')" style="padding: 24px; border-left: 6px solid var(--citrus-gold); cursor: pointer;">
                        <h3 style="color: var(--citrus-gold); margin: 0 0 10px 0;">📢 回收商求购</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看回收商发布的收购需求，寻找最佳买家</p>
                        <button style="background: var(--citrus-gold); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">查看求购</button>
                    </div>

                    <!-- 发起新申报卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('new-report')" style="padding: 24px; border-left: 6px solid var(--citrus-orange); cursor: pointer;">
                        <h3 style="color: var(--citrus-orange); margin: 0 0 10px 0;">📝 发起申报</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">申报新的柑肉处理，获取处理凭证和记录</p>
                        <button style="background: var(--citrus-orange); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">新建申报</button>
                    </div>
                    
                    <!-- 申报历史卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('my-reports')" style="padding: 24px; border-left: 6px solid var(--citrus-gold); cursor: pointer;">
                        <h3 style="color: var(--citrus-gold); margin: 0 0 10px 0;">📋 申报记录</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看所有申报历史，跟踪申报状态</p>
                        <button style="background: var(--citrus-gold); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">查看记录</button>
                    </div>
                    
                    <!-- 附近处理点查询卡片 -->
                    <div class="glass-card" onclick="window.location.href='farmer-nearby-recyclers.html'" style="padding: 24px; border-left: 6px solid var(--primary-light); cursor: pointer;">
                        <h3 style="color: var(--primary-light); margin: 0 0 10px 0;">🌍 附近处理点</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查找距离最近的处理点，实时显示最近的回收商</p>
                        <button style="background: var(--primary-light); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">查找处理点</button>
                    </div>
                    
                    <!-- 我的账户卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('my-account')" style="padding: 24px; border-left: 6px solid var(--text-medium); cursor: pointer;">
                        <h3 style="color: var(--text-medium); margin: 0 0 10px 0;">👤 我的账户</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">管理账户信息，修改密码和隐私设置</p>
                        <button style="background: var(--text-medium); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">管理账户</button>
                    </div>
                    
                    <!-- 仲裁中心卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('arbitration-center')" style="padding: 24px; border-left: 6px solid #e74c3c; cursor: pointer;">
                        <h3 style="color: #e74c3c; margin: 0 0 10px 0;">⚖️ 仲裁中心</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">提出订单仲裁申请，查看仲裁进度和结果</p>
                        <button style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">进入中心</button>
                    </div>
                </div>
            </div>
        `;
        // 更新侧边栏
        this.updateSidebar('farmer');
        // 检查并显示未读消息红点
        setTimeout(() => this.updateRequestUnreadBadge(), 100);
    },
    
    // 回收商仪表板
    showRecyclerDashboard() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation: fadeIn 0.5s;">
                <h1 class="page-title">
                    ♻️ 回收商工作台 - ${this.currentUser.name}
                </h1>
                <p style="color: var(--text-medium); font-size: 14px; margin-top: -20px;">登录时间：${this.currentUser.loginTime}</p>
                
                <div class="dashboard-grid">
                    <!-- 我的统计卡片 -->
                    <div class="glass-card" style="padding: 24px; border-left: 6px solid var(--primary-light);">
                        <h3 style="color: var(--primary-light); margin: 0 0 15px 0;">📊 我的统计</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <p style="margin: 5px 0;">本月回收: <strong>15,680 斤</strong></p>
                            <p style="margin: 5px 0;">合作农户: <strong>42</strong></p>
                            <p style="margin: 5px 0;">完成交易: <strong style="color: var(--primary-green);">58</strong></p>
                            <p style="margin: 5px 0;">待处理订单: <strong style="color: var(--citrus-orange);">8</strong></p>
                        </div>
                    </div>
                    
                    <!-- 农户供应卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('farmer-supplies')" style="padding: 24px; border-left: 6px solid var(--primary-green); cursor: pointer;">
                        <h3 style="color: var(--primary-green); margin: 0 0 10px 0;">🌾 农户供应</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看农户发布的供应信息，寻找优质货源</p>
                        <button style="background: var(--primary-green); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">查看供应</button>
                    </div>

                    <!-- 发布求购卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('publish-demand')" style="padding: 24px; border-left: 6px solid var(--citrus-orange); cursor: pointer;">
                        <h3 style="color: var(--citrus-orange); margin: 0 0 10px 0;">📢 发布求购</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">发布收购需求，吸引农户投资</p>
                        <button style="background: var(--citrus-orange); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">新建求购</button>
                    </div>
                    
                    <!-- 订单管理卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('my-orders')" style="padding: 24px; border-left: 6px solid var(--citrus-gold); cursor: pointer;">
                        <h3 style="color: var(--citrus-gold); margin: 0 0 10px 0;">📦 订单管理</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看和管理订单，跟踪交易进度</p>
                        <button style="background: var(--citrus-gold); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">管理订单</button>
                    </div>
                    
                    <!-- 处理商需求卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('processor-demands')" style="padding: 24px; border-left: 6px solid var(--primary-light); cursor: pointer;">
                        <h3 style="color: var(--primary-light); margin: 0 0 10px 0;">🏭 处理商需求</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看处理商发布的求购需求，对接处理商</p>
                        <button style="background: var(--primary-light); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">查看需求</button>
                    </div>
                    
                    <!-- 财务中心卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('finance')" style="padding: 24px; border-left: 6px solid var(--text-dark); cursor: pointer;">
                        <h3 style="color: var(--text-dark); margin: 0 0 10px 0;">💰 财务中心</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看账单和收款，管理账户余额</p>
                        <button style="background: var(--text-dark); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">财务管理</button>
                    </div>
                    
                    <!-- 我的账户卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('my-account')" style="padding: 24px; border-left: 6px solid var(--text-medium); cursor: pointer;">
                        <h3 style="color: var(--text-medium); margin: 0 0 10px 0;">👤 我的账户</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">管理账户信息，修改密码和企业信息</p>
                        <button style="background: var(--text-medium); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">管理账户</button>
                    </div>
                    
                    <!-- 仲裁中心卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('arbitration-center')" style="padding: 24px; border-left: 6px solid #e74c3c; cursor: pointer;">
                        <h3 style="color: #e74c3c; margin: 0 0 10px 0;">⚖️ 仲裁中心</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">提出订单仲裁申请，查看仲裁进度和结果</p>
                        <button style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">进入中心</button>
                    </div>
                </div>
            </div>
        `;
        // 更新侧边栏
        this.updateSidebar('recycler');
        // 检查并显示未读消息红点
        setTimeout(() => this.updateRequestUnreadBadge(), 100);
    },
    
    // 果肉处理商仪表板
    showProcessorDashboard() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation: fadeIn 0.5s;">
                <h1 class="page-title">
                    🏭 处理商工作台 - ${this.currentUser.name}
                </h1>
                <p style="color: var(--text-medium); font-size: 14px; margin-top: -20px;">登录时间：${this.currentUser.loginTime}</p>
                
                <div class="dashboard-grid">
                    <!-- 我的统计卡片 -->
                    <div class="glass-card" style="padding: 24px; border-left: 6px solid var(--primary-green);">
                        <h3 style="color: var(--primary-green); margin: 0 0 15px 0;">📊 我的统计</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <p style="margin: 5px 0;">本月处理: <strong>45,000 斤</strong></p>
                            <p style="margin: 5px 0;">合作回收商: <strong>12</strong></p>
                            <p style="margin: 5px 0;">完成订单: <strong style="color: var(--primary-green);">36</strong></p>
                            <p style="margin: 5px 0;">待收货: <strong style="color: var(--citrus-orange);">5</strong></p>
                        </div>
                    </div>

                    <!-- 货源供应卡片 (农户+回收商) -->
                    <div class="glass-card" onclick="authSystem.navigateTo('supply-sources')" style="padding: 24px; border-left: 6px solid var(--primary-light); cursor: pointer;">
                        <h3 style="color: var(--primary-light); margin: 0 0 10px 0;">🌾 货源供应</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看农户和回收商发布的货源信息，批量采购原料</p>
                        <button style="background: var(--primary-light); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">寻找货源</button>
                    </div>

                    <!-- 发布求购卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('publish-demand')" style="padding: 24px; border-left: 6px solid var(--citrus-orange); cursor: pointer;">
                        <h3 style="color: var(--citrus-orange); margin: 0 0 10px 0;">📢 发布求购</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">发布原料收购需求，对接回收商</p>
                        <button style="background: var(--citrus-orange); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">新建求购</button>
                    </div>
                    
                    <!-- 订单管理卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('my-orders')" style="padding: 24px; border-left: 6px solid var(--citrus-gold); cursor: pointer;">
                        <h3 style="color: var(--citrus-gold); margin: 0 0 10px 0;">📦 订单管理</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">管理采购订单，跟踪物流与入库</p>
                        <button style="background: var(--citrus-gold); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">管理订单</button>
                    </div>
                    
                    <!-- 我的账户卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('my-account')" style="padding: 24px; border-left: 6px solid var(--text-medium); cursor: pointer;">
                        <h3 style="color: var(--text-medium); margin: 0 0 10px 0;">👤 我的账户</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">管理企业资质，修改密码和联系人信息</p>
                        <button style="background: var(--text-medium); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">管理账户</button>
                    </div>
                    
                    <!-- 仲裁中心卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('arbitration-center')" style="padding: 24px; border-left: 6px solid #e74c3c; cursor: pointer;">
                        <h3 style="color: #e74c3c; margin: 0 0 10px 0;">⚖️ 仲裁中心</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">提出订单仲裁申请，查看仲裁进度和结果</p>
                        <button style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">进入中心</button>
                    </div>
                </div>
            </div>
        `;
        // 更新侧边栏
        this.updateSidebar('processor');
    },
    
    // ====== 辅助函数 ======
    
    // 更新导航栏（显示登录状态）
    updateNavbar() {
        const loginBtn = document.querySelector('.btn-login');
        const authButtons = document.querySelector('.auth-buttons');
        
        if (this.currentUser) {
            // 已登录状态
            loginBtn.textContent = `👤 ${this.currentUser.name}`;
            loginBtn.style.color = '#1abc9c';
            loginBtn.style.border = '1px solid #1abc9c';
            loginBtn.onclick = (e) => {
                e.preventDefault();
                this.logout();
            };
            
            // 隐藏注册按钮
            const signupBtn = document.querySelector('.btn-signup');
            if (signupBtn) signupBtn.style.display = 'none';
        } else {
            // 未登录状态
            loginBtn.textContent = '登录';
            loginBtn.style.color = '#1abc9c';
            loginBtn.style.border = '1px solid #1abc9c';
            loginBtn.onclick = (e) => {
                e.preventDefault();
                this.openLoginModal();
            };
            
            // 显示注册按钮
            const signupBtn = document.querySelector('.btn-signup');
            if (signupBtn) signupBtn.style.display = 'block';
        }
    },
    
    // 更新侧边栏（根据身份显示不同菜单）
    updateSidebar(role) {
        let menuHTML = '';
        
        if (role === 'admin') {
            menuHTML = `
                <li><a href="#" onclick="authSystem.navigateTo('dashboard')">📊 仪表板</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('user-management')">👥 用户管理</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('audit-reports')">📝 申报审核</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('data-stats')">📈 数据统计</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('arbitration-management')">⚖️ 仲裁管理</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('system-settings')">⚙️ 系统设置</a></li>
                <li style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 20px;"><a href="#" onclick="authSystem.logout()">🚪 退出登录</a></li>
            `;
        } else if (role === 'farmer') {
            menuHTML = `
                <li><a href="#" onclick="authSystem.navigateTo('dashboard')">🏠 我的首页</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('new-report')">📝 发起申报</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('my-reports')">📋 申报记录</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('processing-points')">🗺️ 处理点查询</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('arbitration-center')">⚖️ 仲裁中心</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('my-account')">👤 我的账户</a></li>
                <li style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 20px;"><a href="#" onclick="authSystem.logout()">🚪 退出登录</a></li>
            `;
        } else if (role === 'recycler') {
            menuHTML = `
                <li><a href="#" onclick="authSystem.navigateTo('dashboard')">🏠 我的首页</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('farmer-supplies')">🌾 农户供应</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('publish-demand')">📢 发布求购</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('my-orders')">📦 订单管理</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('processor-demands')">🏭 处理商需求</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('finance')">💰 财务中心</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('arbitration-center')">⚖️ 仲裁中心</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('my-account')">👤 我的账户</a></li>
                <li style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 20px;"><a href="#" onclick="authSystem.logout()">🚪 退出登录</a></li>
            `;
        } else if (role === 'processor') {
            menuHTML = `
                <li><a href="#" onclick="authSystem.navigateTo('dashboard')">🏠 我的首页</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('publish-demand')">📢 发布求购</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('my-orders')">📦 订单管理</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('supply-sources')">🌾 货源供应</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('arbitration-center')">⚖️ 仲裁中心</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('my-account')">👤 我的账户</a></li>
                <li style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 20px;"><a href="#" onclick="authSystem.logout()">🚪 退出登录</a></li>
            `;
        }
        
        const navList = document.querySelector('.nav-list');
        if (navList) {
            navList.innerHTML = menuHTML;
        }
    },
    
    // 页面导航
    navigateTo(page) {
        const container = document.getElementById('content-area');
        const pages = {
            'dashboard': () => this.redirectToDashboard(),
            'user-management': () => {
                container.innerHTML = '<h2>👥 用户管理</h2><p>用户列表将显示在这里...（正在开发中）</p>';
            },
            'audit-reports': () => {
                container.innerHTML = '<h2>📝 申报审核</h2><p>申报审核列表将显示在这里...（正在开发中）</p>';
            },
            'new-report': () => {
                this.showNewReportForm();
            },
            'my-reports': () => {
                this.showMyReports();
            },
            'processing-points': () => {
                container.innerHTML = '<h2>🗺️ 处理点查询</h2><p>处理点列表将显示在这里...（正在开发中）</p>';
            },
            'my-account': () => {
                container.innerHTML = `<h2>👤 我的账户</h2><p>用户名：${this.currentUser.username}</p><p>姓名：${this.currentUser.name}</p><p>身份：${this.getRoleLabel(this.currentUser.role)}</p>`;
            },
            'publish-demand': () => {
                this.showPublishDemandForm();
            },
            'my-orders': () => {
                if (this.currentUser.role === 'recycler') {
                    this.showRecyclerOrders();
                } else if (this.currentUser.role === 'processor') {
                    this.showProcessorOrders();
                } else {
                    container.innerHTML = '<h2>📦 订单管理</h2><p>您的订单列表将显示在这里...（正在开发中）</p>';
                }
            },
            'partner-farmers': () => {
                container.innerHTML = '<h2>🤝 合作农户</h2><p>合作农户列表将显示在这里...（正在开发中）</p>';
            },
            'processor-demands': () => {
                this.showProcessorDemands();
            },
            'finance': () => {
                container.innerHTML = '<h2>💰 财务中心</h2><p>财务信息将显示在这里...（正在开发中）</p>';
            },
            'data-stats': () => {
                container.innerHTML = '<h2>📈 数据统计</h2><p>统计数据将显示在这里...（正在开发中）</p>';
            },
            'system-settings': () => {
                container.innerHTML = '<h2>⚙️ 系统设置</h2><p>系统设置界面将显示在这里...（正在开发中）</p>';
            },
            'recycler-demands': () => {
                this.showRecyclerDemands();
            },
            'recycler-supplies': () => {
                container.innerHTML = '<h2>♻️ 回收商供应</h2><p>回收商供应列表将显示在这里...（正在开发中）</p>';
            },
            'supply-sources': () => {
                this.showSupplySources();
            },
            'farmer-supplies': () => {
                this.showFarmerSupplies();
            },
            'arbitration-center': () => {
                this.showArbitrationCenter();
            },
            'arbitration-management': () => {
                this.showArbitrationManagement();
            }
        };
        if (pages[page]) pages[page]();
    },

    // 农户新建/编辑申报表单
    showNewReportForm(report = null) {
        const container = document.getElementById('content-area');
        const isEdit = !!report;
        const title = isEdit ? '✏️ 编辑申报' : '📝 新建柑肉处理申报';
        const defaultPhotos = (report && report.photo_urls) ? report.photo_urls : [];

        container.innerHTML = `
            <div style="max-width:700px;margin:0 auto;animation:fadeIn 0.5s;">
                <h1 class="page-title">${title}</h1>
                <form id="farmer-report-form" style="margin-top:30px;">
                    ${isEdit ? `<input type="hidden" name="report_id" value="${report.id}">` : ''}
                    <div style="margin-bottom:18px;">
                        <label>回收日期 <span style='color:#e67e22;'>*</span></label>
                        <input type="date" name="pickup_date" required value="${report ? report.pickup_date : ''}" style="width:100%;">
                    </div>
                    <div style="margin-bottom:18px;">
                        <label>回收重量（斤） <span style='color:#e67e22;'>*</span></label>
                        <input type="number" name="weight_kg" min="1" required placeholder="请输入重量" value="${report ? report.weight_kg : ''}" style="width:100%;">
                    </div>
                    <div style="margin-bottom:18px;">
                        <label>收获地点 <span style='color:#e67e22;'>*</span></label>
                        <input type="text" name="location_address" required placeholder="如：陈皮镇××村" value="${report ? report.location_address : ''}" style="width:100%;">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
                        <div>
                            <label>纬度（可选）</label>
                            <input type="number" step="0.000001" name="location_lat" value="${report && report.location_lat ? report.location_lat : ''}" style="width:100%;">
                        </div>
                        <div>
                            <label>经度（可选）</label>
                            <input type="number" step="0.000001" name="location_lng" value="${report && report.location_lng ? report.location_lng : ''}" style="width:100%;">
                        </div>
                    </div>
                    <div style="margin-bottom:18px;">
                        <label>柑橘品种 <span style='color:#e67e22;'>*</span></label>
                        <input type="text" name="citrus_variety" required placeholder="如：新会大红柑" value="${report ? report.citrus_variety : ''}" style="width:100%;">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
                        <div>
                            <label>联系人 <span style='color:#e67e22;'>*</span></label>
                            <input type="text" name="contact_name" required value="${report ? report.contact_name : this.currentUser.name}" style="width:100%;">
                        </div>
                        <div>
                            <label>联系电话 <span style='color:#e67e22;'>*</span></label>
                            <input type="text" name="contact_phone" required placeholder="手机号" value="${report ? report.contact_phone : ''}" style="width:100%;">
                        </div>
                    </div>
                    <div style="margin-bottom:18px;">
                        <label>品级 <span style='color:#e67e22;'>*</span></label>
                        <div style="display:flex; gap:10px; align-items:flex-start;">
                            <select name="grade" required style="flex:1;">
                                <option value="grade1" ${!report || report.grade === 'grade1' ? 'selected' : ''}>一级品柑肉</option>
                                <option value="grade2" ${report && report.grade === 'grade2' ? 'selected' : ''}>二级品柑肉</option>
                                <option value="grade3" ${report && report.grade === 'grade3' ? 'selected' : ''}>三级品柑肉</option>
                                <option value="offgrade" ${report && report.grade === 'offgrade' ? 'selected' : ''}>等外品（残次/边角料）</option>
                            </select>
                            <button type="button" style="padding:16px; border:1px solid #ddd; background:white; border-radius:12px; cursor:pointer;" onclick="const d = document.getElementById('grade-info'); d.style.display = d.style.display === 'none' ? 'block' : 'none';">
                                ℹ️
                            </button>
                        </div>
                        <div id="grade-info" style="display:none; margin-top:10px; background:rgba(255,255,255,0.7); border:1px solid #ddd; padding:15px; border-radius:12px; font-size:13px; line-height:1.6; color:#555;">
                            <div style="margin-bottom:10px;">
                                <strong style="color:var(--primary-green);">一级品柑肉：</strong>新鲜无腐烂、无霉变、无杂质，果肉饱满多汁，甜度达标，无农药残留超标。<br>
                                <span style="color:#888;">对应客户：果汁厂、果醋厂、果酱厂、蜜饯厂；餐饮/茶饮供应链；电商/批发渠道商</span>
                            </div>
                            <div style="margin-bottom:10px;">
                                <strong style="color:var(--primary-green);">二级品柑肉：</strong>新鲜度略逊一级，少量表皮轻微损伤但果肉完好，无腐烂变质，风味达标。<br>
                                <span style="color:#888;">对应客户：陈皮深加工企业；生物医药/保健品企业</span>
                            </div>
                            <div style="margin-bottom:10px;">
                                <strong style="color:var(--primary-green);">三级品柑肉：</strong>果肉无大面积腐烂，可去除少量受损部分，风味略有损耗但营养成分留存。<br>
                                <span style="color:#888;">对应客户：饲料加工企业（制果渣饲料，供给畜牧/水产养殖）；农资/有机肥企业（初步加工后发酵制有机肥）</span>
                            </div>
                            <div>
                                <strong style="color:var(--primary-green);">等外品（残次/边角料柑肉）：</strong>采摘/加工剩余边角料、轻度腐烂可分拣果肉、表皮破损严重果肉。<br>
                                <span style="color:#888;">对应客户：农资/有机肥企业（全量发酵制有机肥，供给本地柑园）；小型饲料加工企业（低成本制基础饲料）。</span>
                            </div>
                        </div>
                    </div>
                    <div style="margin-bottom:18px;">
                        <label>备注说明</label>
                        <textarea name="notes" rows="3" placeholder="可填写处理过程、注意事项等" style="width:100%;">${report ? (report.notes || '') : ''}</textarea>
                    </div>
                    <div style="margin-bottom:18px;">
                        <label>现场照片（可选，最多3张）</label>
                        <input type="file" name="photos" accept="image/*" multiple style="width:100%;">
                        <div id="photo-preview" style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;"></div>
                    </div>
                    <div style="display:flex;gap:16px;justify-content:flex-end;margin-top:30px;">
                        <button type="button" id="btn-save-draft" style="background:#b2bec3;color:#fff;padding:10px 24px;border:none;border-radius:8px;cursor:pointer;">保存草稿</button>
                        <button type="submit" id="btn-publish" style="background:var(--primary-green);color:#fff;padding:10px 24px;border:none;border-radius:8px;cursor:pointer;">${isEdit ? '保存并发布' : '发布申报'}</button>
                    </div>
                </form>
            </div>
        `;

        const previewDiv = document.getElementById('photo-preview');
        const renderPreview = (urls) => {
            previewDiv.innerHTML = '';
            urls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                previewDiv.appendChild(img);
            });
        };
        if (defaultPhotos.length) renderPreview(defaultPhotos);

        const photoInput = document.querySelector('input[name="photos"]');
        photoInput.addEventListener('change', function() {
            const files = Array.from(this.files).slice(0, 3);
            if (files.length === 0) return renderPreview(defaultPhotos);
            const readers = files.map(file => new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            }));
            Promise.all(readers).then(urls => renderPreview(urls));
        });

        document.getElementById('farmer-report-form').onsubmit = (e) => {
            e.preventDefault();
            this.submitFarmerReport('pending', report ? report.id : null, defaultPhotos);
        };
        document.getElementById('btn-save-draft').onclick = () => {
            this.submitFarmerReport('draft', report ? report.id : null, defaultPhotos);
        };
    },

    // 提交农户申报（草稿/发布）
    async submitFarmerReport(status, reportId = null, existingPhotos = []) {
        const form = document.getElementById('farmer-report-form');
        const formData = new FormData(form);
        const files = formData.getAll('photos').filter(f => f && f.size);
        if (files.length > 3) {
            this.showAlert('最多上传3张图片', 'warning');
            return;
        }

        let photoUrls = existingPhotos || [];
        if (files.length > 0) {
            const readers = files.map(file => new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            }));
            photoUrls = await Promise.all(readers);
        }

        const payload = {
            id: reportId || undefined,
            farmer_id: this.currentUser.id,
            pickup_date: formData.get('pickup_date'),
            weight_kg: Number(formData.get('weight_kg')),
            location_address: formData.get('location_address'),
            location_lat: formData.get('location_lat') ? Number(formData.get('location_lat')) : null,
            location_lng: formData.get('location_lng') ? Number(formData.get('location_lng')) : null,
            citrus_variety: formData.get('citrus_variety'),
            contact_name: formData.get('contact_name'),
            contact_phone: formData.get('contact_phone'),
            grade: formData.get('grade') || 'grade2',
            photo_urls: photoUrls,
            status: status,
            notes: formData.get('notes')
        };

        try {
            const resp = await fetch(`${this.API_BASE}/api/farmer-reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            // Handle non-JSON response (e.g., 413 Payload Too Large, 500 Server Error HTML)
            const contentType = resp.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await resp.text();
                throw new Error(`Server Error (${resp.status}): ${text.slice(0, 100)}`);
            }

            const data = await resp.json();
            if (!resp.ok) {
                this.showAlert(data.error || '申报失败', 'error');
                return;
            }
            this.showAlert(status === 'draft' ? '草稿已保存' : '申报已发布', 'success');
            setTimeout(() => this.navigateTo('my-reports'), 1000);
        } catch (err) {
            console.error('Submit report error:', err);
            this.showAlert(`请求失败: ${err.message}`, 'error');
        }
    },

    // 农户申报列表与管理
    async showMyReports() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation:fadeIn 0.5s;">
                <h1 class="page-title">📋 我的申报记录</h1>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin:20px 0;">
                    <button class="filter-btn" data-status="all" style="padding:8px 16px;border-radius:20px;border:none;background:var(--primary-green);color:#fff;cursor:pointer;">全部</button>
                    <button class="filter-btn" data-status="draft" style="padding:8px 16px;border-radius:20px;border:none;background:#dfe6e9;color:#2d3436;cursor:pointer;">草稿</button>
                    <button class="filter-btn" data-status="pending" style="padding:8px 16px;border-radius:20px;border:none;background:#ffeaa7;color:#2d3436;cursor:pointer;">待接单</button>
                    <button class="filter-btn" data-status="accepted" style="padding:8px 16px;border-radius:20px;border:none;background:#74b9ff;color:#fff;cursor:pointer;">已接单</button>
                    <button class="filter-btn" data-status="completed" style="padding:8px 16px;border-radius:20px;border:none;background:#55efc4;color:#2d3436;cursor:pointer;">已完成</button>
                    <button class="filter-btn" data-status="cancelled" style="padding:8px 16px;border-radius:20px;border:none;background:#fab1a0;color:#2d3436;cursor:pointer;">已取消</button>
                </div>
                <div id="report-list"></div>
            </div>
        `;

        const loadReports = async (status = 'all') => {
            const listDiv = document.getElementById('report-list');
            listDiv.innerHTML = '<p style="color:#888;">加载中...</p>';
            try {
                const resp = await fetch(`${this.API_BASE}/api/farmer-reports?farmer_id=${this.currentUser.id}&status=${status}`);
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.error || '加载失败');
                if (!data.length) {
                    listDiv.innerHTML = '<p style="color:#888;">暂无申报记录</p>';
                    return;
                }
                listDiv.innerHTML = data.map(r => `
                    <div class="glass-card" style="padding:18px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                            <div>
                                <strong>${r.report_no || ''}</strong>
                                <span style="margin-left:10px;padding:3px 10px;border-radius:12px;font-size:12px;background:#f1f2f6;color:#2d3436;">${this.getReportStatusLabel(r.status)}</span>
                            </div>
                            <div style="font-size:13px;color:#888;">${r.created_at}</div>
                        </div>
                        <div style="margin-top:10px;font-size:14px;color:#555;line-height:1.7;">
                            回收日期：${r.pickup_date} ｜ 重量：${r.weight_kg} 斤 ｜ 品种：${r.citrus_variety}<br>
                            地址：${r.location_address}
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                            ${r.status === 'accepted' ? `<button data-action="chat" data-id="${r.id}" data-uid="${r.recycler_id}" style="background:var(--citrus-orange);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">💬 联系回收商</button>` : ''}
                            ${r.status === 'draft' ? `<button data-action="publish" data-id="${r.id}" style="background:var(--primary-green);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">发布</button>` : ''}
                            ${(r.status === 'draft' || r.status === 'pending') ? `<button data-action="edit" data-id="${r.id}" style="background:#74b9ff;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">编辑</button>` : ''}
                            ${r.status === 'draft' ? `<button data-action="delete" data-id="${r.id}" style="background:#fab1a0;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">删除</button>` : ''}
                        </div>
                    </div>
                `).join('');
                this.bindReportActions(data);
            } catch (err) {
                listDiv.innerHTML = `<p style="color:#e74c3c;">${err.message}</p>`;
            }
        };

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.style.opacity = '0.6');
                btn.style.opacity = '1';
                loadReports(btn.dataset.status);
            };
        });
        loadReports('all');
    },

    // 处理商查看货源供应（农户+回收商）
    async showSupplySources() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation:fadeIn 0.5s;">
                <h1 class="page-title">🌾 货源供应</h1>
                <p style="color: var(--text-medium); margin-bottom: 20px;">同时查看农户和回收商发布的货源信息</p>
                
                <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
                    <button class="supply-source-tab active" data-source="all" style="padding:10px 20px;border:none;border-radius:20px;cursor:pointer;font-weight:bold;background:var(--primary-green);color:white;">全部货源</button>
                    <button class="supply-source-tab" data-source="farmer" style="padding:10px 20px;border:2px solid var(--citrus-orange);border-radius:20px;cursor:pointer;font-weight:bold;background:white;color:var(--citrus-orange);">🌾 农户货源</button>
                    <button class="supply-source-tab" data-source="recycler" style="padding:10px 20px;border:2px solid var(--primary-light);border-radius:20px;cursor:pointer;font-weight:bold;background:white;color:var(--primary-light);">♻️ 回收商货源</button>
                </div>
                
                <div id="supply-sources-list"></div>
            </div>
        `;

        const loadSources = async (source = 'all') => {
            const listDiv = document.getElementById('supply-sources-list');
            listDiv.innerHTML = '<p style="color:#888;">加载中...</p>';
            
            try {
                let allItems = [];
                
                // 获取农户供应
                if (source === 'all' || source === 'farmer') {
                    const farmerResp = await fetch(`${this.API_BASE}/api/farmer-supplies`);
                    const farmerData = await farmerResp.json();
                    if (farmerResp.ok && farmerData.length) {
                        allItems = allItems.concat(farmerData.map(r => ({...r, source_type: 'farmer'})));
                    }
                }
                
                // 获取回收商供应（这里需要有对应的API）
                if (source === 'all' || source === 'recycler') {
                    const recyclerResp = await fetch(`${this.API_BASE}/api/recycler-supplies`);
                    if (recyclerResp.ok) {
                        const recyclerData = await recyclerResp.json();
                        if (recyclerData.length) {
                            allItems = allItems.concat(recyclerData.map(r => ({...r, source_type: 'recycler'})));
                        }
                    }
                }
                
                if (!allItems.length) {
                    listDiv.innerHTML = '<p style="color:#888;text-align:center;padding:40px;">暂无货源信息</p>';
                    return;
                }
                
                // 按时间排序（最新优先）
                allItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                
                listDiv.innerHTML = allItems.map(r => {
                    const isFarmer = r.source_type === 'farmer';
                    const borderColor = isFarmer ? 'var(--citrus-orange)' : 'var(--primary-light)';
                    const sourceLabel = isFarmer ? '🌾 农户' : '♻️ 回收商';
                    const sourceBg = isFarmer ? '#fff3e0' : '#e8f5e9';
                    
                    return `
                        <div class="glass-card" style="padding:18px;margin-bottom:16px;border-left:4px solid ${borderColor};">
                            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                                <div>
                                    <span style="background:${sourceBg};color:${borderColor};padding:4px 10px;border-radius:12px;font-size:12px;font-weight:bold;">${sourceLabel}</span>
                                    <strong style="margin-left:8px;">${isFarmer ? (r.farmer_name || '农户') : (r.recycler_name || '回收商')}</strong>
                                    <span style="margin-left:8px;font-size:12px;color:#888;">${r.report_no || r.supply_no || ''}</span>
                                </div>
                                <div style="font-size:12px;color:#888;">${r.created_at}</div>
                            </div>
                            <div style="margin-top:12px;background:#f9f9f9;padding:12px;border-radius:8px;">
                                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;font-size:14px;color:#555;">
                                    ${isFarmer ? `
                                        <div>📅 回收日期：${r.pickup_date}</div>
                                        <div>⚖️ 重量：<strong style="color:var(--citrus-orange);">${r.weight_kg} 斤</strong></div>
                                        <div>🍊 品种：${r.citrus_variety}</div>
                                    ` : `
                                        <div>🏷️ 品级：${this.getGradeLabel(r.grade)}</div>
                                        <div>⚖️ 库存：<strong style="color:var(--primary-light);">${r.stock_weight} 斤</strong></div>
                                    `}
                                    <div>📍 地址：${r.location_address || r.address || '未填写'}</div>
                                </div>
                                ${r.notes ? `<div style="margin-top:8px;font-size:13px;color:#888;">备注：${r.notes}</div>` : ''}
                            </div>
                            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                                <button data-source-action="chat" data-id="${r.id}" data-uid="${isFarmer ? r.farmer_id : r.recycler_id}" data-type="${r.source_type}" style="background:${borderColor};color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;">💬 联系${isFarmer ? '农户' : '回收商'}</button>
                                <a href="tel:${isFarmer ? r.farmer_phone : r.contact_phone}" style="background:#74b9ff;color:#fff;border:none;border-radius:6px;padding:8px 16px;text-decoration:none;">📞 电话</a>
                                ${isFarmer && r.status === 'pending' ? `<button data-source-action="accept" data-id="${r.id}" data-type="farmer" style="background:#2ecc71;color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;">✅ 接单</button>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
                
                // 绑定按钮事件
                document.querySelectorAll('[data-source-action]').forEach(btn => {
                    btn.onclick = async () => {
                        const action = btn.dataset.sourceAction;
                        const id = btn.dataset.id;
                        const type = btn.dataset.type;
                        const uid = btn.dataset.uid;
                        
                        if (action === 'chat') {
                            this.openChat(id, uid);
                        } else if (action === 'accept' && type === 'farmer') {
                            if (!confirm('确认接单该货源？')) return;
                            try {
                                const resp = await fetch(`${this.API_BASE}/api/farmer-reports/${id}/accept`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ processor_id: this.currentUser.id })
                                });
                                if (!resp.ok) throw new Error('接单失败');
                                this.showAlert('🎉 接单成功！', 'success');
                                loadSources(source);
                            } catch (err) {
                                this.showAlert(err.message, 'error');
                            }
                        }
                    };
                });
                
            } catch (err) {
                listDiv.innerHTML = `<p style="color:#e74c3c;">${err.message}</p>`;
            }
        };
        
        // 绑定Tab切换
        document.querySelectorAll('.supply-source-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.supply-source-tab').forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'white';
                    t.style.color = t.dataset.source === 'farmer' ? 'var(--citrus-orange)' : (t.dataset.source === 'recycler' ? 'var(--primary-light)' : 'var(--primary-green)');
                });
                tab.classList.add('active');
                tab.style.background = tab.dataset.source === 'farmer' ? 'var(--citrus-orange)' : (tab.dataset.source === 'recycler' ? 'var(--primary-light)' : 'var(--primary-green)');
                tab.style.color = 'white';
                loadSources(tab.dataset.source);
            };
        });
        
        loadSources('all');
    },

    // 回收商查看农户供应列表
    async showFarmerSupplies() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation:fadeIn 0.5s;">
                <h1 class="page-title">🌾 农户供应列表</h1>
                <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:20px 0;">
                    <select id="supply-sort" style="padding:8px 12px;border-radius:10px;">
                        <option value="time">按时间（最新）</option>
                        <option value="weight">按重量（大→小）</option>
                        <option value="distance">按距离（近→远）</option>
                    </select>
                    <input id="recycler-lat" type="number" step="0.000001" placeholder="我的纬度（选填）" style="padding:8px 12px;border-radius:10px;">
                    <input id="recycler-lng" type="number" step="0.000001" placeholder="我的经度（选填）" style="padding:8px 12px;border-radius:10px;">
                    <button id="btn-refresh-supplies" style="background:var(--primary-green);color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;">刷新</button>
                </div>
                <div id="supply-list"></div>
            </div>
        `;

        const loadSupplies = async () => {
            const listDiv = document.getElementById('supply-list');
            listDiv.innerHTML = '<p style="color:#888;">加载中...</p>';
            try {
                const sortBy = document.getElementById('supply-sort').value;
                const lat = document.getElementById('recycler-lat').value;
                const lng = document.getElementById('recycler-lng').value;
                const params = new URLSearchParams({ sort_by: sortBy });
                if (lat && lng) {
                    params.append('recycler_lat', lat);
                    params.append('recycler_lng', lng);
                }
                const resp = await fetch(`${this.API_BASE}/api/farmer-supplies?${params.toString()}`);
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.error || '加载失败');
                if (!data.length) {
                    listDiv.innerHTML = '<p style="color:#888;">暂无供应信息</p>';
                    return;
                }
                listDiv.innerHTML = data.map(r => `
                    <div class="glass-card" style="padding:18px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                            <div>
                                <strong>${r.farmer_name || '农户'}</strong>
                                <span style="margin-left:8px;font-size:12px;color:#888;">${r.report_no || ''}</span>
                            </div>
                            <div style="font-size:13px;color:#888;">${r.created_at}</div>
                        </div>
                        <div style="margin-top:10px;font-size:14px;color:#555;line-height:1.7;">
                            回收日期：${r.pickup_date} ｜ 重量：${r.weight_kg} 斤 ｜ 品种：${r.citrus_variety}<br>
                            地址：${r.location_address}
                            ${r.distance !== null && r.distance !== undefined ? `<br>距离：${this.formatDistance(r.distance)}` : ''}
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                            ${r.status === 'accepted' ? `<button data-supply-action="chat" data-id="${r.id}" data-uid="${r.farmer_id}" style="background:var(--citrus-orange);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">💬 联系农户</button>`:''}
                            ${r.status === 'pending' ? `<button data-supply-action="accept" data-id="${r.id}" style="background:var(--primary-green);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">接单</button>` : `<span style='color:#2ecc71;font-weight:bold;'>✔ 已接单</span>`}
                            <a href="tel:${r.farmer_phone || ''}" style="background:#74b9ff;color:#fff;border:none;border-radius:6px;padding:6px 14px;text-decoration:none;">📞 电话</a>
                        </div>
                    </div>
                `).join('');
                this.bindSupplyActions(data);
            } catch (err) {
                listDiv.innerHTML = `<p style="color:#e74c3c;">${err.message}</p>`;
            }
        };

        document.getElementById('btn-refresh-supplies').onclick = loadSupplies;
        document.getElementById('supply-sort').onchange = loadSupplies;
        loadSupplies();
    },

    bindSupplyActions(list) {
        document.querySelectorAll('[data-supply-action]').forEach(btn => {
            btn.onclick = async () => {
                const action = btn.dataset.supplyAction;
                const id = btn.dataset.id;
                const item = list.find(r => String(r.id) === String(id));
                if (!item) return;

                if (action === 'accept') {
                    if (!confirm('确认接单该农户供应？')) return;
                    try {
                        const resp = await fetch(`${this.API_BASE}/api/farmer-reports/${id}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'accepted', recycler_id: this.currentUser.id })
                        });
                        const data = await resp.json();
                        if (!resp.ok) throw new Error(data.error || '接单失败');
                        this.showAlert('接单成功', 'success');
                        this.showFarmerSupplies();
                    } catch (err) {
                        this.showAlert(err.message, 'error');
                    }
                } else if (action === 'chat') {
                    this.openChat(item.id, btn.dataset.uid);
                }
            };
        });
        this.updateUnreadIndicators();
    },

    // 回收商订单管理
    async showRecyclerOrders() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation:fadeIn 0.5s;">
                <h1 class="page-title">📦 我的订单</h1>
                
                <!-- 顶部标签页 -->
                <div style="display:flex;gap:10px;margin:20px 0;border-bottom:2px solid #e0e0e0;">
                    <button class="tab-btn active" data-tab="supplies" style="padding:10px 20px;border:none;background:transparent;cursor:pointer;font-weight:bold;border-bottom:3px solid var(--primary-green);color:var(--primary-green);">农户供货</button>
                    <button class="tab-btn" data-tab="processor" style="padding:10px 20px;border:none;background:transparent;cursor:pointer;font-weight:bold;border-bottom:3px solid transparent;color:#888;">处理商订单</button>
                    <button class="tab-btn" data-tab="demands" style="padding:10px 20px;border:none;background:transparent;cursor:pointer;font-weight:bold;border-bottom:3px solid transparent;color:#888;">我的求购</button>
                </div>
                
                <!-- 农户供货面板 -->
                <div id="supplies-panel" class="tab-panel">
                    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:20px 0;">
                        <button class="filter-btn" data-status="all" style="padding:8px 16px;border-radius:20px;border:none;background:var(--primary-green);color:#fff;cursor:pointer;">全部</button>
                        <button class="filter-btn" data-status="accepted" style="padding:8px 16px;border-radius:20px;border:none;background:#74b9ff;color:#fff;cursor:pointer;">已接单</button>
                        <button class="filter-btn" data-status="completed" style="padding:8px 16px;border-radius:20px;border:none;background:#55efc4;color:#2d3436;cursor:pointer;">已完成</button>
                    </div>
                    <div id="order-list"></div>
                </div>
                
                <!-- 处理商订单面板 -->
                <div id="processor-panel" class="tab-panel" style="display:none;">
                    <p style="color:var(--text-medium);margin-bottom:20px;">查看已接单的处理商求购订单</p>
                    <div id="processor-order-list"></div>
                </div>
                
                <!-- 我的求购面板 -->
                <div id="demands-panel" class="tab-panel" style="display:none;">
                    <div style="margin:20px 0;">
                        <button onclick="authSystem.navigateTo('publish-demand')" style="padding:10px 20px;background:var(--citrus-orange);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">+ 发布新求购</button>
                    </div>
                    <div id="my-demands-list"></div>
                </div>
            </div>
        `;

        // 标签页切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                const tab = btn.dataset.tab;
                
                // 更新按钮样式
                document.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.borderBottom = '3px solid transparent';
                    b.style.color = '#888';
                });
                btn.classList.add('active');
                btn.style.borderBottom = '3px solid var(--primary-green)';
                btn.style.color = 'var(--primary-green)';
                
                // 显示对应面板
                document.getElementById('supplies-panel').style.display = tab === 'supplies' ? 'block' : 'none';
                document.getElementById('processor-panel').style.display = tab === 'processor' ? 'block' : 'none';
                document.getElementById('demands-panel').style.display = tab === 'demands' ? 'block' : 'none';
                
                // 加载数据
                if (tab === 'supplies') {
                    loadOrders('all');
                } else if (tab === 'processor') {
                    loadProcessorOrders();
                } else if (tab === 'demands') {
                    loadMyDemands();
                }
            };
        });

        const loadOrders = async (status = 'all') => {
            const listDiv = document.getElementById('order-list');
            listDiv.innerHTML = '<p style="color:#888;">加载中...</p>';
            try {
                let url = `${this.API_BASE}/api/farmer-reports?recycler_id=${this.currentUser.id}`;
                if (status !== 'all') url += `&status=${status}`;
                
                const resp = await fetch(url);
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.error || '加载失败');
                
                if (!data.length) {
                    listDiv.innerHTML = '<p style="color:#888;">暂无订单记录</p>';
                    return;
                }
                listDiv.innerHTML = data.map(r => `
                    <div class="glass-card" style="padding:18px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                            <div>
                                <strong>单号: ${r.report_no || ''}</strong>
                                <span style="margin-left:10px;padding:3px 10px;border-radius:12px;font-size:12px;background:#f1f2f6;color:#2d3436;">${this.getReportStatusLabel(r.status)}</span>
                            </div>
                            <div style="font-size:13px;color:#888;">${r.created_at}</div>
                        </div>
                        <div style="margin-top:10px;font-size:14px;color:#555;line-height:1.7;">
                            <strong>农户:</strong> ${r.farmer_name || '未知'} (${r.farmer_phone || '-'})<br>
                            回收日期：${r.pickup_date} ｜ 重量：${r.weight_kg} 斤 ｜ 品种：${r.citrus_variety}<br>
                            地址：${r.location_address}
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                             ${r.status === 'accepted' ? `
                                 <button data-order-action="complete" data-id="${r.id}" style="background:var(--primary-green);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">✅ 完成交易</button>
                                 <button data-order-action="chat" data-id="${r.id}" data-uid="${r.farmer_id}" style="background:var(--citrus-orange);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">💬 联系农户</button>
                             ` : ''}
                             ${r.status === 'completed' ? `
                                 <button data-order-action="chat" data-id="${r.id}" data-uid="${r.farmer_id}" style="background:var(--citrus-orange);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">💬 历史消息</button>
                             ` : ''}
                             <a href="tel:${r.farmer_phone || ''}" style="background:#74b9ff;color:#fff;border:none;border-radius:6px;padding:6px 14px;text-decoration:none;">📞 电话</a>
                        </div>
                    </div>
                `).join('');
                
                this.bindRecyclerOrderActions(data, loadOrders, status);

            } catch (err) {
                listDiv.innerHTML = `<p style="color:#e74c3c;">${err.message}</p>`;
            }
        };

        // 加载回收商接单的处理商订单
        const loadProcessorOrders = async () => {
            const listDiv = document.getElementById('processor-order-list');
            listDiv.innerHTML = '<p style="color:#888;">加载中...</p>';
            
            try {
                const resp = await fetch(`${this.API_BASE}/api/processor-requests?recycler_id=${this.currentUser.id}`);
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.error);
                
                if (!data || data.length === 0) {
                    listDiv.innerHTML = '<p style="color:#888;">暂无处理商订单，前往<a href="javascript:void(0)" onclick="authSystem.navigateTo(\'processor-demands\')" style="color:var(--primary-green);">处理商需求</a>接单</p>';
                    return;
                }

                const gradeLabels = { 'grade1': '一级品', 'grade2': '二级品', 'grade3': '三级品', 'offgrade': '等外级', 'any': '不限品级' };
                const citrusLabels = { 'mandarin': '柑橘', 'orange': '橙子', 'pomelo': '柚子', 'tangerine': '橘子', 'any': '不限种类' };

                listDiv.innerHTML = data.map(r => `
                    <div class="glass-card" style="padding:18px;margin-bottom:16px;border-left:4px solid #9b59b6;">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                            <div>
                                <span style="background:#9b59b6;color:white;padding:3px 10px;border-radius:12px;font-size:12px;">🏭 ${r.processor_name || '处理商'}</span>
                                <span style="margin-left:8px;padding:3px 10px;border-radius:12px;font-size:12px;background:#f0e6ff;color:#9b59b6;">${gradeLabels[r.grade]} ${citrusLabels[r.citrus_type]}</span>
                            </div>
                            <div style="font-size:12px;color:#999;">编号: ${r.request_no}</div>
                        </div>
                        <div style="margin-top:12px;background:#f5f0ff;padding:12px;border-radius:8px;">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;">
                                <p style="margin:0;"><strong>需求量：</strong><span style="color:#9b59b6;font-weight:bold;">${r.weight_kg} 斤</span></p>
                                <p style="margin:0;"><strong>运输：</strong>${r.has_transport ? '可上门收货' : '需送货到厂'}</p>
                                <p style="margin:0;grid-column:1/-1;"><strong>收货地址：</strong>${r.location_address}</p>
                            </div>
                        </div>
                        <div style="margin-top:10px;font-size:14px;color:#555;">
                            <strong>联系人：</strong>${r.contact_name} | ${r.contact_phone}
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                            <button data-processor-order-action="chat" data-id="${r.id}" data-uid="${r.processor_id}" style="background:#9b59b6;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">💬 联系处理商</button>
                            <a href="tel:${r.contact_phone}" style="background:#74b9ff;color:#fff;border:none;border-radius:6px;padding:6px 14px;text-decoration:none;">📞 电话</a>
                        </div>
                    </div>
                `).join('');
                
                // 绑定处理商订单操作
                listDiv.querySelectorAll('[data-processor-order-action]').forEach(btn => {
                    btn.onclick = () => {
                        const action = btn.dataset.processorOrderAction;
                        const id = btn.dataset.id;
                        const uid = btn.dataset.uid;
                        if (action === 'chat') {
                            this.openProcessorRequestChat(id, uid);
                        }
                    };
                });
            } catch (err) {
                listDiv.innerHTML = `<p style="color:#e74c3c;">${err.message}</p>`;
            }
        };

        const loadMyDemands = async () => {
            const listDiv = document.getElementById('my-demands-list');
            listDiv.innerHTML = '<p style="color:#888;">加载中...</p>';
            
            try {
                const resp = await fetch(`${this.API_BASE}/api/recycler-requests?recycler_id=${this.currentUser.id}`);
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.error);
                
                // 保存到实例变量供编辑使用
                this.currentDemands = data;
                
                if (!data.length) {
                    listDiv.innerHTML = '<p style="color:#888;">暂无求购信息，点击上方按钮发布</p>';
                    return;
                }

                const gradeLabels = {
                    'grade1': '一级品柑',
                    'grade2': '二级品柑',
                    'grade3': '三级品柑',
                    'offgrade': '等外柑',
                    'any': '不限品级'
                };

                const statusLabels = {
                    'draft': '草稿',
                    'active': '生效中',
                    'cancelled': '已取消',
                    'expired': '已过期'
                };

                listDiv.innerHTML = data.map(r => {
                    const validText = r.valid_until ? 
                        `至 ${r.valid_until}` : 
                        '<span style="color:var(--primary-green);">长期有效</span>';
                    
                    return `
                        <div class="glass-card" style="padding:20px;margin-bottom:16px;">
                            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
                                <div>
                                    <span style="background:var(--citrus-orange);color:white;padding:4px 12px;border-radius:20px;font-size:14px;margin-right:10px;">
                                        ${gradeLabels[r.grade]}
                                    </span>
                                    <span style="background:#95a5a6;color:white;padding:4px 12px;border-radius:20px;font-size:13px;">
                                        ${statusLabels[r.status]}
                                    </span>
                                </div>
                                <div style="text-align:right;font-size:12px;color:#999;">
                                    ${validText}<br>
                                    编号: ${r.request_no}
                                </div>
                            </div>
                            
                            <div style="background:#f9f9f9;padding:12px;border-radius:8px;margin-bottom:12px;">
                                <p style="margin:4px 0;"><strong>联系人：</strong>${r.contact_name}</p>
                                <p style="margin:4px 0;"><strong>联系电话：</strong>${r.contact_phone}</p>
                                ${r.notes ? `<p style="margin:4px 0;"><strong>备注：</strong>${r.notes}</p>` : ''}
                            </div>
                            
                            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                                ${r.status === 'draft' ? `
                                    <button data-demand-action="edit" data-id="${r.id}" style="background:var(--primary-green);color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">✏️ 编辑</button>
                                    <button data-demand-action="delete" data-id="${r.id}" style="background:#e74c3c;color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">🗑️ 删除</button>
                                ` : ''}
                                ${r.status === 'active' ? `
                                    <button data-demand-action="chat" data-id="${r.id}" style="background:var(--citrus-orange);color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">💬 查看咨询</button>
                                    <button data-demand-action="cancel" data-id="${r.id}" style="background:#f39c12;color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">⏸️ 取消发布</button>
                                ` : ''}
                                ${r.status === 'cancelled' ? `
                                    <button data-demand-action="reactivate" data-id="${r.id}" style="background:var(--primary-green);color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">▶️ 重新发布</button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                // 绑定求购操作按钮 - 只绑定my-demands-list中的按钮
                listDiv.querySelectorAll('[data-demand-action]').forEach(btn => {
                    btn.onclick = async () => {
                        const action = btn.dataset.demandAction;
                        const id = btn.dataset.id;
                        
                        if (action === 'edit') {
                            const item = this.currentDemands.find(d => String(d.id) === String(id));
                            this.showPublishDemandForm(item);
                        } else if (action === 'chat') {
                            // 回收商查看求购咨询
                            this.openRequestChat(id, null);
                        } else if (action === 'delete') {
                            if (!confirm('确定删除这条求购信息？')) return;
                            try {
                                const resp = await fetch(`${this.API_BASE}/api/recycler-requests/${id}?recycler_id=${this.currentUser.id}`, {
                                    method: 'DELETE'
                                });
                                if (!resp.ok) throw new Error('删除失败');
                                this.showAlert('已删除', 'success');
                                loadMyDemands();
                            } catch (err) {
                                this.showAlert(err.message, 'error');
                            }
                        } else if (action === 'cancel' || action === 'reactivate') {
                            const newStatus = action === 'cancel' ? 'cancelled' : 'active';
                            try {
                                const resp = await fetch(`${this.API_BASE}/api/recycler-requests/${id}/status`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: newStatus, recycler_id: this.currentUser.id })
                                });
                                if (!resp.ok) throw new Error('操作失败');
                                this.showAlert('状态已更新', 'success');
                                loadMyDemands();
                            } catch (err) {
                                this.showAlert(err.message, 'error');
                            }
                        }
                    };
                });

            } catch (err) {
                listDiv.innerHTML = `<p style="color:#e74c3c;">${err.message}</p>`;
            }
        };
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.onclick = () => {
                 document.querySelectorAll('.filter-btn').forEach(b => b.style.opacity = '0.6');
                 btn.style.opacity = '1';
                 loadOrders(btn.dataset.status);
            };
        });
        
        loadOrders('all');
    },

    bindRecyclerOrderActions(list, refreshCb, currentStatus) {
        document.querySelectorAll('[data-order-action]').forEach(btn => {
            btn.onclick = async () => {
                const action = btn.dataset.orderAction;
                const id = btn.dataset.id;
                const item = list.find(r => String(r.id) === String(id));
                if (!item) return;

                if (action === 'chat') {
                    this.openChat(item.id, btn.dataset.uid);
                } else if (action === 'complete') {
                    if(!confirm('确认与农户已完成交易？订单状态将设为“已完成”')) return;
                    try {
                         const resp = await fetch(`${this.API_BASE}/api/farmer-reports/${id}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'completed' })
                        });
                        if (!resp.ok) throw new Error('操作失败');
                        this.showAlert('订单已完成', 'success');
                        if (refreshCb) refreshCb(currentStatus);
                    } catch(e) {
                        this.showAlert(e.message, 'error');
                    }
                }
            };
        });
        this.updateUnreadIndicators();
    },
    
    // 处理商订单管理
    async showProcessorOrders() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation:fadeIn 0.5s;">
                <h1 class="page-title">📦 我的求购</h1>
                <div style="margin:20px 0;">
                    <button onclick="authSystem.navigateTo('publish-demand')" style="padding:10px 20px;background:#9b59b6;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">+ 发布新求购</button>
                </div>
                <div id="processor-orders-list"></div>
            </div>
        `;
        this.loadProcessorOrders();
    },

    async loadProcessorOrders() {
        const listDiv = document.getElementById('processor-orders-list');
        listDiv.innerHTML = '<p style="color:#888;">加载中...</p>';
        
        try {
            console.log('[loadProcessorOrders] Fetching for processor_id:', this.currentUser.id);
            const resp = await fetch(`${this.API_BASE}/api/processor-requests?processor_id=${this.currentUser.id}`);
            const data = await resp.json();
            console.log('[loadProcessorOrders] Response:', data);
            if (!resp.ok) throw new Error(data.error);
            
            this.currentProcessorDemands = data;
            
            if (!data.length) {
                listDiv.innerHTML = '<p style="color:#888;">暂无求购信息，点击上方按钮发布</p>';
                return;
            }

            const gradeLabels = { 'grade1': '一级品', 'grade2': '二级品', 'grade3': '三级品', 'offgrade': '等外级', 'any': '不限品级' };
            const citrusLabels = { 'mandarin': '柑橘', 'orange': '橙子', 'pomelo': '柚子', 'tangerine': '橘子', 'any': '不限种类' };
            const statusLabels = { 'draft': '草稿', 'active': '生效中', 'cancelled': '已取消', 'expired': '已过期' };

            listDiv.innerHTML = data.map(r => {
                const validText = r.valid_until ? `至 ${r.valid_until}` : '<span style="color:var(--primary-green);">长期有效</span>';
                return `
                    <div class="glass-card" style="padding:20px;margin-bottom:16px;border-left:4px solid #9b59b6;">
                        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
                            <div>
                                <span style="background:#9b59b6;color:white;padding:4px 12px;border-radius:20px;font-size:14px;margin-right:8px;">${gradeLabels[r.grade]}</span>
                                <span style="background:#f0e6ff;color:#9b59b6;padding:4px 10px;border-radius:20px;font-size:13px;margin-right:8px;">${citrusLabels[r.citrus_type]}</span>
                                <span style="background:#95a5a6;color:white;padding:4px 12px;border-radius:20px;font-size:13px;">${statusLabels[r.status]}</span>
                            </div>
                            <div style="text-align:right;font-size:12px;color:#999;">${validText}<br>编号: ${r.request_no}</div>
                        </div>
                        <div style="background:#f5f0ff;padding:14px;border-radius:8px;margin-bottom:12px;">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                <p style="margin:4px 0;"><strong>需求量：</strong><span style="color:#9b59b6;font-weight:bold;">${r.weight_kg} 斤</span></p>
                                <p style="margin:4px 0;"><strong>运输：</strong>${r.has_transport ? '<span style="color:var(--primary-green);">可上门收货</span>' : '需送货到厂'}</p>
                            </div>
                            <p style="margin:4px 0;"><strong>收货地址：</strong>${r.location_address}</p>
                            <p style="margin:4px 0;"><strong>联系人：</strong>${r.contact_name} | ${r.contact_phone}</p>
                            ${r.notes ? `<p style="margin:4px 0;"><strong>备注：</strong>${r.notes}</p>` : ''}
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;">
                            ${r.status === 'draft' ? `
                                <button data-processor-action="edit" data-id="${r.id}" style="background:#9b59b6;color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">✏️ 编辑</button>
                                <button data-processor-action="publish" data-id="${r.id}" style="background:var(--primary-green);color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">📢 发布</button>
                                <button data-processor-action="delete" data-id="${r.id}" style="background:#e74c3c;color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">🗑️ 删除</button>
                            ` : ''}
                            ${r.status === 'active' ? `
                                <button data-processor-action="chat" data-id="${r.id}" style="background:#9b59b6;color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">💬 查看咨询</button>
                                <button data-processor-action="cancel" data-id="${r.id}" style="background:#f39c12;color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">⏸️ 取消发布</button>
                            ` : ''}
                            ${r.status === 'cancelled' ? `<button data-processor-action="reactivate" data-id="${r.id}" style="background:var(--primary-green);color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">▶️ 重新发布</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            this.bindProcessorOrderActions();
        } catch (err) {
            listDiv.innerHTML = `<p style="color:#e74c3c;">${err.message}</p>`;
        }
    },
    
    bindProcessorOrderActions() {
        document.getElementById('processor-orders-list')?.querySelectorAll('[data-processor-action]').forEach(btn => {
            btn.onclick = async () => {
                const action = btn.dataset.processorAction;
                const id = btn.dataset.id;
                
                if (action === 'edit') {
                    const item = this.currentProcessorDemands.find(d => String(d.id) === String(id));
                    this.showPublishDemandForm(item);
                } else if (action === 'chat') {
                    this.openProcessorRequestChat(id, null);
                } else if (action === 'delete') {
                    if (!confirm('确定删除这条求购信息？')) return;
                    try {
                        const resp = await fetch(`${this.API_BASE}/api/processor-requests/${id}?processor_id=${this.currentUser.id}`, { method: 'DELETE' });
                        if (!resp.ok) throw new Error('删除失败');
                        this.showAlert('已删除', 'success');
                        this.loadProcessorOrders();
                    } catch (err) { this.showAlert(err.message, 'error'); }
                } else if (action === 'publish') {
                    try {
                        const resp = await fetch(`${this.API_BASE}/api/processor-requests/${id}/status`, {
                            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'active', processor_id: this.currentUser.id })
                        });
                        if (!resp.ok) throw new Error('操作失败');
                        this.showAlert('求购已发布', 'success');
                        this.loadProcessorOrders();
                    } catch (err) { this.showAlert(err.message, 'error'); }
                } else if (action === 'cancel' || action === 'reactivate') {
                    const newStatus = action === 'cancel' ? 'cancelled' : 'active';
                    try {
                        const resp = await fetch(`${this.API_BASE}/api/processor-requests/${id}/status`, {
                            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: newStatus, processor_id: this.currentUser.id })
                        });
                        if (!resp.ok) throw new Error('操作失败');
                        this.showAlert('状态已更新', 'success');
                        this.loadProcessorOrders();
                    } catch (err) { this.showAlert(err.message, 'error'); }
                }
            };
        });
    },

    bindReportActions(reportList) {
        document.querySelectorAll('[data-action]')?.forEach(btn => {
            btn.onclick = async () => {
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                const report = reportList.find(r => String(r.id) === String(id));
                if (!report) return;
                if (action === 'edit') {
                    this.showNewReportForm(report);
                } else if (action === 'chat') {
                    this.openChat(report.id, btn.dataset.uid);
                } else if (action === 'publish') {
                    try {
                        const resp = await fetch(`${this.API_BASE}/api/farmer-reports/${report.id}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'pending' })
                        });
                        const data = await resp.json();
                        if (!resp.ok) throw new Error(data.error || '发布失败');
                        this.showAlert('申报已发布', 'success');
                        this.showMyReports();
                    } catch (err) {
                        this.showAlert(err.message, 'error');
                    }
                } else if (action === 'delete') {
                    if (!confirm('确认删除该草稿吗？')) return;
                    try {
                        const resp = await fetch(`${this.API_BASE}/api/farmer-reports/${report.id}?farmer_id=${this.currentUser.id}`, { method: 'DELETE' });
                        const data = await resp.json();
                        if (!resp.ok) throw new Error(data.error || '删除失败');
                        this.showAlert('草稿已删除', 'success');
                        this.showMyReports();
                    } catch (err) {
                        this.showAlert(err.message, 'error');
                    }
                }
            };
        });
        this.updateUnreadIndicators();
    },
    
    // 获取身份标签
    getRoleLabel(role) {
        const labels = {
            'admin': '管理员',
            'farmer': '农户',
            'recycler': '回收商',
            'processor': '处理商'
        };
        return labels[role] || '未知';
    },

    // 获取申报状态标签
    getReportStatusLabel(status) {
        const map = {
            draft: '草稿',
            pending: '待接单',
            accepted: '已接单',
            completed: '已完成',
            cancelled: '已取消'
        };
        return map[status] || '未知状态';
    },

    formatDistance(distance) {
        if (distance === null || distance === undefined) return '';
        if (distance < 1) return `${Math.round(distance * 1000)} 米`;
        return `${distance.toFixed(2)} 公里`;
    },
    
    // 获取品级标签
    getGradeLabel(grade) {
        const labels = {
            'grade1': '一级品',
            'grade2': '二级品',
            'grade3': '三级品',
            'offgrade': '等外级',
            'mixed': '混合品级',
            'any': '不限品级'
        };
        return labels[grade] || grade || '未知';
    },
    
    // 切换登录/注册标签
    switchTab(tab) {
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        console.log('[AuthSystem] switchTab called with tab:', tab);
        
        if (tab === 'login') {
            loginTab.style.borderBottom = '3px solid #1abc9c';
            registerTab.style.borderBottom = '1px solid #ddd';
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            loginTab.style.borderBottom = '1px solid #ddd';
            registerTab.style.borderBottom = '3px solid #1abc9c';
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            if (this.sliderReset) this.sliderReset();
        }
    },
    
    // ====== 即时通讯 ======
    
    initSocket() {
        if (this.socket) return;
        if (!window.io) return console.error('Socket.io script not loaded');
        
        console.log('[AuthSystem] Connecting to socket...');
        this.socket = io(this.API_BASE);
        
        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket.id);
            this.checkUnreadMessages();
        });
        
        this.socket.on('receive_message', (msg) => {
            // Check if chat window is open for this report
            const chatBox = document.getElementById('chat-messages');
            const chatWindow = document.getElementById('chat-window');
            const currentReportId = chatWindow ? chatWindow.dataset.reportId : null;
            
            if (chatBox && String(currentReportId) === String(msg.report_id)) {
                this.appendChatMessage(msg);
                this.markAsRead(msg.report_id); // Read immediately if window open
            } else {
                if (String(msg.sender_id) !== String(this.currentUser.id)) {
                    // Increment unread count
                    this.unreadCounts[msg.report_id] = (this.unreadCounts[msg.report_id] || 0) + 1;
                    this.updateUnreadIndicators();
                    this.showAlert(`收到新消息: ${msg.content.substring(0, 10)}...`, 'info');
                }
            }
        });

        // 接收求购消息
        this.socket.on('receive_request_message', (msg) => {
            const container = document.getElementById(`request-messages-${msg.request_id}`);
            if (container) {
                // 当前聊天窗口打开，直接显示消息
                const isMine = String(msg.sender_id) === String(this.currentUser.id);
                
                let msgHtml;
                if (msg.content_type === 'report_card') {
                    // 渲染订单卡片
                    const report = JSON.parse(msg.content);
                    msgHtml = this.renderReportCardMessage(report, msg, isMine, msg.request_id);
                } else if (msg.content_type === 'system') {
                    // 系统消息 - 刷新整个消息列表以正确处理锁定状态
                    this.socket.emit('get_request_history', { request_id: msg.request_id }, (messages) => {
                        this.displayRequestMessages(messages, msg.request_id);
                    });
                    return;
                } else {
                    // 普通文本消息
                    msgHtml = `
                        <div style="display: flex; justify-content: ${isMine ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
                            <div style="max-width: 70%; background: ${isMine ? 'var(--citrus-orange)' : 'white'}; color: ${isMine ? 'white' : '#333'}; padding: 10px 14px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                ${!isMine ? `<div style="font-size: 12px; color: #666; margin-bottom: 4px;">${msg.sender_name}</div>` : ''}
                                <div>${msg.content}</div>
                                <div style="font-size: 11px; color: ${isMine ? 'rgba(255,255,255,0.7)' : '#999'}; margin-top: 4px; text-align: right;">
                                    ${new Date(msg.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    `;
                }
                
                container.insertAdjacentHTML('beforeend', msgHtml);
                container.scrollTop = container.scrollHeight;
                
                // 标记已读
                if (String(msg.sender_id) !== String(this.currentUser.id)) {
                    this.socket.emit('mark_request_read', { 
                        request_id: msg.request_id, 
                        user_id: this.currentUser.id 
                    });
                }
            } else if (String(msg.sender_id) !== String(this.currentUser.id)) {
                // 窗口未打开，显示通知并更新未读计数
                const notifyText = msg.content_type === 'report_card' ? '收到申报订单' : 
                                   msg.content_type === 'system' ? '收到订单通知' : 
                                   `收到求购消息: ${msg.content.substring(0, 10)}...`;
                this.showAlert(notifyText, 'info');
                
                // 更新求购消息未读计数
                const key = `request_${msg.request_id}`;
                this.unreadCounts[key] = (this.unreadCounts[key] || 0) + 1;
                this.updateRequestUnreadBadge();
            }
        });
        
        // 接收处理商消息
        this.socket.on('receive_processor_message', (msg) => {
            const container = document.getElementById(`processor-messages-${msg.request_id}`);
            if (container) {
                const isMine = String(msg.sender_id) === String(this.currentUser.id);
                
                let msgHtml;
                if (msg.content_type === 'system') {
                    msgHtml = `
                        <div style="text-align: center; margin: 16px 0;">
                            <span style="background: #e8f4fd; color: #1890ff; padding: 6px 16px; border-radius: 20px; font-size: 12px;">
                                📢 ${msg.content}
                            </span>
                        </div>
                    `;
                } else if (msg.content_type === 'report_card') {
                    // 渲染报告卡片
                    try {
                        const report = JSON.parse(msg.content);
                        msgHtml = this.renderProcessorReportCardMessage(report, msg, isMine, msg.request_id);
                    } catch (e) {
                        console.error('Parse report card error in receive event:', e);
                        msgHtml = `
                            <div style="display: flex; justify-content: ${isMine ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
                                <div style="max-width: 70%; padding: 12px 16px; border-radius: 12px; background: #ffebee; color: #c62828;">
                                    <p style="margin: 0;">⚠️ 申报卡片解析失败</p>
                                </div>
                            </div>
                        `;
                    }
                } else {
                    msgHtml = `
                        <div style="display: flex; justify-content: ${isMine ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
                            <div style="max-width: 70%; background: ${isMine ? '#9b59b6' : 'white'}; color: ${isMine ? 'white' : '#333'}; padding: 10px 14px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                ${!isMine ? `<div style="font-size: 12px; color: #666; margin-bottom: 4px;">${msg.sender_name}</div>` : ''}
                                <div>${msg.content}</div>
                                <div style="font-size: 11px; color: ${isMine ? 'rgba(255,255,255,0.7)' : '#999'}; margin-top: 4px; text-align: right;">
                                    ${new Date(msg.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    `;
                }
                
                container.insertAdjacentHTML('beforeend', msgHtml);
                container.scrollTop = container.scrollHeight;
                
                // 标记已读
                if (String(msg.sender_id) !== String(this.currentUser.id)) {
                    this.socket.emit('mark_processor_read', { 
                        request_id: msg.request_id, 
                        user_id: this.currentUser.id 
                    });
                }
            } else if (String(msg.sender_id) !== String(this.currentUser.id)) {
                this.showAlert(`收到处理商消息: ${msg.content.substring(0, 10)}...`, 'info');
                
                // 更新处理商消息未读计数
                const key = `processor_${msg.request_id}`;
                this.unreadCounts[key] = (this.unreadCounts[key] || 0) + 1;
                this.updateProcessorUnreadBadge();
            }
        });
    },
    
    // 更新处理商消息红点
    updateProcessorUnreadBadge() {
        let totalUnread = 0;
        Object.keys(this.unreadCounts).forEach(key => {
            if (key.startsWith('processor_')) {
                totalUnread += this.unreadCounts[key];
            }
        });
        
        // 更新回收商"处理商需求"卡片红点
        const processorDemandsCard = document.querySelector('[onclick*="processor-demands"]');
        if (processorDemandsCard) {
            this.updateBadgeOnElement(processorDemandsCard, totalUnread);
        }
    },
    
    // 更新求购消息红点
    updateRequestUnreadBadge() {
        // 计算求购相关的未读消息总数
        let totalUnread = 0;
        Object.keys(this.unreadCounts).forEach(key => {
            if (key.startsWith('request_')) {
                totalUnread += this.unreadCounts[key];
            }
        });
        
        // 更新农户"回收商求购"卡片红点
        const farmerDemandsCard = document.querySelector('[onclick*="recycler-demands"]');
        if (farmerDemandsCard) {
            this.updateBadgeOnElement(farmerDemandsCard, totalUnread);
        }
        
        // 更新回收商"订单管理/我的订单"卡片红点
        const recyclerOrdersCard = document.querySelector('[onclick*="my-orders"]');
        if (recyclerOrdersCard) {
            this.updateBadgeOnElement(recyclerOrdersCard, totalUnread);
        }
    },
    
    // 在元素上更新红点角标
    updateBadgeOnElement(element, count) {
        // 移除旧的角标
        const existing = element.querySelector('.msg-badge');
        if (existing) existing.remove();
        
        if (count > 0) {
            element.style.position = 'relative';
            const badge = document.createElement('span');
            badge.className = 'msg-badge';
            badge.style.cssText = `
                position: absolute;
                top: 8px;
                right: 8px;
                background: #ff4757;
                color: white;
                font-size: 11px;
                font-weight: bold;
                min-width: 20px;
                height: 20px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 6px;
                box-shadow: 0 2px 6px rgba(255, 71, 87, 0.4);
                animation: pulse 2s infinite;
            `;
            badge.textContent = count > 99 ? '99+' : count;
            element.appendChild(badge);
        }
    },
    
    checkUnreadMessages() {
        if (!this.currentUser || !this.socket) return;
        
        // 检查聊天消息未读数
        this.socket.emit('check_unread', this.currentUser.id, (data) => {
            console.log('Unread messages:', data);
            // 清除旧的report相关计数
            Object.keys(this.unreadCounts).forEach(key => {
                if (!key.startsWith('request_')) {
                    delete this.unreadCounts[key];
                }
            });
            if (data && Array.isArray(data)) {
                data.forEach(item => {
                    this.unreadCounts[item.report_id] = item.count;
                });
            }
            this.updateUnreadIndicators();
        });
        
        // 检查求购消息未读数
        this.socket.emit('check_request_unread', this.currentUser.id, (data) => {
            console.log('Unread request messages:', data);
            // 清除旧的request相关计数
            Object.keys(this.unreadCounts).forEach(key => {
                if (key.startsWith('request_')) {
                    delete this.unreadCounts[key];
                }
            });
            if (data && Array.isArray(data)) {
                data.forEach(item => {
                    this.unreadCounts[`request_${item.request_id}`] = item.count;
                });
            }
            this.updateRequestUnreadBadge();
        });
    },
    
    updateUnreadIndicators() {
        // Update both farmer and recycler lists
        document.querySelectorAll('[data-action="chat"], [data-supply-action="chat"], [data-order-action="chat"]').forEach(btn => {
            const reportId = btn.dataset.id;
            const count = this.unreadCounts[reportId];
            
            // Remove existing dot
            const existing = btn.querySelector('.unread-dot');
            if (existing) existing.remove();
            
            if (count > 0) {
                const dot = document.createElement('span');
                dot.className = 'unread-dot';
                dot.style.cssText = `
                    background: #ff4757; color: white; border-radius: 50%; 
                    min-width: 18px; height: 18px; font-size: 10px; 
                    display: inline-flex; align-items: center; justify-content: center;
                    position: absolute; top: -8px; right: -8px; padding: 0 4px; border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                `;
                dot.textContent = count > 99 ? '99+' : count;
                btn.style.position = 'relative'; 
                btn.appendChild(dot);
            }
        });
    },

    openChat(reportId, targetUserId) {
        if (!this.currentUser) return this.showAlert('请先登录', 'warning');
        
        // Check for valid target user
        if (!targetUserId || targetUserId === 'undefined' || targetUserId === 'null') {
            return this.showAlert('无法获取对方信息，请刷新页面重试', 'error');
        }

        if (!this.socket) this.initSocket();
        
        // Remove existing chat window if any
        const existing = document.getElementById('chat-window');
        if (existing) existing.remove();
        
        // Show loading
        const loading = document.createElement('div');
        loading.id = 'chat-loading-toast';
        loading.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:15px 25px;background:rgba(0,0,0,0.8);color:white;border-radius:8px;z-index:9999;font-size:14px;';
        loading.innerHTML = '<span class="spin">↻</span> 正在连接聊天...';
        document.body.appendChild(loading);

        // Join room
        const roomName = `report_${reportId}`;
        this.socket.emit('join_room', roomName);
        
        // Load history
        this.socket.emit('get_history', reportId, (messages) => {
            const loader = document.getElementById('chat-loading-toast');
            if (loader) loader.remove();
            
            this.renderChatWindow(reportId, targetUserId, messages);
            this.markAsRead(reportId);
        });

        // Safety timeout
        setTimeout(() => {
            const loader = document.getElementById('chat-loading-toast');
            if (loader) {
                loader.remove();
                if (!document.getElementById('chat-window')) {
                     this.showAlert('聊天服务连接超时，请检查网络', 'error');
                }
            }
        }, 8000);
    },
    
    markAsRead(reportId) {
        if(!this.socket || !this.currentUser) return;
        this.socket.emit('mark_read', { report_id: reportId, user_id: this.currentUser.id });
        
        // Clear local count
        if (this.unreadCounts[reportId]) {
            delete this.unreadCounts[reportId];
            this.updateUnreadIndicators();
        }
    },

    renderChatWindow(reportId, targetUserId, messages) {
        const div = document.createElement('div');
        div.id = 'chat-window';
        div.dataset.reportId = reportId;
        div.dataset.targetUserId = targetUserId;
        
        div.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; width: 380px; height: 550px;
            background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            display: flex; flex-direction: column; z-index: 2500; overflow: hidden;
            animation: slideUp 0.3s ease; border: 1px solid #e0e0e0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
        `;
        
        div.innerHTML = `
            <div style="padding: 16px 20px; background: linear-gradient(135deg, #1abc9c 0%, #16a085 100%); color: white; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div>
                    <div style="font-weight: 600; font-size: 15px;">💬 订单沟通</div>
                    <div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">申报单号 #${reportId}</div>
                </div>
                <button id="close-chat" style="background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; font-size: 22px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">×</button>
            </div>
            <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 16px; background: #f5f5f5; display: flex; flex-direction: column; gap: 12px;"></div>
            <div style="padding: 12px 16px; border-top: 1px solid #e0e0e0; background: white;">
                <div style="display: flex; gap: 10px; align-items: flex-end;">
                    <input type="text" id="chat-input" placeholder="输入消息..." maxlength="500" style="flex: 1; padding: 12px 16px; border: 1px solid #ddd; border-radius: 24px; outline: none; font-size: 14px; transition: border 0.2s;">
                    <button id="chat-send" style="background: #1abc9c; color: white; border: none; padding: 12px 24px; border-radius: 24px; cursor: pointer; font-weight: 500; font-size: 14px; transition: all 0.2s; min-width: 70px;">发送</button>
                </div>
                <div style="font-size: 11px; color: #999; margin-top: 6px; padding: 0 4px;">按 Enter 发送消息</div>
            </div>
        `;
        
        document.body.appendChild(div);
        
        const msgContainer = div.querySelector('#chat-messages');
        messages.forEach(msg => this.appendChatMessage(msg, msgContainer));
        
        // Scroll to bottom
        setTimeout(() => msgContainer.scrollTop = msgContainer.scrollHeight, 100);

        // Events
        div.querySelector('#close-chat').onclick = () => div.remove();
        
        const sendBtn = div.querySelector('#chat-send');
        const input = div.querySelector('#chat-input');
        
        const send = () => {
            const content = input.value.trim();
            if (!content) return;
            
            this.socket.emit('send_message', {
                report_id: reportId,
                sender_id: this.currentUser.id,
                receiver_id: targetUserId,
                content: content
            });
            input.value = '';
            input.focus();
        };
        
        sendBtn.onclick = send;
        input.onkeypress = (e) => { 
            if (e.key === 'Enter') send(); 
        };
        
        // Focus input
        setTimeout(() => input.focus(), 200);
    },
    
    appendChatMessage(msg, container = null) {
        if (!container) container = document.getElementById('chat-messages');
        if (!container) return;
        
        const isSelf = String(msg.sender_id) === String(this.currentUser.id);
        
        // Message wrapper
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: ${isSelf ? 'flex-end' : 'flex-start'};
            gap: 4px;
        `;
        
        // Message bubble
        const el = document.createElement('div');
        el.style.cssText = `
            max-width: 75%; padding: 10px 14px; 
            border-radius: ${isSelf ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};
            font-size: 14px; line-height: 1.5;
            background: ${isSelf ? '#1abc9c' : 'white'};
            color: ${isSelf ? 'white' : '#333'};
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            word-wrap: break-word;
            word-break: break-word;
        `;
        el.textContent = msg.content;
        
        // Time stamp
        const time = document.createElement('div');
        time.style.cssText = `
            font-size: 11px; 
            color: ${isSelf ? 'rgba(255,255,255,0.8)' : '#999'}; 
            margin-top: 4px;
        `;
        const date = new Date(msg.created_at);
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        time.textContent = `${hours}:${minutes}`;
        el.appendChild(time);
        
        wrapper.appendChild(el);
        container.appendChild(wrapper);
        
        // Smooth scroll
        setTimeout(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }, 50);
    },

    // ========== 回收商求购功能 ==========
    
    // 显示发布求购表单
    showPublishDemandForm(editData = null) {
        const container = document.getElementById('content-area');
        const isEdit = !!editData;
        const isProcessor = this.currentUser.role === 'processor';
        
        if (isProcessor) {
            // 处理商求购表单
            container.innerHTML = `
                <div style="animation: fadeIn 0.5s; max-width: 800px; margin: 0 auto;">
                    <h1 class="page-title">📝 ${isEdit ? '编辑' : '新建'}柑肉求购</h1>
                    
                    <form id="processor-demand-form" class="glass-card" style="padding: 30px;">
                        <div class="form-row">
                            <div class="form-group">
                                <label>需求重量(斤) <span style="color: red;">*</span></label>
                                <input type="number" id="demand-weight" placeholder="如：5000" value="${editData?.weight_kg || ''}" min="1" required>
                            </div>
                            
                            <div class="form-group">
                                <label>柑肉品级 <span style="color: red;">*</span></label>
                                <select id="demand-grade" required>
                                    <option value="">-- 请选择品级 --</option>
                                    <option value="grade1" ${editData?.grade === 'grade1' ? 'selected' : ''}>一级品</option>
                                    <option value="grade2" ${editData?.grade === 'grade2' ? 'selected' : ''}>二级品</option>
                                    <option value="grade3" ${editData?.grade === 'grade3' ? 'selected' : ''}>三级品</option>
                                    <option value="offgrade" ${editData?.grade === 'offgrade' ? 'selected' : ''}>等外级</option>
                                    <option value="any" ${editData?.grade === 'any' ? 'selected' : ''}>不限品级</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>柑肉种类 <span style="color: red;">*</span></label>
                            <select id="demand-citrus-type" required>
                                <option value="">-- 请选择种类 --</option>
                                <option value="mandarin" ${editData?.citrus_type === 'mandarin' ? 'selected' : ''}>柑橘</option>
                                <option value="orange" ${editData?.citrus_type === 'orange' ? 'selected' : ''}>橙子</option>
                                <option value="pomelo" ${editData?.citrus_type === 'pomelo' ? 'selected' : ''}>柚子</option>
                                <option value="tangerine" ${editData?.citrus_type === 'tangerine' ? 'selected' : ''}>橘子</option>
                                <option value="any" ${editData?.citrus_type === 'any' ? 'selected' : ''}>不限种类</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>收货地址 <span style="color: red;">*</span></label>
                            <input type="text" id="demand-address" placeholder="如：广东省江门市新会区XX工业园" value="${editData?.location_address || ''}" required>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>联系人 <span style="color: red;">*</span></label>
                                <input type="text" id="demand-contact-name" placeholder="如：张经理" value="${editData?.contact_name || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label>联系电话 <span style="color: red;">*</span></label>
                                <input type="tel" id="demand-contact-phone" placeholder="如：13800138000" value="${editData?.contact_phone || ''}" required>
                            </div>
                        </div>
                        
                        <div class="form-group" style="background: #fff9e6; padding: 15px; border-radius: 10px; border: 1px solid #ffe58f;">
                            <label style="font-weight: bold; color: #d48806;">🚚 是否具备柑肉运输能力？</label>
                            <div style="display: flex; gap: 20px; margin-top: 10px;">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="radio" name="has-transport" value="1" ${editData?.has_transport ? 'checked' : ''}>
                                    <span>是 - 可派车到农户处收货</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="radio" name="has-transport" value="0" ${!editData?.has_transport ? 'checked' : ''}>
                                    <span>否 - 仅接受回收商送货</span>
                                </label>
                            </div>
                            <span class="hint-text" style="display: block; margin-top: 8px;">💡 选择"是"将同时向农户和回收商推送您的求购；选择"否"仅向回收商推送</span>
                        </div>

                        <div class="form-group">
                            <label>有效期截止至</label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <input type="date" id="demand-valid-until" value="${editData?.valid_until || ''}" style="flex: 1;">
                                <label style="display: flex; align-items: center; gap: 6px; margin: 0;">
                                    <input type="checkbox" id="demand-permanent" ${!editData?.valid_until ? 'checked' : ''}>
                                    <span>长期有效</span>
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>备注说明</label>
                            <textarea id="demand-notes" rows="3" placeholder="可输入更详细的需求信息，如：价格、品质要求等">${editData?.notes || ''}</textarea>
                        </div>

                        <div style="display: flex; gap: 15px; margin-top: 30px;">
                            <button type="button" onclick="authSystem.saveProcessorDemand('draft', ${editData?.id || 'null'})" style="flex: 1; padding: 14px; background: #95a5a6; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
                                💾 存为草稿
                            </button>
                            <button type="submit" style="flex: 2; padding: 14px; background: var(--citrus-orange); color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
                                📢 ${isEdit ? '保存修改' : '发布求购'}
                            </button>
                        </div>
                    </form>
                </div>
            `;
            
            // 绑定表单提交
            document.getElementById('processor-demand-form').onsubmit = async (e) => {
                e.preventDefault();
                await this.saveProcessorDemand('active', editData?.id);
            };
            
            // 长期有效复选框逻辑
            const permanentCheckbox = document.getElementById('demand-permanent');
            const dateInput = document.getElementById('demand-valid-until');
            permanentCheckbox.onchange = () => {
                dateInput.disabled = permanentCheckbox.checked;
                if (permanentCheckbox.checked) dateInput.value = '';
            };
            if (permanentCheckbox.checked) dateInput.disabled = true;
            
        } else {
            // 回收商求购表单 - 增加面向农户/处理商选择
            container.innerHTML = `
                <div style="animation: fadeIn 0.5s; max-width: 800px; margin: 0 auto;">
                    <h1 class="page-title">📝 ${isEdit ? '编辑' : '新建'}求购/供应信息</h1>
                    
                    <!-- 选择面向对象 -->
                    <div class="glass-card" style="padding: 20px; margin-bottom: 20px;">
                        <label style="font-weight: bold; color: #333; margin-bottom: 15px; display: block;">📌 选择发布类型</label>
                        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                            <label style="flex: 1; min-width: 200px; padding: 15px; border: 2px solid var(--citrus-orange); border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.3s;" id="target-farmer-label">
                                <input type="radio" name="target-type" value="farmer" checked style="width: 20px; height: 20px;">
                                <div>
                                    <strong style="color: var(--citrus-orange);">🌾 面向农户求购</strong>
                                    <p style="margin: 5px 0 0; font-size: 12px; color: #888;">发布求购需求，向农户收购柑肉</p>
                                </div>
                            </label>
                            <label style="flex: 1; min-width: 200px; padding: 15px; border: 2px solid #9b59b6; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.3s;" id="target-processor-label">
                                <input type="radio" name="target-type" value="processor" style="width: 20px; height: 20px;">
                                <div>
                                    <strong style="color: #9b59b6;">🏭 面向处理商供应</strong>
                                    <p style="margin: 5px 0 0; font-size: 12px; color: #888;">发布供应信息，向处理商出售库存</p>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- 面向农户的求购表单 -->
                    <form id="demand-form-farmer" class="glass-card" style="padding: 30px;">
                        <div class="form-group">
                            <label>要回收的品级 <span style="color: red;">*</span></label>
                            <select id="demand-grade" required>
                                <option value="">-- 请选择品级 --</option>
                                <option value="grade1" ${editData?.grade === 'grade1' ? 'selected' : ''}>一级品柑</option>
                                <option value="grade2" ${editData?.grade === 'grade2' ? 'selected' : ''}>二级品柑</option>
                                <option value="grade3" ${editData?.grade === 'grade3' ? 'selected' : ''}>三级品柑</option>
                                <option value="offgrade" ${editData?.grade === 'offgrade' ? 'selected' : ''}>等外柑</option>
                                <option value="any" ${editData?.grade === 'any' ? 'selected' : ''}>不限品级</option>
                            </select>
                            <span class="hint-text">ℹ️ 请选择您需要回收的柑肉品级</span>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>联系人 <span style="color: red;">*</span></label>
                                <input type="text" id="demand-contact-name" placeholder="如：李农户" value="${editData?.contact_name || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label>联系电话 <span style="color: red;">*</span></label>
                                <input type="tel" id="demand-contact-phone" placeholder="如：13800138000" value="${editData?.contact_phone || ''}" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>有效期截止至</label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <input type="date" id="demand-valid-until" value="${editData?.valid_until || ''}" style="flex: 1;">
                                <label style="display: flex; align-items: center; gap: 6px; margin: 0;">
                                    <input type="checkbox" id="demand-permanent" ${!editData?.valid_until ? 'checked' : ''}>
                                    <span>长期有效</span>
                                </label>
                            </div>
                            <span class="hint-text">💡 不选择日期或勾选"长期有效"表示该求购长期有效</span>
                        </div>

                        <div class="form-group">
                            <label>备注说明</label>
                            <textarea id="demand-notes" rows="4" placeholder="可输入更详细的需求信息，如：价格、数量要求等">${editData?.notes || ''}</textarea>
                        </div>

                        <div style="display: flex; gap: 15px; margin-top: 30px;">
                            ${isEdit ? `
                                <button type="button" onclick="authSystem.navigateTo('my-orders')" style="flex: 1; padding: 14px; background: #7f8c8d; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
                                    ← 返回
                                </button>
                            ` : `
                                <button type="button" onclick="authSystem.saveDemand('draft', ${editData?.id || 'null'})" style="flex: 1; padding: 14px; background: #95a5a6; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
                                    💾 存为草稿
                                </button>
                            `}
                            <button type="submit" style="flex: 2; padding: 14px; background: var(--citrus-orange); color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
                                📢 ${isEdit ? '保存修改' : '发布求购'}
                            </button>
                        </div>
                    </form>
                    
                    <!-- 面向处理商的供应表单 -->
                    <form id="demand-form-processor" class="glass-card" style="padding: 30px; display: none;">
                        <div class="form-group">
                            <label>能提供的品级 <span style="color: red;">*</span></label>
                            <select id="supply-grade" required>
                                <option value="">-- 请选择品级 --</option>
                                <option value="grade1">一级品柑</option>
                                <option value="grade2">二级品柑</option>
                                <option value="grade3">三级品柑</option>
                                <option value="offgrade">等外柑</option>
                                <option value="mixed">混合品级</option>
                            </select>
                            <span class="hint-text">ℹ️ 请选择您能提供的柑肉品级</span>
                        </div>

                        <div class="form-group">
                            <label>库存重量(斤) <span style="color: red;">*</span></label>
                            <input type="number" id="supply-weight" placeholder="如：5000" min="1" required>
                            <span class="hint-text">ℹ️ 请输入您目前的库存重量</span>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>联系人 <span style="color: red;">*</span></label>
                                <input type="text" id="supply-contact-name" placeholder="如：王回收商" required>
                            </div>
                            
                            <div class="form-group">
                                <label>联系电话 <span style="color: red;">*</span></label>
                                <input type="tel" id="supply-contact-phone" placeholder="如：13800138000" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>所在地址</label>
                            <input type="text" id="supply-address" placeholder="如：广东省江门市新会区XX镇">
                        </div>

                        <div class="form-group">
                            <label>有效期截止至</label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <input type="date" id="supply-valid-until" style="flex: 1;">
                                <label style="display: flex; align-items: center; gap: 6px; margin: 0;">
                                    <input type="checkbox" id="supply-permanent" checked>
                                    <span>长期有效</span>
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>备注说明</label>
                            <textarea id="supply-notes" rows="3" placeholder="可输入更详细的信息，如：价格、品质描述等"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>照片上传（可选）</label>
                            <input type="file" id="supply-photos" accept="image/*" multiple style="padding: 10px; border: 2px dashed #ddd; border-radius: 8px; width: 100%;">
                            <span class="hint-text">💡 可上传库存照片，最多5张</span>
                            <div id="supply-photo-preview" style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;"></div>
                        </div>

                        <div style="display: flex; gap: 15px; margin-top: 30px;">
                            <button type="button" onclick="authSystem.saveRecyclerSupply('draft')" style="flex: 1; padding: 14px; background: #95a5a6; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
                                💾 存为草稿
                            </button>
                            <button type="submit" style="flex: 2; padding: 14px; background: #9b59b6; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
                                📢 发布供应
                            </button>
                        </div>
                    </form>
                </div>
            `;

            // 切换表单显示
            const targetRadios = document.querySelectorAll('input[name="target-type"]');
            const farmerForm = document.getElementById('demand-form-farmer');
            const processorForm = document.getElementById('demand-form-processor');
            const farmerLabel = document.getElementById('target-farmer-label');
            const processorLabel = document.getElementById('target-processor-label');
            
            targetRadios.forEach(radio => {
                radio.onchange = () => {
                    if (radio.value === 'farmer') {
                        farmerForm.style.display = 'block';
                        processorForm.style.display = 'none';
                        farmerLabel.style.background = '#fff3e0';
                        processorLabel.style.background = 'white';
                    } else {
                        farmerForm.style.display = 'none';
                        processorForm.style.display = 'block';
                        farmerLabel.style.background = 'white';
                        processorLabel.style.background = '#f3e5f5';
                    }
                };
            });
            
            // 初始化样式
            farmerLabel.style.background = '#fff3e0';

            // 绑定农户表单提交事件
            document.getElementById('demand-form-farmer').onsubmit = async (e) => {
                e.preventDefault();
                await this.saveDemand('active', editData?.id);
            };
            
            // 绑定处理商表单提交事件
            document.getElementById('demand-form-processor').onsubmit = async (e) => {
                e.preventDefault();
                await this.saveRecyclerSupply('active');
            };

            // 长期有效复选框逻辑（农户表单）
            const permanentCheckbox = document.getElementById('demand-permanent');
            const dateInput = document.getElementById('demand-valid-until');
            
            permanentCheckbox.onchange = () => {
                if (permanentCheckbox.checked) {
                    dateInput.value = '';
                    dateInput.disabled = true;
                } else {
                    dateInput.disabled = false;
                }
            };
            
            if (permanentCheckbox.checked) {
                dateInput.disabled = true;
            }
        }
    },
    
    // 保存处理商求购信息
    async saveProcessorDemand(status, editId = null) {
        const weight_kg = document.getElementById('demand-weight').value;
        const grade = document.getElementById('demand-grade').value;
        const citrus_type = document.getElementById('demand-citrus-type').value;
        const location_address = document.getElementById('demand-address').value.trim();
        const contact_name = document.getElementById('demand-contact-name').value.trim();
        const contact_phone = document.getElementById('demand-contact-phone').value.trim();
        const has_transport = document.querySelector('input[name="has-transport"]:checked')?.value === '1';
        const notes = document.getElementById('demand-notes').value.trim();
        const permanent = document.getElementById('demand-permanent').checked;
        const valid_until = permanent ? null : document.getElementById('demand-valid-until').value;

        if (!weight_kg || !grade || !citrus_type || !location_address || !contact_name || !contact_phone) {
            return this.showAlert('请填写所有必填项', 'warning');
        }

        if (!/^1[3-9]\d{9}$/.test(contact_phone)) {
            return this.showAlert('请输入正确的手机号码', 'warning');
        }

        console.log('[saveProcessorDemand] currentUser:', this.currentUser);
        console.log('[saveProcessorDemand] processor_id:', this.currentUser.id);

        try {
            const requestBody = {
                id: editId,
                processor_id: this.currentUser.id,
                weight_kg: parseFloat(weight_kg),
                grade,
                citrus_type,
                location_address,
                contact_name,
                contact_phone,
                has_transport,
                notes,
                valid_until,
                status
            };
            
            console.log('[saveProcessorDemand] Request body:', requestBody);

            const response = await fetch(`${this.API_BASE}/api/processor-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            console.log('[saveProcessorDemand] Response:', data);
            
            if (!response.ok) throw new Error(data.error || '保存失败');

            this.showAlert(editId ? '修改成功' : (status === 'draft' ? '草稿已保存' : '求购信息发布成功'), 'success');
            
            setTimeout(() => {
                this.navigateTo('my-orders');
            }, 1000);
        } catch (err) {
            console.error('Save processor demand error:', err);
            this.showAlert(err.message || '操作失败', 'error');
        }
    },

    // 保存求购信息
    async saveDemand(status, editId = null) {
        const grade = document.getElementById('demand-grade').value;
        const contact_name = document.getElementById('demand-contact-name').value.trim();
        const contact_phone = document.getElementById('demand-contact-phone').value.trim();
        const notes = document.getElementById('demand-notes').value.trim();
        const permanent = document.getElementById('demand-permanent').checked;
        const valid_until = permanent ? null : document.getElementById('demand-valid-until').value;

        if (!grade || !contact_name || !contact_phone) {
            return this.showAlert('请填写所有必填项', 'warning');
        }

        if (!/^1[3-9]\d{9}$/.test(contact_phone)) {
            return this.showAlert('请输入正确的手机号码', 'warning');
        }

        try {
            const response = await fetch(`${this.API_BASE}/api/recycler-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editId,
                    recycler_id: this.currentUser.id,
                    grade,
                    contact_name,
                    contact_phone,
                    notes,
                    valid_until,
                    status
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '保存失败');

            this.showAlert(editId ? '修改成功' : (status === 'draft' ? '草稿已保存' : '求购信息发布成功'), 'success');
            
            setTimeout(() => {
                this.navigateTo('my-orders');
                // 切换到"我的求购"标签
                setTimeout(() => {
                    const demandsTab = document.querySelector('[data-tab="demands"]');
                    if (demandsTab) demandsTab.click();
                }, 100);
            }, 1000);
        } catch (err) {
            console.error('Save demand error:', err);
            this.showAlert(err.message || '操作失败', 'error');
        }
    },
    
    // 保存回收商供应信息（面向处理商）
    async saveRecyclerSupply(status) {
        const grade = document.getElementById('supply-grade').value;
        const stock_weight = document.getElementById('supply-weight').value;
        const contact_name = document.getElementById('supply-contact-name').value.trim();
        const contact_phone = document.getElementById('supply-contact-phone').value.trim();
        const address = document.getElementById('supply-address').value.trim();
        const notes = document.getElementById('supply-notes').value.trim();
        const permanent = document.getElementById('supply-permanent').checked;
        const valid_until = permanent ? null : document.getElementById('supply-valid-until').value;

        if (!grade || !stock_weight || !contact_name || !contact_phone) {
            return this.showAlert('请填写所有必填项', 'warning');
        }

        if (!/^1[3-9]\d{9}$/.test(contact_phone)) {
            return this.showAlert('请输入正确的手机号码', 'warning');
        }

        try {
            const response = await fetch(`${this.API_BASE}/api/recycler-supplies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recycler_id: this.currentUser.id,
                    grade,
                    stock_weight: parseFloat(stock_weight),
                    contact_name,
                    contact_phone,
                    address,
                    notes,
                    valid_until,
                    status
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '保存失败');

            this.showAlert(status === 'draft' ? '草稿已保存' : '供应信息发布成功！处理商可以看到您的货源了', 'success');
            
            setTimeout(() => {
                this.navigateTo('my-orders');
            }, 1000);
        } catch (err) {
            console.error('Save recycler supply error:', err);
            this.showAlert(err.message || '操作失败', 'error');
        }
    },

    // 显示回收商端：处理商需求列表
    showProcessorDemands() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation: fadeIn 0.5s;">
                <h1 class="page-title">🏭 处理商需求</h1>
                <p style="color: var(--text-medium); margin-bottom: 24px;">查看处理商发布的柑肉求购信息，联系对接合作</p>
                
                <div id="processor-demands-list" style="display: grid; gap: 20px;">
                    <div style="text-align: center; padding: 40px; color: #999;">
                        <div class="spinner"></div>
                        <p>加载中...</p>
                    </div>
                </div>
            </div>
        `;

        this.loadProcessorDemands();
    },

    async loadProcessorDemands() {
        const listDiv = document.getElementById('processor-demands-list');
        
        try {
            const resp = await fetch(`${this.API_BASE}/api/processor-requests?for_recyclers=true`);
            const data = await resp.json();
            
            if (!resp.ok) throw new Error(data.error);
            
            if (!data || data.length === 0) {
                listDiv.innerHTML = `
                    <div class="glass-card" style="padding: 40px; text-align: center;">
                        <p style="color: #999; font-size: 16px;">📭 暂无处理商求购信息</p>
                    </div>
                `;
                return;
            }

            const gradeLabels = {
                'grade1': '一级品',
                'grade2': '二级品',
                'grade3': '三级品',
                'offgrade': '等外级',
                'any': '不限品级'
            };
            
            const citrusLabels = {
                'mandarin': '柑橘',
                'orange': '橙子',
                'pomelo': '柚子',
                'tangerine': '橘子',
                'any': '不限种类'
            };

            listDiv.innerHTML = data.map(r => {
                const validText = r.valid_until ? 
                    `有效期至 ${r.valid_until}` : 
                    '<span style="color: var(--primary-green);">长期有效</span>';
                
                return `
                    <div class="glass-card" style="padding: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                            <div>
                                <h3 style="margin: 0 0 8px 0;">
                                    <span style="background: #9b59b6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                                        🏭 ${r.processor_name || '处理商'}
                                    </span>
                                    <span style="background: var(--citrus-orange); color: white; padding: 4px 10px; border-radius: 20px; font-size: 13px; margin-left: 8px;">
                                        ${gradeLabels[r.grade]}
                                    </span>
                                </h3>
                                <p style="color: #666; margin: 4px 0; font-size: 13px;">
                                    求购编号：${r.request_no}
                                </p>
                            </div>
                            <div style="text-align: right; font-size: 12px; color: #999;">
                                ${validText}
                            </div>
                        </div>
                        
                        <div style="background: #f5f0ff; padding: 16px; border-radius: 10px; margin-bottom: 16px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <p style="margin: 0;"><strong>🍊 种类：</strong>${citrusLabels[r.citrus_type]}</p>
                                <p style="margin: 0;"><strong>⚖️ 需求量：</strong><span style="color: var(--citrus-orange); font-weight: bold;">${r.weight_kg} 斤</span></p>
                                <p style="margin: 0;"><strong>📍 收货地址：</strong>${r.location_address}</p>
                                <p style="margin: 0;"><strong>🚚 运输：</strong>${r.has_transport ? '<span style="color: var(--primary-green);">可上门收货</span>' : '需送货到厂'}</p>
                            </div>
                        </div>
                        
                        <div style="background: #f9f9f9; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                            <p style="margin: 0 0 6px 0;"><strong>联系人：</strong>${r.contact_name}</p>
                            <p style="margin: 0;"><strong>联系电话：</strong>${r.contact_phone}</p>
                        </div>
                        
                        ${r.notes ? `<p style="color: #666; margin: 0 0 16px 0;">💬 ${r.notes}</p>` : ''}
                        
                        <div style="display: flex; justify-content: flex-end; gap: 10px;">
                            <button data-processor-demand-action="accept" data-id="${r.id}" 
                                    style="background: var(--primary-green); color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: bold;">
                                ✅ 接单
                            </button>
                            <button data-processor-demand-action="chat" data-id="${r.id}" data-uid="${r.processor_id}" 
                                    style="background: #9b59b6; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: bold;">
                                💬 联系处理商
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // 绑定按钮事件
            listDiv.querySelectorAll('[data-processor-demand-action]').forEach(btn => {
                btn.onclick = async () => {
                    const action = btn.dataset.processorDemandAction;
                    const id = btn.dataset.id;
                    const uid = btn.dataset.uid;
                    
                    if (action === 'chat') {
                        this.openProcessorRequestChat(id, uid);
                    } else if (action === 'accept') {
                        if (!confirm('确认接单该处理商求购？')) return;
                        try {
                            const resp = await fetch(`${this.API_BASE}/api/processor-requests/${id}/accept`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ recycler_id: this.currentUser.id })
                            });
                            const data = await resp.json();
                            if (!resp.ok) throw new Error(data.error || '接单失败');
                            this.showAlert('接单成功！可在"我的订单-处理商订单"中查看', 'success');
                            this.loadProcessorDemands();
                        } catch (err) {
                            this.showAlert(err.message, 'error');
                        }
                    }
                };
            });
            
        } catch (err) {
            console.error('Load processor demands error:', err);
            listDiv.innerHTML = `<div class="glass-card" style="padding: 24px;"><p style="color: #e74c3c;">${err.message}</p></div>`;
        }
    },

    // 打开处理商求购聊天窗口
    async openProcessorRequestChat(requestId, processorId) {
        console.log('Opening processor request chat:', requestId, processorId);
        
        if (!this.socket || !this.socket.connected) {
            this.showAlert('网络连接失败，请刷新页面重试', 'error');
            return;
        }
        
        // 获取求购信息
        let requestInfo = null;
        try {
            const resp = await fetch(`${this.API_BASE}/api/processor-requests/${requestId}`);
            requestInfo = await resp.json();
        } catch (err) {
            console.error('Failed to get processor request info:', err);
        }
        
        const modalId = 'processor-chat-modal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'chat-modal';
            document.body.appendChild(modal);
        }

        this.renderProcessorChatWindow(modal, requestId, processorId, requestInfo);
        modal.style.display = 'flex';
        
        // 加入聊天室
        this.socket.emit('join_processor_room', { request_id: requestId });
        
        // 获取历史消息
        this.socket.emit('get_processor_history', { request_id: requestId }, (messages) => {
            console.log('Received processor messages:', messages);
            this.displayProcessorMessages(messages, requestId);
        });
        
        // 标记消息已读
        this.socket.emit('mark_processor_read', { 
            request_id: requestId, 
            user_id: this.currentUser.id 
        });
    },

    // 渲染处理商聊天窗口
    renderProcessorChatWindow(modal, requestId, processorId, requestInfo) {
        const isProcessor = this.currentUser.role === 'processor';
        const isFarmer = this.currentUser.role === 'farmer';
        const chatTitle = requestInfo ? 
            (isProcessor ? `求购咨询 - ${requestInfo.request_no}` : `与${requestInfo.processor_name || '处理商'}沟通`) : 
            '处理商需求沟通';
        
        modal.innerHTML = `
            <div class="chat-window" style="animation: slideUp 0.3s ease-out;">
                <div class="chat-header" style="background: linear-gradient(135deg, #9b59b6, #8e44ad); padding: 16px; display: flex; justify-content: space-between; align-items: center; border-radius: 12px 12px 0 0;">
                    <h3 style="margin: 0; color: white; font-size: 16px;">💬 ${chatTitle}</h3>
                    <button onclick="authSystem.closeProcessorChat()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 20px;">×</button>
                </div>
                
                <div id="processor-messages-${requestId}" class="chat-messages" style="flex: 1; overflow-y: auto; padding: 16px; background: #f5f5f5;">
                    <div style="text-align: center; color: #999;">加载消息中...</div>
                </div>
                
                <div class="chat-input" style="padding: 16px; background: white; border-top: 1px solid #e0e0e0;">
                    ${isFarmer ? `
                        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                            <button onclick="authSystem.showSendReportToProcessorDialog(${requestId})" style="background: var(--citrus-orange); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px;">📋 发送申报</button>
                        </div>
                    ` : ''}
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="processor-input-${requestId}" placeholder="输入消息..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px; outline: none;">
                        <button onclick="authSystem.sendProcessorMessage(${requestId})" style="background: #9b59b6; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">发送</button>
                    </div>
                </div>
            </div>
        `;

        const input = document.getElementById(`processor-input-${requestId}`);
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                this.sendProcessorMessage(requestId);
            }
        };
    },

    // 发送处理商聊天消息
    sendProcessorMessage(requestId) {
        const input = document.getElementById(`processor-input-${requestId}`);
        const content = input.value.trim();
        
        if (!content) return;
        
        this.socket.emit('send_processor_message', {
            request_id: requestId,
            sender_id: this.currentUser.id,
            content: content,
            content_type: 'text'
        });
        
        input.value = '';
    },

    // 显示处理商聊天消息
    displayProcessorMessages(messages, requestId) {
        const container = document.getElementById(`processor-messages-${requestId}`);
        if (!container) return;
        
        console.log('[displayProcessorMessages] messages:', messages);
        console.log('[displayProcessorMessages] currentUser:', this.currentUser);
        
        if (!messages || messages.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">暂无消息，开始对话吧！</div>';
            return;
        }
        
        container.innerHTML = messages.map(msg => {
            const isMe = String(msg.sender_id) === String(this.currentUser.id);
            const isSystem = msg.content_type === 'system';
            const isReportCard = msg.content_type === 'report_card';
            
            console.log('[displayProcessorMessages] msg:', msg, 'isMe:', isMe, 'isSystem:', isSystem, 'isReportCard:', isReportCard);
            
            if (isSystem) {
                return `
                    <div style="text-align: center; margin: 16px 0;">
                        <span style="background: #e8f4fd; color: #1890ff; padding: 6px 16px; border-radius: 20px; font-size: 12px;">
                            📢 ${msg.content}
                        </span>
                    </div>
                `;
            }
            
            if (isReportCard) {
                try {
                    console.log('[displayProcessorMessages] Parsing report card:', msg.content);
                    const report = JSON.parse(msg.content);
                    console.log('[displayProcessorMessages] Parsed report:', report);
                    const html = this.renderProcessorReportCardMessage(report, msg, isMe, requestId);
                    console.log('[displayProcessorMessages] Report card HTML:', html);
                    return html;
                } catch (e) {
                    console.error('Parse report card error:', e, 'content:', msg.content);
                    return `
                        <div style="display: flex; justify-content: ${isMe ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
                            <div style="max-width: 70%; padding: 12px 16px; border-radius: 12px; background: #ffebee; color: #c62828;">
                                <p style="margin: 0;">⚠️ 申报卡片解析失败</p>
                            </div>
                        </div>
                    `;
                }
            }
            
            return `
                <div style="display: flex; justify-content: ${isMe ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
                    <div style="max-width: 70%; padding: 12px 16px; border-radius: 12px; background: ${isMe ? '#9b59b6' : 'white'}; color: ${isMe ? 'white' : '#333'}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <p style="margin: 0; word-break: break-word;">${msg.content}</p>
                        <span style="font-size: 11px; color: ${isMe ? 'rgba(255,255,255,0.7)' : '#999'}; display: block; text-align: right; margin-top: 4px;">
                            ${new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        container.scrollTop = container.scrollHeight;
    },

    // 渲染处理商聊天中的申报卡片消息
    renderProcessorReportCardMessage(report, msg, isMine, requestId) {
        const isProcessor = this.currentUser.role === 'processor';
        const canAccept = isProcessor && !isMine && report.status === 'pending';
        const isLocked = report.status === 'accepted';
        
        return `
            <div style="display: flex; justify-content: ${isMine ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
                <div style="max-width: 85%; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; ${isLocked ? 'border: 2px solid #9b59b6;' : ''}">
                    ${!isMine ? `<div style="padding: 8px 12px; background: #f5f0ff; font-size: 12px; color: #666; border-bottom: 1px solid #e0e0e0;">${msg.sender_name} 发送了申报订单</div>` : ''}
                    
                    <div style="padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong style="color: #9b59b6; font-size: 14px;">📋 ${report.report_no}</strong>
                            <span style="padding: 2px 8px; background: ${report.status === 'pending' ? '#fff3cd' : report.status === 'accepted' ? '#d4edda' : '#d1ecf1'}; color: ${report.status === 'pending' ? '#856404' : report.status === 'accepted' ? '#155724' : '#0c5460'}; border-radius: 10px; font-size: 11px;">
                                ${this.getReportStatusLabel(report.status)}
                            </span>
                        </div>
                        
                        <div style="font-size: 12px; color: #555; line-height: 1.6;">
                            <div style="margin: 4px 0;"><strong>品种：</strong>${report.citrus_variety}</div>
                            <div style="margin: 4px 0;"><strong>重量：</strong>${report.weight_kg} 斤</div>
                            <div style="margin: 4px 0;"><strong>回收日期：</strong>${report.pickup_date}</div>
                            <div style="margin: 4px 0;"><strong>地址：</strong>${report.location_address}</div>
                            ${report.notes ? `<div style="margin: 4px 0;"><strong>备注：</strong>${report.notes}</div>` : ''}
                        </div>
                        
                        ${canAccept ? `
                            <button onclick="authSystem.acceptReportFromProcessorChat(${report.id}, ${requestId})" 
                                    style="width: 100%; margin-top: 12px; padding: 10px; background: #9b59b6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px;">
                                ✅ 接受订单
                            </button>
                        ` : ''}
                        
                        ${isLocked ? `
                            <div style="margin-top: 10px; padding: 8px; background: #f5f0ff; color: #9b59b6; border-radius: 6px; font-size: 12px; text-align: center;">
                                🔒 订单已锁定
                            </div>
                        ` : ''}
                    </div>
                    
                    <div style="padding: 6px 12px; background: #f9f9f9; border-top: 1px solid #e0e0e0; font-size: 10px; color: #999; text-align: right;">
                        ${new Date(msg.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
        `;
    },

    // 处理商从聊天中接受申报
    async acceptReportFromProcessorChat(reportId, requestId) {
        if (!confirm('确定接受此订单吗？')) return;
        
        try {
            const resp = await fetch(`${this.API_BASE}/api/farmer-reports/${reportId}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ processor_id: this.currentUser.id })
            });
            
            if (!resp.ok) {
                const data = await resp.json();
                throw new Error(data.error || '接单失败');
            }
            
            this.showAlert('🎉 订单锁定成功！', 'success');
            
            // 发送系统消息
            this.socket.emit('send_processor_message', {
                request_id: requestId,
                sender_id: this.currentUser.id,
                content: '订单已锁定成功！',
                content_type: 'system'
            });
            
            // 刷新消息
            setTimeout(() => {
                this.socket.emit('get_processor_history', { request_id: requestId }, (messages) => {
                    this.displayProcessorMessages(messages, requestId);
                });
            }, 800);
            
        } catch (err) {
            console.error('Accept report error:', err);
            this.showAlert(err.message || '接单失败', 'error');
        }
    },

    // 关闭处理商聊天窗口
    closeProcessorChat() {
        const modal = document.getElementById('processor-chat-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // 农户发送申报给处理商
    async showSendReportToProcessorDialog(requestId) {
        try {
            const resp = await fetch(`${this.API_BASE}/api/farmer-reports?farmer_id=${this.currentUser.id}&status=pending`);
            const reports = await resp.json();
            
            if (!resp.ok) throw new Error('获取申报失败');
            
            if (!reports || reports.length === 0) {
                return this.showAlert('您还没有待处理的申报订单', 'warning');
            }
            
            const dialogHtml = `
                <div id="select-report-processor-dialog" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center;">
                    <div style="background: white; border-radius: 16px; width: 90%; max-width: 500px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
                        <div style="padding: 16px; background: #9b59b6; color: white; display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0;">选择要发送给处理商的申报</h3>
                            <button onclick="document.getElementById('select-report-processor-dialog').remove()" style="background: transparent; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
                        </div>
                        
                        <div style="flex: 1; overflow-y: auto; padding: 16px;">
                            ${reports.map(r => `
                                <div onclick="authSystem.sendReportToProcessor(${requestId}, ${r.id})" style="background: #f5f0ff; border-radius: 8px; padding: 12px; margin-bottom: 12px; cursor: pointer; border: 2px solid transparent; transition: all 0.3s;" onmouseover="this.style.borderColor='#9b59b6'" onmouseout="this.style.borderColor='transparent'">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                        <strong style="color: #9b59b6;">${r.report_no}</strong>
                                        <span style="font-size: 12px; color: #666;">${r.created_at}</span>
                                    </div>
                                    <div style="font-size: 13px; color: #555;">
                                        <div>品种：${r.citrus_variety} | 重量：${r.weight_kg}斤</div>
                                        <div>回收日期：${r.pickup_date}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', dialogHtml);
        } catch (err) {
            console.error('Show report dialog error:', err);
            this.showAlert(err.message || '获取申报失败', 'error');
        }
    },

    // 发送申报给处理商
    async sendReportToProcessor(requestId, reportId) {
        document.getElementById('select-report-processor-dialog')?.remove();
        
        try {
            const resp = await fetch(`${this.API_BASE}/api/farmer-reports/${reportId}`);
            const report = await resp.json();
            
            if (!resp.ok) throw new Error('获取申报信息失败');
            
            // 发送申报卡片消息
            this.socket.emit('send_processor_message', {
                request_id: requestId,
                sender_id: this.currentUser.id,
                content: JSON.stringify(report),
                content_type: 'report_card'
            });
            
            this.showAlert('申报已发送', 'success');
        } catch (err) {
            console.error('Send report error:', err);
            this.showAlert(err.message || '发送失败', 'error');
        }
    },

    // 显示农户端：求购信息列表（回收商+处理商有运输能力的）
    showRecyclerDemands() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation: fadeIn 0.5s;">
                <h1 class="page-title">📢 柑肉求购</h1>
                <p style="color: var(--text-medium); margin-bottom: 24px;">查看回收商和处理商发布的求购信息，主动联系对接</p>
                
                <div id="demands-list" style="display: grid; gap: 20px;">
                    <div style="text-align: center; padding: 40px; color: #999;">
                        <div class="spinner"></div>
                        <p>加载中...</p>
                    </div>
                </div>
            </div>
        `;

        this.loadRecyclerDemands();
    },

    async loadRecyclerDemands() {
        const listDiv = document.getElementById('demands-list');
        
        try {
            // 同时获取回收商求购和处理商求购（仅限有运输能力的）
            const [recyclerResp, processorResp] = await Promise.all([
                fetch(`${this.API_BASE}/api/purchase-requests`),
                fetch(`${this.API_BASE}/api/processor-requests?for_farmers=true`)
            ]);
            
            const recyclerData = await recyclerResp.json();
            const processorData = await processorResp.json();
            
            // 标记来源并合并
            const recyclerDemands = (Array.isArray(recyclerData) ? recyclerData : []).map(r => ({
                ...r,
                source_type: 'recycler'
            }));
            
            const processorDemands = (Array.isArray(processorData) ? processorData : []).map(p => ({
                ...p,
                source_type: 'processor'
            }));
            
            const allDemands = [...recyclerDemands, ...processorDemands];
            
            if (allDemands.length === 0) {
                listDiv.innerHTML = `
                    <div class="glass-card" style="padding: 40px; text-align: center;">
                        <p style="color: #999; font-size: 16px;">📭 暂无求购信息</p>
                    </div>
                `;
                return;
            }

            const gradeLabels = {
                'grade1': '一级品',
                'grade2': '二级品',
                'grade3': '三级品',
                'offgrade': '等外级',
                'any': '不限品级'
            };
            
            const citrusLabels = {
                'mandarin': '柑橘',
                'orange': '橙子',
                'pomelo': '柚子',
                'tangerine': '橘子',
                'any': '不限种类'
            };

            listDiv.innerHTML = allDemands.map(r => {
                const isProcessor = r.source_type === 'processor';
                const validText = r.valid_until ? 
                    `有效期至 ${r.valid_until}` : 
                    '<span style="color: var(--primary-green);">长期有效</span>';
                
                const sourceLabel = isProcessor ? 
                    '<span style="background: #9b59b6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 8px;">🏭 处理商</span>' :
                    '<span style="background: var(--citrus-orange); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 8px;">🚛 回收商</span>';
                
                if (isProcessor) {
                    // 处理商求购卡片
                    return `
                        <div class="glass-card" style="padding: 24px; border-left: 4px solid #9b59b6;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                                <div>
                                    <h3 style="margin: 0 0 8px 0;">
                                        ${sourceLabel}
                                        <span style="background: #f0e6ff; color: #9b59b6; padding: 4px 10px; border-radius: 20px; font-size: 13px;">
                                            ${gradeLabels[r.grade]} ${citrusLabels[r.citrus_type]}
                                        </span>
                                    </h3>
                                    <p style="color: #666; margin: 4px 0; font-size: 13px;">
                                        求购编号：${r.request_no}
                                    </p>
                                </div>
                                <div style="text-align: right; font-size: 12px; color: #999;">
                                    ${validText}
                                </div>
                            </div>
                            
                            <div style="background: #f5f0ff; padding: 14px; border-radius: 8px; margin-bottom: 16px;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                                    <p style="margin: 0;"><strong>需求量：</strong><span style="color: #9b59b6; font-weight: bold;">${r.weight_kg} 斤</span></p>
                                    <p style="margin: 0;"><strong>🚚 可上门收货</strong></p>
                                    <p style="margin: 0; grid-column: 1 / -1;"><strong>📍 收货地址：</strong>${r.location_address}</p>
                                </div>
                            </div>
                            
                            <div style="background: #f9f9f9; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                                <p style="margin: 0 0 6px 0;"><strong>联系人：</strong>${r.contact_name}</p>
                                <p style="margin: 0 0 6px 0;"><strong>联系电话：</strong>${r.contact_phone}</p>
                                <p style="margin: 0;"><strong>处理商：</strong>${r.processor_name || '未知'}</p>
                            </div>
                            
                            ${r.notes ? `<p style="color: #666; margin: 0 0 16px 0;">💬 ${r.notes}</p>` : ''}
                            
                            <div style="text-align: right;">
                                <button data-processor-demand-action="chat" data-id="${r.id}" data-uid="${r.processor_id}" 
                                        style="background: #9b59b6; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: bold;">
                                    💬 联系处理商
                                </button>
                            </div>
                        </div>
                    `;
                } else {
                    // 回收商求购卡片（原有逻辑）
                    return `
                        <div class="glass-card" style="padding: 24px; border-left: 4px solid var(--citrus-orange);">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                                <div>
                                    <h3 style="margin: 0 0 8px 0;">
                                        ${sourceLabel}
                                        <span style="background: #fff3e0; color: var(--citrus-orange); padding: 4px 10px; border-radius: 20px; font-size: 13px;">
                                            ${gradeLabels[r.grade]}柑
                                        </span>
                                    </h3>
                                    <p style="color: #666; margin: 4px 0; font-size: 13px;">
                                        求购编号：${r.request_no}
                                    </p>
                                </div>
                                <div style="text-align: right; font-size: 12px; color: #999;">
                                    ${validText}
                                </div>
                            </div>
                            
                            <div style="background: #f9f9f9; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                                <p style="margin: 0 0 8px 0;"><strong>联系人：</strong>${r.contact_name}</p>
                                <p style="margin: 0 0 8px 0;"><strong>联系电话：</strong>${r.contact_phone}</p>
                                <p style="margin: 0;"><strong>回收商：</strong>${r.recycler_name}</p>
                            </div>
                            
                            ${r.notes ? `<p style="color: #666; margin: 0 0 16px 0;">💬 ${r.notes}</p>` : ''}
                            
                            <div style="text-align: right;">
                                <button data-demand-action="chat" data-id="${r.id}" data-uid="${r.recycler_id}" 
                                        style="background: var(--citrus-orange); color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: bold;">
                                    💬 联系回收商
                                </button>
                            </div>
                        </div>
                    `;
                }
            }).join('');

            // 绑定回收商按钮事件
            listDiv.querySelectorAll('[data-demand-action="chat"]').forEach(btn => {
                btn.onclick = () => {
                    const id = btn.dataset.id;
                    const uid = btn.dataset.uid;
                    console.log('Recycler chat button clicked:', id, uid);
                    this.openRequestChat(id, uid);
                };
            });
            
            // 绑定处理商按钮事件
            listDiv.querySelectorAll('[data-processor-demand-action="chat"]').forEach(btn => {
                btn.onclick = () => {
                    const id = btn.dataset.id;
                    const uid = btn.dataset.uid;
                    console.log('Processor chat button clicked:', id, uid);
                    this.openProcessorRequestChat(id, uid);
                };
            });
            
        } catch (err) {
            console.error('Load demands error:', err);
            listDiv.innerHTML = `<div class="glass-card" style="padding: 24px;"><p style="color: #e74c3c;">${err.message}</p></div>`;
        }
    },

    // 打开求购信息聊天窗口
    async openRequestChat(requestId, otherUserId) {
        console.log('Opening request chat:', requestId, otherUserId);
        
        // 检查Socket连接
        if (!this.socket || !this.socket.connected) {
            console.error('Socket not connected');
            this.showAlert('网络连接失败，请刷新页面重试', 'error');
            return;
        }
        
        // 获取求购信息以确定对方身份
        let requestInfo = null;
        try {
            const resp = await fetch(`${this.API_BASE}/api/recycler-requests/${requestId}`);
            requestInfo = await resp.json();
        } catch (err) {
            console.error('Failed to get request info:', err);
        }
        
        const modalId = 'request-chat-modal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'chat-modal';
            document.body.appendChild(modal);
        }

        // 渲染聊天窗口
        this.renderRequestChatWindow(modal, requestId, otherUserId, requestInfo);
        modal.style.display = 'flex';
        
        // 加入聊天室
        this.socket.emit('join_request_room', { request_id: requestId });
        
        // 获取历史消息
        this.socket.emit('get_request_history', { request_id: requestId }, (messages) => {
            console.log('Received messages:', messages);
            this.displayRequestMessages(messages, requestId);
        });
        
        // 标记消息已读并清除本地红点计数
        this.socket.emit('mark_request_read', { 
            request_id: requestId, 
            user_id: this.currentUser.id 
        });
        
        // 清除本地未读计数并更新红点
        const key = `request_${requestId}`;
        if (this.unreadCounts[key]) {
            delete this.unreadCounts[key];
            this.updateRequestUnreadBadge();
        }
    },

    // 渲染求购聊天窗口
    renderRequestChatWindow(modal, requestId, otherUserId, requestInfo) {
        const isRecycler = this.currentUser.role === 'recycler';
        const chatTitle = requestInfo ? 
            (isRecycler ? `求购咨询 - ${requestInfo.request_no}` : `与${requestInfo.recycler_name || '回收商'}沟通`) : 
            '求购信息沟通';
        
        modal.innerHTML = `
            <div class="chat-window" style="animation: slideUp 0.3s ease-out;">
                <div class="chat-header" style="background: linear-gradient(135deg, var(--citrus-orange), #e67e22); padding: 16px; display: flex; justify-content: space-between; align-items: center; border-radius: 12px 12px 0 0;">
                    <h3 style="margin: 0; color: white; font-size: 16px;">💬 ${chatTitle}</h3>
                    <button onclick="authSystem.closeRequestChat()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 20px;">×</button>
                </div>
                
                <div id="request-messages-${requestId}" class="chat-messages" style="flex: 1; overflow-y: auto; padding: 16px; background: #f5f5f5;">
                    <div style="text-align: center; color: #999;">加载消息中...</div>
                </div>
                
                ${!isRecycler ? `
                <div style="padding: 12px 16px; background: #fff9e6; border-top: 1px solid #ffe58f; display: flex; gap: 10px; align-items: center;">
                    <span style="color: #666; font-size: 13px;">💼 发送申报订单给回收商：</span>
                    <button onclick="authSystem.showSendReportDialog(${requestId})" style="background: var(--primary-green); color: white; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 13px;">📋 选择申报</button>
                </div>
                ` : ''}
                
                <div class="chat-input" style="padding: 16px; background: white; border-top: 1px solid #e0e0e0; display: flex; gap: 10px;">
                    <input type="text" id="request-input-${requestId}" placeholder="输入消息..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px; outline: none;">
                    <button onclick="authSystem.sendRequestMessage(${requestId})" style="background: var(--citrus-orange); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">发送</button>
                </div>
            </div>
        `;

        // 回车发送
        const input = document.getElementById(`request-input-${requestId}`);
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                this.sendRequestMessage(requestId);
            }
        };
    },

    // 发送求购消息
    sendRequestMessage(requestId) {
        const input = document.getElementById(`request-input-${requestId}`);
        const content = input.value.trim();
        
        if (!content) return;

        this.socket.emit('send_request_message', {
            request_id: requestId,
            sender_id: this.currentUser.id,
            content: content
        });

        input.value = '';
    },

    // 显示求购消息
    displayRequestMessages(messages, requestId) {
        const container = document.getElementById(`request-messages-${requestId}`);
        if (!container) return;

        if (!messages || messages.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: #999; padding: 40px;">暂无消息，开始聊天吧</div>`;
            return;
        }

        // 检查是否有订单锁定消息，并收集已锁定的 report_id
        const lockedReportIds = new Set();
        messages.forEach(m => {
            if (m.content_type === 'system') {
                try {
                    const sysData = JSON.parse(m.content);
                    if (sysData.type === 'order_locked' && sysData.report_id) {
                        lockedReportIds.add(sysData.report_id);
                    }
                } catch (e) {}
            }
        });
        
        const isLocked = lockedReportIds.size > 0;
        const isFarmer = this.currentUser.role === 'farmer';

        container.innerHTML = messages.map(msg => {
            const isMine = String(msg.sender_id) === String(this.currentUser.id);
            
            // 如果是系统消息
            if (msg.content_type === 'system') {
                try {
                    const sysData = JSON.parse(msg.content);
                    if (sysData.type === 'order_locked') {
                        return `
                            <div style="display: flex; justify-content: center; margin: 16px 0;">
                                <div style="background: linear-gradient(135deg, #d4edda, #c3e6cb); color: #155724; padding: 12px 20px; border-radius: 20px; font-size: 13px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                    🔒 <strong>订单锁定成功！</strong><br>
                                    <span style="font-size: 12px;">${isFarmer ? '请到"我的申报"处继续沟通订单详情' : '农户已被通知，请在"农户供货"中查看'}</span>
                                </div>
                            </div>
                        `;
                    }
                } catch (e) {}
                return '';
            }
            
            // 如果是订单卡片消息
            if (msg.content_type === 'report_card') {
                const report = JSON.parse(msg.content);
                // 检查这个订单是否已被锁定
                if (lockedReportIds.has(report.id)) {
                    report.status = 'accepted';
                }
                return this.renderReportCardMessage(report, msg, isMine, requestId);
            }
            
            // 普通文本消息
            return `
                <div style="display: flex; justify-content: ${isMine ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
                    <div style="max-width: 70%; background: ${isMine ? 'var(--citrus-orange)' : 'white'}; color: ${isMine ? 'white' : '#333'}; padding: 10px 14px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        ${!isMine ? `<div style="font-size: 12px; color: #666; margin-bottom: 4px;">${msg.sender_name}</div>` : ''}
                        <div>${msg.content}</div>
                        <div style="font-size: 11px; color: ${isMine ? 'rgba(255,255,255,0.7)' : '#999'}; margin-top: 4px; text-align: right;">
                            ${new Date(msg.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // 如果订单已锁定且是农户，禁用输入框并显示提示
        if (isLocked && isFarmer) {
            const inputContainer = document.querySelector('.chat-input');
            if (inputContainer) {
                inputContainer.innerHTML = `
                    <div style="width: 100%; text-align: center; color: #666; padding: 10px;">
                        🔒 对话已锁定，请到 <a href="javascript:void(0)" onclick="authSystem.closeRequestChat(); authSystem.navigateTo('my-reports');" style="color: var(--primary-green); font-weight: bold;">我的申报</a> 处继续沟通
                    </div>
                `;
            }
            // 也隐藏发送申报按钮
            const sendReportBar = document.querySelector('[onclick*="showSendReportDialog"]');
            if (sendReportBar && sendReportBar.parentElement) {
                sendReportBar.parentElement.style.display = 'none';
            }
        }

        // 滚动到底部
        setTimeout(() => container.scrollTop = container.scrollHeight, 100);
    },

    // 渲染订单卡片消息
    renderReportCardMessage(report, msg, isMine, requestId) {
        const isRecycler = this.currentUser.role === 'recycler';
        const isProcessor = this.currentUser.role === 'processor';
        const canAccept = (isRecycler || isProcessor) && !isMine && report.status === 'pending';
        const isLocked = report.status === 'accepted';
        
        return `
            <div style="display: flex; justify-content: ${isMine ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
                <div style="max-width: 85%; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; ${isLocked ? 'border: 2px solid var(--primary-green);' : ''}">
                    ${!isMine ? `<div style="padding: 8px 12px; background: #f5f5f5; font-size: 12px; color: #666; border-bottom: 1px solid #e0e0e0;">${msg.sender_name} 发送了申报订单</div>` : ''}
                    
                    <div style="padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong style="color: var(--citrus-orange); font-size: 14px;">📋 ${report.report_no}</strong>
                            <span style="padding: 2px 8px; background: ${report.status === 'pending' ? '#fff3cd' : report.status === 'accepted' ? '#d4edda' : '#d1ecf1'}; color: ${report.status === 'pending' ? '#856404' : report.status === 'accepted' ? '#155724' : '#0c5460'}; border-radius: 10px; font-size: 11px;">
                                ${this.getReportStatusLabel(report.status)}
                            </span>
                        </div>
                        
                        <div style="font-size: 12px; color: #555; line-height: 1.6;">
                            <div style="margin: 4px 0;"><strong>品种：</strong>${report.citrus_variety}</div>
                            <div style="margin: 4px 0;"><strong>重量：</strong>${report.weight_kg} 斤</div>
                            <div style="margin: 4px 0;"><strong>回收日期：</strong>${report.pickup_date}</div>
                            <div style="margin: 4px 0;"><strong>地址：</strong>${report.location_address}</div>
                            ${report.notes ? `<div style="margin: 4px 0;"><strong>备注：</strong>${report.notes}</div>` : ''}
                        </div>
                        
                        ${canAccept ? `
                            <button onclick="authSystem.acceptReportFromChat(${report.id}, ${requestId}, '${msg.id}')" 
                                    style="width: 100%; margin-top: 12px; padding: 10px; background: var(--primary-green); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px;">
                                ✅ 接受订单
                            </button>
                        ` : ''}
                        
                        ${isLocked ? `
                            <div style="margin-top: 10px; padding: 8px; background: #d4edda; color: #155724; border-radius: 6px; font-size: 12px; text-align: center;">
                                🔒 订单已锁定
                            </div>
                        ` : ''}
                    </div>
                    
                    <div style="padding: 6px 12px; background: #f9f9f9; border-top: 1px solid #e0e0e0; font-size: 10px; color: #999; text-align: right;">
                        ${new Date(msg.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
        `;
    },

    // 显示发送申报对话框
    async showSendReportDialog(requestId) {
        try {
            const resp = await fetch(`${this.API_BASE}/api/farmer-reports?farmer_id=${this.currentUser.id}&status=pending`);
            const reports = await resp.json();
            
            if (!resp.ok) throw new Error('获取申报失败');
            
            if (!reports || reports.length === 0) {
                return this.showAlert('您还没有待处理的申报订单', 'warning');
            }
            
            // 创建选择对话框
            const dialogHtml = `
                <div id="select-report-dialog" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center;">
                    <div style="background: white; border-radius: 16px; width: 90%; max-width: 500px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
                        <div style="padding: 16px; background: var(--primary-green); color: white; display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0;">选择要发送的申报</h3>
                            <button onclick="document.getElementById('select-report-dialog').remove()" style="background: transparent; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
                        </div>
                        
                        <div style="flex: 1; overflow-y: auto; padding: 16px;">
                            ${reports.map(r => `
                                <div onclick="authSystem.sendReportCard(${requestId}, ${r.id})" style="background: #f9f9f9; border-radius: 8px; padding: 12px; margin-bottom: 12px; cursor: pointer; border: 2px solid transparent; transition: all 0.3s;" onmouseover="this.style.borderColor='var(--primary-green)'" onmouseout="this.style.borderColor='transparent'">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                        <strong style="color: var(--citrus-orange);">${r.report_no}</strong>
                                        <span style="font-size: 12px; color: #666;">${r.created_at}</span>
                                    </div>
                                    <div style="font-size: 13px; color: #555;">
                                        <div>品种：${r.citrus_variety} | 重量：${r.weight_kg}斤</div>
                                        <div>回收日期：${r.pickup_date}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', dialogHtml);
            
        } catch (err) {
            console.error('Show send report dialog error:', err);
            this.showAlert(err.message || '加载失败', 'error');
        }
    },

    // 发送申报卡片消息
    async sendReportCard(requestId, reportId) {
        try {
            // 获取申报详情
            const resp = await fetch(`${this.API_BASE}/api/farmer-reports/${reportId}`);
            const report = await resp.json();
            
            if (!resp.ok) throw new Error('获取申报详情失败');
            
            // 发送订单卡片消息
            this.socket.emit('send_request_message', {
                request_id: requestId,
                sender_id: this.currentUser.id,
                content: JSON.stringify(report),
                content_type: 'report_card'
            });
            
            // 关闭对话框
            const dialog = document.getElementById('select-report-dialog');
            if (dialog) dialog.remove();
            
            this.showAlert('申报已发送', 'success');
            
        } catch (err) {
            console.error('Send report card error:', err);
            this.showAlert(err.message || '发送失败', 'error');
        }
    },

    // 从聊天中接单
    async acceptReportFromChat(reportId, requestId, msgId) {
        if (!confirm('确定接受此订单吗？接单后该农户的聊天将被锁定。')) return;
        
        try {
            // 根据当前用户角色确定发送的ID字段
            const isProcessor = this.currentUser.role === 'processor';
            const bodyData = isProcessor 
                ? { processor_id: this.currentUser.id }
                : { recycler_id: this.currentUser.id };
            
            const resp = await fetch(`${this.API_BASE}/api/farmer-reports/${reportId}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });
            
            if (!resp.ok) {
                let errorMsg = '接单失败';
                try {
                    const data = await resp.json();
                    errorMsg = data.error || errorMsg;
                } catch (e) {
                    errorMsg = `服务器错误 (${resp.status})`;
                }
                throw new Error(errorMsg);
            }
            
            const data = await resp.json();
            
            this.showAlert('🎉 订单锁定成功！', 'success');
            
            // 发送系统消息通知订单已锁定
            this.socket.emit('send_request_message', {
                request_id: requestId,
                sender_id: this.currentUser.id,
                content: JSON.stringify({
                    type: 'order_locked',
                    report_id: reportId,
                    message: '订单已锁定成功！'
                }),
                content_type: 'system'
            });
            
            // 稍微延迟后刷新聊天消息以显示最新状态
            setTimeout(() => {
                this.socket.emit('get_request_history', { request_id: requestId }, (messages) => {
                    this.displayRequestMessages(messages, requestId);
                });
            }, 800);
            
        } catch (err) {
            console.error('Accept report error:', err);
            this.showAlert(err.message || '接单失败', 'error');
        }
    },

    // 关闭求购聊天
    closeRequestChat() {
        const modal = document.getElementById('request-chat-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // 显示提示信息
    showAlert(message, type = 'info') {
        // 创建提示容器
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            z-index: 3000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        const colors = {
            'success': '#27ae60',
            'error': '#e74c3c',
            'warning': '#f39c12',
            'info': '#3498db'
        };
        
        alertDiv.style.backgroundColor = colors[type] || colors.info;
        alertDiv.textContent = message;
        
        document.body.appendChild(alertDiv);
        
        // 3秒后移除
        setTimeout(() => {
            alertDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => alertDiv.remove(), 300);
        }, 3000);
    },

    // ====== 仲裁中心（用户端）======
    showArbitrationCenter() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation: fadeIn 0.5s;">
                <h1 class="page-title">⚖️ 仲裁中心</h1>
                <p style="color: var(--text-medium); margin-bottom: 30px;">处理订单纠纷，维护您的合法权益</p>
                
                <!-- 二级菜单 -->
                <div style="display: flex; gap: 15px; margin-bottom: 30px; border-bottom: 2px solid #e0e0e0;">
                    <button class="arbitration-tab active" data-tab="submit" style="padding: 12px 24px; border: none; background: transparent; cursor: pointer; font-weight: bold; border-bottom: 3px solid #e74c3c; color: #e74c3c;">
                        📝 提出仲裁申请
                    </button>
                    <button class="arbitration-tab" data-tab="progress" style="padding: 12px 24px; border: none; background: transparent; cursor: pointer; font-weight: bold; border-bottom: 3px solid transparent; color: #888;">
                        📊 我的仲裁进度
                    </button>
                </div>
                
                <!-- 提出仲裁申请面板 -->
                <div id="submit-arbitration-panel" class="arbitration-panel">
                    <div class="glass-card" style="padding: 30px; max-width: 900px; margin: 0 auto;">
                        <h3 style="margin: 0 0 20px 0; color: #e74c3c;">📝 提交仲裁申请</h3>
                        <p style="color: #666; margin-bottom: 25px;">如果您在交易过程中遇到纠纷，可以向平台提出仲裁申请，我们将公正处理。</p>
                        
                        <form id="arbitration-form">
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: bold;">选择订单类型 <span style="color: red;">*</span></label>
                                <select id="order-type" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                                    <option value="">-- 请选择订单类型 --</option>
                                    <option value="farmer_report">农户申报订单</option>
                                    <option value="recycler_request">回收商求购订单</option>
                                    <option value="processor_request">处理商求购订单</option>
                                </select>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: bold;">订单编号 <span style="color: red;">*</span></label>
                                <input type="text" id="order-no" required placeholder="请输入订单编号" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                                <span style="font-size: 12px; color: #999;">提示：可在订单详情页找到订单编号</span>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: bold;">仲裁原因 <span style="color: red;">*</span></label>
                                <select id="arbitration-reason" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                                    <option value="">-- 请选择仲裁原因 --</option>
                                    <option value="quality">货物质量问题</option>
                                    <option value="quantity">重量/数量不符</option>
                                    <option value="payment">付款纠纷</option>
                                    <option value="delivery">交货延迟/未交货</option>
                                    <option value="fraud">欺诈行为</option>
                                    <option value="breach">违反协议条款</option>
                                    <option value="other">其他原因</option>
                                </select>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: bold;">详细说明 <span style="color: red;">*</span></label>
                                <textarea id="arbitration-description" required rows="6" placeholder="请详细描述纠纷情况、发生时间、涉及金额等..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; resize: vertical;"></textarea>
                            </div>
                            
                            <!-- 证据材料区域 -->
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                                <h4 style="margin: 0 0 15px 0; color: #333;">📎 证据材料上传</h4>
                                
                                <!-- 1. 平台交易凭证（必须）-->
                                <div style="margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #e74c3c;">
                                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">
                                        1. 平台交易凭证 <span style="color: red;">*（必须）</span>
                                    </label>
                                    <p style="font-size: 13px; color: #666; margin: 5px 0 10px 0;">平台订单、回收报价单、废料交付确认单、平台系统操作日志（证明供需双方履约过程）</p>
                                    <input type="file" id="evidence-trade" multiple accept="image/*,application/pdf" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
                                    <div id="trade-preview" style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;"></div>
                                </div>
                                
                                <!-- 2. 废料相关证据（必须）-->
                                <div style="margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #e74c3c;">
                                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">
                                        2. 废料相关证据 <span style="color: red;">*（必须）</span>
                                    </label>
                                    <p style="font-size: 13px; color: #666; margin: 5px 0 10px 0;">新会柑果肉/果渣交付清单、质量检测报告、称重单据、现场照片/视频（证明废料品类、数量、质量等义）</p>
                                    <input type="file" id="evidence-material" multiple accept="image/*,application/pdf,video/*" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
                                    <div id="material-preview" style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;"></div>
                                </div>
                                
                                <!-- 3. 资金往来凭证（必须）-->
                                <div style="margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #e74c3c;">
                                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">
                                        3. 资金往来凭证 <span style="color: red;">*（必须）</span>
                                    </label>
                                    <p style="font-size: 13px; color: #666; margin: 5px 0 10px 0;">转账记录、收款收据、平台结算账单（证明货款、服务费、违约金等义）</p>
                                    <input type="file" id="evidence-payment" multiple accept="image/*,application/pdf" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
                                    <div id="payment-preview" style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;"></div>
                                </div>
                                
                                <!-- 4. 沟通记录（可选）-->
                                <div style="margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">
                                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">
                                        4. 沟通记录 <span style="color: #3498db;">（可选）</span>
                                    </label>
                                    <p style="font-size: 13px; color: #666; margin: 5px 0 10px 0;">平台聊天、微信/短信、邮件往来（证明协商过程、违约事实）</p>
                                    <input type="file" id="evidence-communication" multiple accept="image/*,application/pdf" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
                                    <div id="communication-preview" style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;"></div>
                                </div>
                                
                                <!-- 5. 其他材料（可选）-->
                                <div style="margin-bottom: 0; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">
                                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">
                                        5. 其他材料 <span style="color: #3498db;">（可选）</span>
                                    </label>
                                    <p style="font-size: 13px; color: #666; margin: 5px 0 10px 0;">平台服务协议、行业标准、损失核算明细（如资源化利用损失、仓储物流损失）</p>
                                    <input type="file" id="evidence-other" multiple accept="image/*,application/pdf" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
                                    <div id="other-preview" style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;"></div>
                                </div>
                            </div>
                            
                            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ff9800;">
                                <strong style="color: #e65100;">⚠️ 仲裁说明：</strong>
                                <ul style="margin: 10px 0 0 20px; color: #666; line-height: 1.8;">
                                    <li>提交后，平台将在3个工作日内审核并联系双方</li>
                                    <li>请确保提供的信息真实准确，虚假申请将受到处罚</li>
                                    <li>仲裁期间，相关订单将被冻结，双方不得私下处理</li>
                                    <li>平台仲裁结果为最终决定，双方需无条件执行</li>
                                    <li><strong>必须上传前3项证据材料，否则无法提交申请</strong></li>
                                </ul>
                            </div>
                            
                            <div style="display: flex; gap: 15px;">
                                <button type="submit" style="flex: 1; padding: 14px; background: #e74c3c; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 16px;">
                                    📤 提交仲裁申请
                                </button>
                                <button type="button" onclick="authSystem.navigateTo('dashboard')" style="padding: 14px 30px; background: #95a5a6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
                                    取消
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- 我的仲裁进度面板 -->
                <div id="progress-arbitration-panel" class="arbitration-panel" style="display: none;">
                    <div id="arbitration-list"></div>
                </div>
            </div>
        `;
        
        // 标签页切换
        document.querySelectorAll('.arbitration-tab').forEach(btn => {
            btn.onclick = () => {
                const tab = btn.dataset.tab;
                
                // 更新按钮样式
                document.querySelectorAll('.arbitration-tab').forEach(b => {
                    b.classList.remove('active');
                    b.style.borderBottom = '3px solid transparent';
                    b.style.color = '#888';
                });
                btn.classList.add('active');
                btn.style.borderBottom = '3px solid #e74c3c';
                btn.style.color = '#e74c3c';
                
                // 显示对应面板
                document.getElementById('submit-arbitration-panel').style.display = tab === 'submit' ? 'block' : 'none';
                document.getElementById('progress-arbitration-panel').style.display = tab === 'progress' ? 'block' : 'none';
                
                // 加载数据
                if (tab === 'progress') {
                    this.loadMyArbitrations();
                }
            };
        });
        
        // 绑定表单提交
        document.getElementById('arbitration-form').onsubmit = (e) => {
            e.preventDefault();
            this.submitArbitration();
        };
        
        // 为文件输入添加预览功能
        this.setupFilePreview('evidence-trade', 'trade-preview');
        this.setupFilePreview('evidence-material', 'material-preview');
        this.setupFilePreview('evidence-payment', 'payment-preview');
        this.setupFilePreview('evidence-communication', 'communication-preview');
        this.setupFilePreview('evidence-other', 'other-preview');
    },
    
    setupFilePreview(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        
        if (!input || !preview) return;
        
        input.onchange = () => {
            preview.innerHTML = '';
            const files = Array.from(input.files);
            
            files.forEach((file, index) => {
                const item = document.createElement('div');
                item.style.cssText = 'position: relative; padding: 8px 12px; background: #e8f5e9; border-radius: 6px; font-size: 12px; display: flex; align-items: center; gap: 6px;';
                
                const icon = file.type.includes('image') ? '🖼️' : (file.type.includes('pdf') ? '📄' : '📹');
                item.innerHTML = `
                    ${icon} <span style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</span>
                    <button type="button" onclick="this.parentElement.remove(); document.getElementById('${inputId}').value = '';" style="background: #e74c3c; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; margin-left: 5px;">×</button>
                `;
                preview.appendChild(item);
            });
        };
    },
    
    loadMyArbitrations() {
        const listDiv = document.getElementById('arbitration-list');
        listDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">加载中...</p>';
        
        fetch(`${this.API_BASE}/api/arbitration-requests?applicant_id=${this.currentUser.id}`)
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    listDiv.innerHTML = `
                        <div class="glass-card" style="padding: 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 15px;">📋</div>
                            <p style="color: #888; font-size: 16px;">暂无仲裁记录</p>
                            <p style="color: #999; font-size: 14px; margin-top: 10px;">您的仲裁申请和进度将显示在这里</p>
                        </div>
                    `;
                    return;
                }
                
                const statusLabels = {
                    'pending': { text: '待处理', color: '#f39c12', icon: '⏳' },
                    'investigating': { text: '调查中', color: '#3498db', icon: '🔍' },
                    'resolved': { text: '已裁决', color: '#27ae60', icon: '✅' },
                    'rejected': { text: '已驳回', color: '#e74c3c', icon: '❌' }
                };
                
                const reasonLabels = {
                    'quality': '货物质量问题',
                    'quantity': '重量/数量不符',
                    'payment': '付款纠纷',
                    'delivery': '交货延迟/未交货',
                    'fraud': '欺诈行为',
                    'breach': '违反协议条款',
                    'other': '其他原因'
                };
                
                listDiv.innerHTML = data.map(item => {
                    const status = statusLabels[item.status] || statusLabels.pending;
                    
                    // 判断当前用户是否是被罚方
                    const isPenaltyTarget = (
                        (item.penalty_party === 'applicant' && item.applicant_id === this.currentUser.id) ||
                        (item.penalty_party === 'respondent' && item.respondent_id === this.currentUser.id)
                    );
                    
                    return `
                        <div class="glass-card" style="padding: 24px; margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                                <div>
                                    <h3 style="margin: 0; font-size: 18px;">
                                        ${status.icon} 仲裁编号：${item.arbitration_no}
                                    </h3>
                                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">订单编号：${item.order_no}</p>
                                </div>
                                <span style="padding: 6px 14px; border-radius: 20px; background: ${status.color}; color: white; font-size: 13px; font-weight: bold;">
                                    ${status.text}
                                </span>
                            </div>
                            
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                <p style="margin: 0 0 8px 0;"><strong>仲裁原因：</strong>${reasonLabels[item.reason] || item.reason}</p>
                                <p style="margin: 0 0 8px 0;"><strong>详细说明：</strong>${item.description}</p>
                                <p style="margin: 0;"><strong>提交时间：</strong>${item.created_at}</p>
                            </div>
                            
                            ${item.penalty_status && item.penalty_status !== 'none' && isPenaltyTarget ? `
                                <div style="background: ${item.penalty_status === 'paid' ? '#e8f5e9' : '#fff3cd'}; padding: 15px; border-radius: 8px; border-left: 4px solid ${item.penalty_status === 'paid' ? '#27ae60' : '#f39c12'}; margin-bottom: 15px;">
                                    <strong style="color: #e74c3c;">💰 罚款通知</strong>
                                    <p style="margin: 8px 0; color: #333;">
                                        根据仲裁结果，您需要支付罚款：<span style="font-size: 20px; font-weight: bold; color: #e74c3c;">¥${item.penalty_amount}</span>
                                    </p>
                                    ${item.penalty_reason ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">罚款原因：${item.penalty_reason}</p>` : ''}
                                    <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">
                                        状态：${item.penalty_status === 'pending' ? '<span style="color: #f39c12;">⏳ 待支付</span>' : ''}
                                        ${item.penalty_status === 'paid' ? '<span style="color: #27ae60;">✅ 已支付</span>' : ''}
                                        ${item.penalty_status === 'waived' ? '<span style="color: #95a5a6;">🔓 已豁免</span>' : ''}
                                    </p>
                                    ${item.penalty_status === 'pending' ? `
                                        <button onclick="authSystem.payPenalty(${item.id})" style="margin-top: 12px; padding: 10px 20px; background: #f39c12; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                                            立即支付罚款
                                        </button>
                                    ` : ''}
                                    ${item.penalty_paid_at ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">支付时间：${item.penalty_paid_at}</p>` : ''}
                                </div>
                            ` : ''}
                            
                            ${item.status === 'resolved' && item.decision ? `
                                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60; margin-bottom: 15px;">
                                    <strong style="color: #27ae60;">✅ 裁决结果：</strong>
                                    <p style="margin: 8px 0 0 0; color: #333;">${item.decision}</p>
                                    ${item.decided_at ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">裁决时间：${item.decided_at}</p>` : ''}
                                </div>
                            ` : ''}
                            
                            ${item.status === 'rejected' && item.admin_notes ? `
                                <div style="background: #ffebee; padding: 15px; border-radius: 8px; border-left: 4px solid #e74c3c;">
                                    <strong style="color: #e74c3c;">❌ 驳回原因：</strong>
                                    <p style="margin: 8px 0 0 0; color: #333;">${item.admin_notes}</p>
                                </div>
                            ` : ''}
                            
                            ${item.status === 'investigating' && item.admin_notes ? `
                                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">
                                    <strong style="color: #3498db;">🔍 管理员备注：</strong>
                                    <p style="margin: 8px 0 0 0; color: #333;">${item.admin_notes}</p>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('');
            })
            .catch(err => {
                console.error('加载仲裁记录失败:', err);
                listDiv.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">加载失败，请刷新重试</p>`;
            });
    },
    
    async submitArbitration() {
        const orderType = document.getElementById('order-type').value;
        const orderNo = document.getElementById('order-no').value.trim();
        const reason = document.getElementById('arbitration-reason').value;
        const description = document.getElementById('arbitration-description').value.trim();
        
        if (!orderType || !orderNo || !reason || !description) {
            return this.showAlert('请填写所有必填项', 'warning');
        }
        
        // 检查必须的证据材料
        const tradeFiles = document.getElementById('evidence-trade').files;
        const materialFiles = document.getElementById('evidence-material').files;
        const paymentFiles = document.getElementById('evidence-payment').files;
        
        if (tradeFiles.length === 0 || materialFiles.length === 0 || paymentFiles.length === 0) {
            return this.showAlert('请上传必需的证据材料：平台交易凭证、废料相关证据、资金往来凭证', 'error');
        }
        
        try {
            this.showAlert('正在上传证据材料...', 'info');
            
            // 上传所有文件
            const formData = new FormData();
            
            // 添加所有文件
            Array.from(tradeFiles).forEach(file => formData.append('files', file));
            Array.from(materialFiles).forEach(file => formData.append('files', file));
            Array.from(paymentFiles).forEach(file => formData.append('files', file));
            Array.from(document.getElementById('evidence-communication').files).forEach(file => formData.append('files', file));
            Array.from(document.getElementById('evidence-other').files).forEach(file => formData.append('files', file));
            
            const uploadResponse = await fetch(`${this.API_BASE}/api/upload-arbitration-files`, {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error('文件上传失败');
            }
            
            const uploadResult = await uploadResponse.json();
            const uploadedFiles = uploadResult.files;
            
            // 按类型分类文件
            let tradeIndex = 0;
            let materialIndex = tradeFiles.length;
            let paymentIndex = materialIndex + materialFiles.length;
            let communicationIndex = paymentIndex + paymentFiles.length;
            let otherIndex = communicationIndex + document.getElementById('evidence-communication').files.length;
            
            const evidence_trade = uploadedFiles.slice(tradeIndex, materialIndex).map(f => JSON.stringify(f));
            const evidence_material = uploadedFiles.slice(materialIndex, paymentIndex).map(f => JSON.stringify(f));
            const evidence_payment = uploadedFiles.slice(paymentIndex, communicationIndex).map(f => JSON.stringify(f));
            const evidence_communication = uploadedFiles.slice(communicationIndex, otherIndex).map(f => JSON.stringify(f));
            const evidence_other = uploadedFiles.slice(otherIndex).map(f => JSON.stringify(f));
            
            // 从订单编号提取订单ID (简化处理，实际应该从数据库查询)
            const order_id = Math.floor(Math.random() * 1000); // 临时生成，实际应该从订单表查询
            
            const response = await fetch(`${this.API_BASE}/api/arbitration-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    applicant_id: this.currentUser.id,
                    order_type: orderType,
                    order_id: order_id,
                    order_no: orderNo,
                    reason: reason,
                    description: description,
                    evidence_trade: evidence_trade,
                    evidence_material: evidence_material,
                    evidence_payment: evidence_payment,
                    evidence_communication: evidence_communication,
                    evidence_other: evidence_other
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || '提交失败');
            }
            
            this.showAlert('仲裁申请已提交，我们将在3个工作日内处理', 'success');
            
            // 清空表单
            document.getElementById('arbitration-form').reset();
            document.querySelectorAll('[id$="-preview"]').forEach(el => el.innerHTML = '');
            
            // 切换到进度面板
            setTimeout(() => {
                document.querySelector('[data-tab="progress"]').click();
            }, 1500);
            
        } catch (err) {
            console.error('提交仲裁申请失败:', err);
            this.showAlert(err.message || '提交失败，请重试', 'error');
        }
    },
    
    // ====== 仲裁管理（管理员端）======
    showArbitrationManagement() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation: fadeIn 0.5s;">
                <h1 class="page-title">⚖️ 仲裁管理</h1>
                <p style="color: var(--text-medium); margin-bottom: 30px;">处理用户仲裁请求，维护平台交易秩序</p>
                
                <!-- 筛选面板 -->
                <div class="glass-card" style="padding: 20px; margin-bottom: 25px;">
                    <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
                        <button class="filter-btn active" data-status="all" style="padding: 8px 16px; border-radius: 20px; border: none; background: #e74c3c; color: white; cursor: pointer;">
                            全部
                        </button>
                        <button class="filter-btn" data-status="pending" style="padding: 8px 16px; border-radius: 20px; border: none; background: #dfe6e9; color: #2d3436; cursor: pointer;">
                            待处理 <span class="badge">12</span>
                        </button>
                        <button class="filter-btn" data-status="investigating" style="padding: 8px 16px; border-radius: 20px; border: none; background: #74b9ff; color: white; cursor: pointer;">
                            调查中
                        </button>
                        <button class="filter-btn" data-status="resolved" style="padding: 8px 16px; border-radius: 20px; border: none; background: #55efc4; color: #2d3436; cursor: pointer;">
                            已裁决
                        </button>
                        <button class="filter-btn" data-status="rejected" style="padding: 8px 16px; border-radius: 20px; border: none; background: #fab1a0; color: #2d3436; cursor: pointer;">
                            已驳回
                        </button>
                    </div>
                </div>
                
                <!-- 仲裁列表 -->
                <div id="arbitration-management-list"></div>
            </div>
        `;
        
        // 筛选按钮事件
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadArbitrationRequests(btn.dataset.status);
            };
        });
        
        // 加载仲裁请求
        this.loadArbitrationRequests('all');
    },
    
    loadArbitrationRequests(status = 'all') {
        const listDiv = document.getElementById('arbitration-management-list');
        listDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">加载中...</p>';
        
        fetch(`${this.API_BASE}/api/arbitration-requests/all?status=${status}`)
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    listDiv.innerHTML = `
                        <div class="glass-card" style="padding: 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 15px;">⚖️</div>
                            <p style="color: #888; font-size: 16px;">暂无仲裁请求</p>
                            <p style="color: #999; font-size: 14px; margin-top: 10px;">用户提交的仲裁申请将显示在这里</p>
                        </div>
                    `;
                    return;
                }
                
                const statusLabels = {
                    'pending': { text: '待处理', color: '#f39c12', icon: '⏳' },
                    'investigating': { text: '调查中', color: '#3498db', icon: '🔍' },
                    'resolved': { text: '已裁决', color: '#27ae60', icon: '✅' },
                    'rejected': { text: '已驳回', color: '#e74c3c', icon: '❌' }
                };
                
                const reasonLabels = {
                    'quality': '货物质量问题',
                    'quantity': '重量/数量不符',
                    'payment': '付款纠纷',
                    'delivery': '交货延迟/未交货',
                    'fraud': '欺诈行为',
                    'breach': '违反协议条款',
                    'other': '其他原因'
                };
                
                const orderTypeLabels = {
                    'farmer_report': '农户申报订单',
                    'recycler_request': '回收商求购订单',
                    'processor_request': '处理商求购订单'
                };
                
                listDiv.innerHTML = data.map(item => {
                    const status = statusLabels[item.status] || statusLabels.pending;
                    return `
                        <div class="glass-card" onclick="authSystem.showArbitrationDetail(${item.id})" style="padding: 24px; margin-bottom: 20px; cursor: pointer; transition: all 0.3s;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                                <div>
                                    <h3 style="margin: 0; font-size: 18px;">
                                        ${status.icon} 仲裁编号：${item.arbitration_no}
                                    </h3>
                                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">
                                        申请人：${item.applicant_name} (${item.applicant_phone || '未提供'})
                                    </p>
                                </div>
                                <span style="padding: 6px 14px; border-radius: 20px; background: ${status.color}; color: white; font-size: 13px; font-weight: bold;">
                                    ${status.text}
                                </span>
                            </div>
                            
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                                    <p style="margin: 0;"><strong>订单类型：</strong>${orderTypeLabels[item.order_type] || item.order_type}</p>
                                    <p style="margin: 0;"><strong>订单编号：</strong>${item.order_no}</p>
                                </div>
                                <p style="margin: 0 0 8px 0;"><strong>仲裁原因：</strong>${reasonLabels[item.reason] || item.reason}</p>
                                <p style="margin: 0 0 8px 0;"><strong>详细说明：</strong>${item.description}</p>
                                <p style="margin: 0;"><strong>提交时间：</strong>${item.created_at}</p>
                            </div>
                            
                            <!-- 证据材料 -->
                            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                <strong style="color: #856404;">📎 已提交证据材料：</strong>
                                <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                                    <div>
                                        <strong>平台交易凭证：</strong>
                                        <span style="color: ${item.evidence_trade.length > 0 ? '#27ae60' : '#e74c3c'};">
                                            ${item.evidence_trade.length > 0 ? `✅ ${item.evidence_trade.length}个文件` : '❌ 未提交'}
                                        </span>
                                    </div>
                                    <div>
                                        <strong>废料相关证据：</strong>
                                        <span style="color: ${item.evidence_material.length > 0 ? '#27ae60' : '#e74c3c'};">
                                            ${item.evidence_material.length > 0 ? `✅ ${item.evidence_material.length}个文件` : '❌ 未提交'}
                                        </span>
                                    </div>
                                    <div>
                                        <strong>资金往来凭证：</strong>
                                        <span style="color: ${item.evidence_payment.length > 0 ? '#27ae60' : '#e74c3c'};">
                                            ${item.evidence_payment.length > 0 ? `✅ ${item.evidence_payment.length}个文件` : '❌ 未提交'}
                                        </span>
                                    </div>
                                    <div>
                                        <strong>沟通记录：</strong>
                                        <span style="color: #666;">
                                            ${item.evidence_communication.length > 0 ? `📄 ${item.evidence_communication.length}个文件` : '未提交'}
                                        </span>
                                    </div>
                                    <div>
                                        <strong>其他材料：</strong>
                                        <span style="color: #666;">
                                            ${item.evidence_other.length > 0 ? `📄 ${item.evidence_other.length}个文件` : '未提交'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            ${item.admin_notes ? `
                                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; margin-bottom: 15px;">
                                    <strong style="color: #3498db;">📝 管理员备注：</strong>
                                    <p style="margin: 8px 0 0 0; color: #333;">${item.admin_notes}</p>
                                </div>
                            ` : ''}
                            
                            ${item.decision ? `
                                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60; margin-bottom: 15px;">
                                    <strong style="color: #27ae60;">⚖️ 裁决结果：</strong>
                                    <p style="margin: 8px 0 0 0; color: #333;">${item.decision}</p>
                                    ${item.decided_at ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">裁决时间：${item.decided_at} | 裁决人：${item.decided_by_name || '管理员'}</p>` : ''}
                                </div>
                            ` : ''}
                            
                            <!-- 操作按钮 -->
                            ${item.status === 'pending' || item.status === 'investigating' ? `
                                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                    ${item.status === 'pending' ? `
                                        <button onclick="authSystem.updateArbitrationStatus(${item.id}, 'investigating')" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                                            🔍 开始调查
                                        </button>
                                    ` : ''}
                                    <button onclick="authSystem.resolveArbitration(${item.id})" style="padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                                        ✅ 做出裁决
                                    </button>
                                    <button onclick="authSystem.rejectArbitration(${item.id})" style="padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                                        ❌ 驳回申请
                                    </button>
                                    <button onclick="authSystem.addArbitrationNote(${item.id})" style="padding: 8px 16px; background: #95a5a6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                        📝 添加备注
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('');
            })
            .catch(err => {
                console.error('加载仲裁请求失败:', err);
                listDiv.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">加载失败，请刷新重试</p>`;
            });
    },
    
    async updateArbitrationStatus(id, status) {
        try {
            const response = await fetch(`${this.API_BASE}/api/arbitration-requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '更新失败');
            
            this.showAlert('状态已更新', 'success');
            this.loadArbitrationRequests('all');
        } catch (err) {
            this.showAlert(err.message, 'error');
        }
    },
    
    resolveArbitration(id) {
        const decision = prompt('请输入裁决结果：');
        if (!decision || !decision.trim()) return;
        
        fetch(`${this.API_BASE}/api/arbitration-requests/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'resolved',
                decision: decision.trim(),
                decided_by: this.currentUser.id,
                decided_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                this.showAlert('裁决已保存', 'success');
                // 如果在详情页，刷新详情；否则刷新列表
                setTimeout(() => {
                    const isInDetailPage = document.getElementById('content-area').innerHTML.includes('返回仲裁列表');
                    if (isInDetailPage) {
                        this.showArbitrationDetail(id);
                    } else {
                        this.loadArbitrationRequests('all');
                    }
                }, 800);
            } else {
                throw new Error(data.error || '操作失败');
            }
        })
        .catch(err => {
            this.showAlert(err.message, 'error');
        });
    },
    
    rejectArbitration(id) {
        const reason = prompt('请输入驳回原因：');
        if (!reason || !reason.trim()) return;
        
        fetch(`${this.API_BASE}/api/arbitration-requests/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'rejected',
                decision: '申请已驳回。理由：' + reason.trim(),
                decided_by: this.currentUser.id,
                decided_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                this.showAlert('申请已驳回', 'success');
                // 如果在详情页，刷新详情；否则刷新列表
                setTimeout(() => {
                    const isInDetailPage = document.getElementById('content-area').innerHTML.includes('返回仲裁列表');
                    if (isInDetailPage) {
                        this.showArbitrationDetail(id);
                    } else {
                        this.loadArbitrationRequests('all');
                    }
                }, 800);
            } else {
                throw new Error(data.error || '操作失败');
            }
        })
        .catch(err => {
            this.showAlert(err.message, 'error');
        });
    },
    
    addArbitrationNote(id) {
        const note = prompt('请输入备注内容：');
        if (!note || !note.trim()) return;
        
        fetch(`${this.API_BASE}/api/arbitration-requests/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin_notes: note.trim()
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                this.showAlert('备注已添加', 'success');
                // 如果在详情页，刷新详情；否则刷新列表
                setTimeout(() => {
                    const isInDetailPage = document.getElementById('content-area').innerHTML.includes('返回仲裁列表');
                    if (isInDetailPage) {
                        this.showArbitrationDetail(id);
                    } else {
                        this.loadArbitrationRequests('all');
                    }
                }, 800);
            } else {
                throw new Error(data.error || '操作失败');
            }
        })
        .catch(err => {
            this.showAlert(err.message, 'error');
        });
    },
    
    // 显示仲裁详情页面
    showArbitrationDetail(id) {
        const container = document.getElementById('content-area');
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #888;">加载中...</p>';
        
        // 渲染文件列表的辅助函数
        const renderFileList = (files) => {
            if (!files || files.length === 0) {
                return '<p style="margin: 0; color: #999; font-style: italic;">未提交</p>';
            }
            
            return `
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${files.map(fileStr => {
                        let fileInfo;
                        try {
                            // 尝试解析JSON格式的文件信息
                            fileInfo = JSON.parse(fileStr);
                        } catch (e) {
                            // 如果不是JSON，则是旧格式的文件名
                            fileInfo = { originalName: fileStr, path: null };
                        }
                        
                        const fileName = fileInfo.originalName || fileStr;
                        const filePath = fileInfo.path;
                        const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(fileName);
                        const isPdf = /\.pdf$/i.test(fileName);
                        const isVideo = /\.(mp4|avi|mov)$/i.test(fileName);
                        
                        let icon = '📄';
                        if (isImage) icon = '🖼️';
                        else if (isPdf) icon = '📄';
                        else if (isVideo) icon = '📹';
                        
                        const clickHandler = filePath 
                            ? `onclick="authSystem.viewFile('${filePath}', '${fileName}', ${isImage})"` 
                            : '';
                        
                        return `
                            <div ${clickHandler} style="background: white; padding: 10px 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 8px; ${filePath ? 'cursor: pointer; transition: transform 0.2s;' : ''}" ${filePath ? 'onmouseenter="this.style.transform=\'scale(1.05)\'" onmouseleave="this.style.transform=\'scale(1)\'"' : ''}>
                                ${icon}
                                <span style="font-size: 14px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${fileName}">${fileName}</span>
                                ${filePath ? '<span style="color: #3498db; font-size: 12px;">点击查看</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        };
        
        fetch(`${this.API_BASE}/api/arbitration-requests/all?status=all`)
            .then(res => res.json())
            .then(data => {
                const item = data.find(a => a.id === id);
                if (!item) {
                    container.innerHTML = '<p style="text-align: center; padding: 40px; color: #e74c3c;">未找到该仲裁记录</p>';
                    return;
                }
                
                const statusLabels = {
                    'pending': { text: '待处理', color: '#f39c12', icon: '⏳' },
                    'investigating': { text: '调查中', color: '#3498db', icon: '🔍' },
                    'resolved': { text: '已裁决', color: '#27ae60', icon: '✅' },
                    'rejected': { text: '已驳回', color: '#e74c3c', icon: '❌' }
                };
                
                const reasonLabels = {
                    'quality': '货物质量问题',
                    'quantity': '重量/数量不符',
                    'payment': '付款纠纷',
                    'delivery': '交货延迟/未交货',
                    'fraud': '欺诈行为',
                    'breach': '违反协议条款',
                    'other': '其他原因'
                };
                
                const orderTypeLabels = {
                    'farmer_report': '农户申报订单',
                    'recycler_request': '回收商求购订单',
                    'processor_request': '处理商求购订单'
                };
                
                const status = statusLabels[item.status] || statusLabels.pending;
                
                container.innerHTML = `
                    <div style="animation: fadeIn 0.5s;">
                        <!-- 返回按钮 -->
                        <div style="margin-bottom: 20px;">
                            <button onclick="authSystem.navigateTo('arbitration-management')" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                                ← 返回仲裁列表
                            </button>
                        </div>
                        
                        <!-- 仲裁基本信息 -->
                        <div class="glass-card" style="padding: 30px; margin-bottom: 25px;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                                <div>
                                    <h1 style="margin: 0 0 10px 0; font-size: 24px; color: #2c3e50;">
                                        ${status.icon} 仲裁详情
                                    </h1>
                                    <p style="margin: 0; font-size: 16px; color: #666;">仲裁编号：${item.arbitration_no}</p>
                                </div>
                                <span style="padding: 10px 20px; border-radius: 25px; background: ${status.color}; color: white; font-size: 15px; font-weight: bold;">
                                    ${status.text}
                                </span>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8f9fa; padding: 20px; border-radius: 10px;">
                                <div>
                                    <strong style="color: #555;">申请人：</strong>
                                    <span>${item.applicant_name}</span>
                                </div>
                                <div>
                                    <strong style="color: #555;">联系电话：</strong>
                                    <span>${item.applicant_phone || '未提供'}</span>
                                </div>
                                <div>
                                    <strong style="color: #555;">订单类型：</strong>
                                    <span>${orderTypeLabels[item.order_type] || item.order_type}</span>
                                </div>
                                <div>
                                    <strong style="color: #555;">订单编号：</strong>
                                    <span>${item.order_no}</span>
                                </div>
                                <div>
                                    <strong style="color: #555;">仲裁原因：</strong>
                                    <span>${reasonLabels[item.reason] || item.reason}</span>
                                </div>
                                <div>
                                    <strong style="color: #555;">提交时间：</strong>
                                    <span>${item.created_at}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 详细说明 -->
                        <div class="glass-card" style="padding: 25px; margin-bottom: 25px;">
                            <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📄 详细说明</h3>
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; line-height: 1.8;">
                                ${item.description}
                            </div>
                        </div>
                        
                        <!-- 证据材料 -->
                        <div class="glass-card" style="padding: 25px; margin-bottom: 25px;">
                            <h3 style="margin: 0 0 20px 0; color: #2c3e50;">📎 提交的证据材料</h3>
                            
                            <!-- 1. 平台交易凭证 -->
                            <div style="margin-bottom: 20px; background: ${item.evidence_trade.length > 0 ? '#e8f5e9' : '#ffebee'}; padding: 20px; border-radius: 10px; border-left: 5px solid ${item.evidence_trade.length > 0 ? '#27ae60' : '#e74c3c'};">
                                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                    ${item.evidence_trade.length > 0 ? '✅' : '❌'} 1. 平台交易凭证 <span style="color: #e74c3c;">*（必须）</span>
                                </h4>
                                <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">平台订单、回收报价单、废料交付确认单、平台系统操作日志</p>
                                ${renderFileList(item.evidence_trade)}
                            </div>
                            
                            <!-- 2. 废料相关证据 -->
                            <div style="margin-bottom: 20px; background: ${item.evidence_material.length > 0 ? '#e8f5e9' : '#ffebee'}; padding: 20px; border-radius: 10px; border-left: 5px solid ${item.evidence_material.length > 0 ? '#27ae60' : '#e74c3c'};">
                                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                    ${item.evidence_material.length > 0 ? '✅' : '❌'} 2. 废料相关证据 <span style="color: #e74c3c;">*（必须）</span>
                                </h4>
                                <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">新会柑果肉/果渣交付清单、质量检测报告、称重单据、现场照片/视频</p>
                                ${renderFileList(item.evidence_material)}
                            </div>
                            
                            <!-- 3. 资金往来凭证 -->
                            <div style="margin-bottom: 20px; background: ${item.evidence_payment.length > 0 ? '#e8f5e9' : '#ffebee'}; padding: 20px; border-radius: 10px; border-left: 5px solid ${item.evidence_payment.length > 0 ? '#27ae60' : '#e74c3c'};">
                                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                    ${item.evidence_payment.length > 0 ? '✅' : '❌'} 3. 资金往来凭证 <span style="color: #e74c3c;">*（必须）</span>
                                </h4>
                                <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">转账记录、收款收据、平台结算账单</p>
                                ${renderFileList(item.evidence_payment)}
                            </div>
                            
                            <!-- 4. 沟通记录（可选）-->
                            <div style="margin-bottom: 20px; background: ${item.evidence_communication.length > 0 ? '#e3f2fd' : '#f8f9fa'}; padding: 20px; border-radius: 10px; border-left: 5px solid #3498db;">
                                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                    ${item.evidence_communication.length > 0 ? '📄' : '📭'} 4. 沟通记录 <span style="color: #3498db;">（可选）</span>
                                </h4>
                                <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">平台聊天、微信/短信、邮件往来</p>
                                ${renderFileList(item.evidence_communication)}
                            </div>
                            
                            <!-- 5. 其他材料（可选）-->
                            <div style="background: ${item.evidence_other.length > 0 ? '#e3f2fd' : '#f8f9fa'}; padding: 20px; border-radius: 10px; border-left: 5px solid #3498db;">
                                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                    ${item.evidence_other.length > 0 ? '📄' : '📭'} 5. 其他材料 <span style="color: #3498db;">（可选）</span>
                                </h4>
                                <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">平台服务协议、行业标准、损失核算明细</p>
                                ${renderFileList(item.evidence_other)}
                            </div>
                        </div>
                        
                        ${item.admin_notes ? `
                            <!-- 管理员备注 -->
                            <div class="glass-card" style="padding: 25px; margin-bottom: 25px;">
                                <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📝 管理员备注</h3>
                                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; line-height: 1.8;">
                                    ${item.admin_notes}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${item.penalty_status && item.penalty_status !== 'none' ? `
                            <!-- 罚款信息 -->
                            <div class="glass-card" style="padding: 25px; margin-bottom: 25px; background: ${item.penalty_status === 'paid' ? '#e8f5e9' : '#fff3cd'};">
                                <h3 style="margin: 0 0 15px 0; color: #2c3e50;">💰 罚款处罚</h3>
                                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${item.penalty_status === 'paid' ? '#27ae60' : '#f39c12'};">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                                        <div><strong>被罚方：</strong>${item.penalty_party === 'applicant' ? item.applicant_name + '（申请人）' : (item.respondent_name || '被申请人')}</div>
                                        <div><strong>罚款金额：</strong><span style="color: #e74c3c; font-size: 18px; font-weight: bold;">¥${item.penalty_amount}</span></div>
                                        <div><strong>订单金额：</strong>¥${item.order_amount || 0}</div>
                                        <div><strong>罚款状态：</strong>
                                            ${item.penalty_status === 'pending' ? '<span style="color: #f39c12;">⏳ 待支付</span>' : ''}
                                            ${item.penalty_status === 'paid' ? '<span style="color: #27ae60;">✅ 已支付</span>' : ''}
                                            ${item.penalty_status === 'waived' ? '<span style="color: #95a5a6;">🔓 已豁免</span>' : ''}
                                        </div>
                                    </div>
                                    ${item.penalty_reason ? `<div style="margin-top: 10px;"><strong>罚款原因：</strong>${item.penalty_reason}</div>` : ''}
                                    ${item.penalty_paid_at ? `<div style="margin-top: 10px;"><strong>支付时间：</strong>${item.penalty_paid_at}</div>` : ''}
                                    ${item.penalty_proof ? `
                                        <div style="margin-top: 10px;">
                                            <strong>支付凭证：</strong>
                                            <button onclick="authSystem.viewFile('${item.penalty_proof}', '支付凭证', true)" style="padding: 5px 15px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                                                查看凭证
                                            </button>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${item.decision ? `
                            <!-- 裁决结果 -->
                            <div class="glass-card" style="padding: 25px; margin-bottom: 25px;">
                                <h3 style="margin: 0 0 15px 0; color: #2c3e50;">⚖️ 裁决结果</h3>
                                <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #27ae60; line-height: 1.8;">
                                    ${item.decision}
                                </div>
                                ${item.decided_at ? `
                                    <p style="margin: 15px 0 0 0; font-size: 13px; color: #666;">
                                        裁决时间：${item.decided_at} | 裁决人：${item.decided_by_name || '管理员'}
                                    </p>
                                ` : ''}
                            </div>
                        ` : ''}
                        
                        <!-- 操作按钮 -->
                        ${item.status === 'pending' || item.status === 'investigating' ? `
                            <div class="glass-card" style="padding: 25px;">
                                <h3 style="margin: 0 0 20px 0; color: #2c3e50;">🔧 仲裁操作</h3>
                                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                                    ${item.status === 'pending' ? `
                                        <button onclick="authSystem.updateArbitrationStatus(${item.id}, 'investigating'); setTimeout(() => authSystem.showArbitrationDetail(${item.id}), 1000);" style="padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px;">
                                            🔍 开始调查
                                        </button>
                                    ` : ''}
                                    <button onclick="authSystem.setPenalty(${item.id}, ${item.order_amount || 0})" style="padding: 12px 24px; background: #f39c12; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px;">
                                        💰 设置罚款
                                    </button>
                                    <button onclick="authSystem.resolveArbitration(${item.id})" style="padding: 12px 24px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px;">
                                        ✅ 做出裁决
                                    </button>
                                    <button onclick="authSystem.rejectArbitration(${item.id})" style="padding: 12px 24px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px;">
                                        ❌ 驳回申请
                                    </button>
                                    <button onclick="authSystem.addArbitrationNote(${item.id})" style="padding: 12px 24px; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px;">
                                        📝 添加备注
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            })
            .catch(err => {
                console.error('加载仲裁详情失败:', err);
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <p style="color: #e74c3c; margin-bottom: 20px;">加载失败，请重试</p>
                        <button onclick="authSystem.navigateTo('arbitration-management')" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            返回列表
                        </button>
                    </div>
                `;
            });
    },
    
    // 查看文件
    viewFile(filePath, fileName, isImage) {
        // 创建模态框显示文件
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕ 关闭';
        closeBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; padding: 12px 24px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; z-index: 10001;';
        closeBtn.onclick = () => modal.remove();
        
        const title = document.createElement('div');
        title.style.cssText = 'position: absolute; top: 20px; left: 20px; color: white; font-size: 18px; font-weight: bold; z-index: 10001; max-width: calc(100% - 180px);';
        title.textContent = fileName;
        
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = 'max-width: 90%; max-height: 80%; overflow: auto; background: white; border-radius: 10px; padding: 20px;';
        
        if (isImage) {
            const img = document.createElement('img');
            img.src = `${this.API_BASE}${filePath}`;
            img.style.cssText = 'max-width: 100%; max-height: 70vh; object-fit: contain;';
            img.onerror = () => {
                contentWrapper.innerHTML = '<p style="color: #e74c3c; text-align: center; padding: 40px;">图片加载失败</p>';
            };
            contentWrapper.appendChild(img);
        } else if (filePath.endsWith('.pdf')) {
            const iframe = document.createElement('iframe');
            iframe.src = `${this.API_BASE}${filePath}`;
            iframe.style.cssText = 'width: 80vw; height: 80vh; border: none;';
            iframe.onerror = () => {
                contentWrapper.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <p style="color: #e74c3c; margin-bottom: 20px;">PDF预览失败</p>
                        <a href="${this.API_BASE}${filePath}" download="${fileName}" style="padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 8px;">下载文件</a>
                    </div>
                `;
            };
            contentWrapper.appendChild(iframe);
        } else {
            // 其他文件类型，提供下载链接
            contentWrapper.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📄</div>
                    <p style="margin-bottom: 20px; color: #666;">暂不支持在线预览此文件类型</p>
                    <a href="${this.API_BASE}${filePath}" download="${fileName}" style="padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 8px; display: inline-block;">
                        ⬇️ 下载文件
                    </a>
                </div>
            `;
        }
        
        modal.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(contentWrapper);
        
        // 点击背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        document.body.appendChild(modal);
    },
    
    // 设置罚款
    setPenalty(arbitrationId, orderAmount = 0) {
        const container = document.createElement('div');
        container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        container.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 100%;">
                <h2 style="margin: 0 0 20px 0; color: #2c3e50;">💰 设置罚款</h2>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">被罚方 <span style="color: red;">*</span></label>
                    <select id="penalty-party" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                        <option value="">-- 请选择 --</option>
                        <option value="applicant">申请人（原告）</option>
                        <option value="respondent">被申请人（被告）</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">订单金额</label>
                    <input type="number" id="order-amount" value="${orderAmount}" step="0.01" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                    <small style="color: #666;">用于计算默认罚款比例</small>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">罚款金额 <span style="color: red;">*</span></label>
                    <input type="number" id="penalty-amount" step="0.01" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;" placeholder="输入罚款金额">
                    <button onclick="document.getElementById('penalty-amount').value = (document.getElementById('order-amount').value * 0.2).toFixed(2)" style="margin-top: 5px; padding: 5px 15px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                        按订单金额20%计算
                    </button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">罚款原因</label>
                    <textarea id="penalty-reason" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;" placeholder="说明罚款原因..."></textarea>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="authSystem.submitPenalty(${arbitrationId})" style="flex: 1; padding: 12px; background: #f39c12; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        确认设置
                    </button>
                    <button onclick="this.closest('div[style*=fixed]').remove()" style="flex: 1; padding: 12px; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        取消
                    </button>
                </div>
            </div>
        `;
        
        container.onclick = (e) => {
            if (e.target === container) container.remove();
        };
        
        document.body.appendChild(container);
    },
    
    // 提交罚款设置
    async submitPenalty(arbitrationId) {
        const party = document.getElementById('penalty-party').value;
        const amount = parseFloat(document.getElementById('penalty-amount').value);
        const reason = document.getElementById('penalty-reason').value.trim();
        const orderAmount = parseFloat(document.getElementById('order-amount').value) || 0;
        
        if (!party) {
            return this.showAlert('请选择被罚方', 'warning');
        }
        
        if (!amount || amount <= 0) {
            return this.showAlert('请输入有效的罚款金额', 'warning');
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/api/arbitration-requests/${arbitrationId}/penalty`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    penalty_party: party,
                    penalty_amount: amount,
                    penalty_reason: reason,
                    order_amount: orderAmount
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || '设置失败');
            }
            
            this.showAlert('罚款设置成功', 'success');
            
            // 关闭弹窗
            document.querySelectorAll('div[style*="position: fixed"]').forEach(el => {
                if (el.innerHTML.includes('设置罚款')) el.remove();
            });
            
            // 刷新详情页
            setTimeout(() => {
                this.showArbitrationDetail(arbitrationId);
            }, 800);
            
        } catch (err) {
            console.error('设置罚款失败:', err);
            this.showAlert(err.message || '设置失败，请重试', 'error');
        }
    },
    
    // 支付罚款（用户端）
    payPenalty(arbitrationId) {
        const container = document.createElement('div');
        container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        container.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 100%;">
                <h2 style="margin: 0 0 20px 0; color: #2c3e50;">💰 上交罚款</h2>
                
                <p style="color: #666; margin-bottom: 20px;">请上传您的支付凭证（转账记录、付款截图等）</p>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">支付凭证 <span style="color: red;">*</span></label>
                    <input type="file" id="penalty-proof" accept="image/*,.pdf" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                </div>
                
                <div id="proof-preview" style="margin-bottom: 20px;"></div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="authSystem.submitPenaltyPayment(${arbitrationId})" style="flex: 1; padding: 12px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        提交支付凭证
                    </button>
                    <button onclick="this.closest('div[style*=fixed]').remove()" style="flex: 1; padding: 12px; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        取消
                    </button>
                </div>
            </div>
        `;
        
        container.onclick = (e) => {
            if (e.target === container) container.remove();
        };
        
        document.body.appendChild(container);
        
        // 文件预览
        document.getElementById('penalty-proof').onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const preview = document.getElementById('proof-preview');
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
                    };
                    reader.readAsDataURL(file);
                } else {
                    preview.innerHTML = `<p style="color: #666;">📄 ${file.name}</p>`;
                }
            }
        };
    },
    
    // 提交罚款支付
    async submitPenaltyPayment(arbitrationId) {
        const fileInput = document.getElementById('penalty-proof');
        const file = fileInput.files[0];
        
        if (!file) {
            return this.showAlert('请上传支付凭证', 'warning');
        }
        
        try {
            const formData = new FormData();
            formData.append('proof', file);
            formData.append('user_id', this.currentUser.id);
            
            const response = await fetch(`${this.API_BASE}/api/arbitration-requests/${arbitrationId}/pay-penalty`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || '提交失败');
            }
            
            this.showAlert('支付凭证已提交，等待管理员确认', 'success');
            
            // 关闭弹窗
            document.querySelectorAll('div[style*="position: fixed"]').forEach(el => {
                if (el.innerHTML.includes('上交罚款')) el.remove();
            });
            
            // 刷新列表
            setTimeout(() => {
                this.loadMyArbitrations();
            }, 1000);
            
        } catch (err) {
            console.error('提交支付失败:', err);
            this.showAlert(err.message || '提交失败，请重试', 'error');
        }
    }
};

// ====== 页面加载完成后初始化 ======
document.addEventListener('DOMContentLoaded', () => {
    authSystem.init();
});
