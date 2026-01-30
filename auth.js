/**
 * 农业废品回收系统 - 身份认证与分流管理
 */

// ====== 身份信息管理 ======
const authSystem = {
    // API 基础 URL
    API_BASE: 'http://localhost:4000',
    
    // 当前登录用户信息
    currentUser: null,

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
                </div>
            </div>
        `;
        // 更新侧边栏
        this.updateSidebar('farmer');
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
                    
                    <!-- 合作农户卡片 -->
                    <div class="glass-card" onclick="authSystem.navigateTo('partner-farmers')" style="padding: 24px; border-left: 6px solid var(--primary-green); cursor: pointer;">
                        <h3 style="color: var(--primary-green); margin: 0 0 10px 0;">🤝 合作农户</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">管理合作关系，查看农户信息和评价</p>
                        <button style="background: var(--primary-green); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">查看农户</button>
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
                </div>
            </div>
        `;
        // 更新侧边栏
        this.updateSidebar('recycler');
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

                    <!-- 回收商供应卡片 (连接回收商) -->
                    <div class="glass-card" onclick="authSystem.navigateTo('recycler-supplies')" style="padding: 24px; border-left: 6px solid var(--primary-light); cursor: pointer;">
                        <h3 style="color: var(--primary-light); margin: 0 0 10px 0;">♻️ 回收商供应</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看回收商发布的供应信息，批量采购原料</p>
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
                <li><a href="#" onclick="authSystem.navigateTo('system-settings')">⚙️ 系统设置</a></li>
                <li style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 20px;"><a href="#" onclick="authSystem.logout()">🚪 退出登录</a></li>
            `;
        } else if (role === 'farmer') {
            menuHTML = `
                <li><a href="#" onclick="authSystem.navigateTo('dashboard')">🏠 我的首页</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('new-report')">📝 发起申报</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('my-reports')">📋 申报记录</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('processing-points')">🗺️ 处理点查询</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('my-account')">👤 我的账户</a></li>
                <li style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 20px;"><a href="#" onclick="authSystem.logout()">🚪 退出登录</a></li>
            `;
        } else if (role === 'recycler') {
            menuHTML = `
                <li><a href="#" onclick="authSystem.navigateTo('dashboard')">🏠 我的首页</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('publish-demand')">📢 发布求购</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('my-orders')">📦 订单管理</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('partner-farmers')">🤝 合作农户</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('finance')">💰 财务中心</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('my-account')">👤 我的账户</a></li>
                <li style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 20px;"><a href="#" onclick="authSystem.logout()">🚪 退出登录</a></li>
            `;
        } else if (role === 'processor') {
            menuHTML = `
                <li><a href="#" onclick="authSystem.navigateTo('dashboard')">🏠 我的首页</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('publish-demand')">📢 发布求购</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('my-orders')">📦 订单管理</a></li>
                <li><a href="#" onclick="authSystem.navigateTo('recycler-supplies')">♻️ 回收商供应</a></li>
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
                container.innerHTML = '<h2>📢 发布求购</h2><p>求购发布表单将显示在这里...（正在开发中）</p>';
            },
            'my-orders': () => {
                container.innerHTML = '<h2>📦 订单管理</h2><p>您的订单列表将显示在这里...（正在开发中）</p>';
            },
            'partner-farmers': () => {
                container.innerHTML = '<h2>🤝 合作农户</h2><p>合作农户列表将显示在这里...（正在开发中）</p>';
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
                container.innerHTML = '<h2>📢 回收商求购</h2><p>回收商求购列表将显示在这里...（正在开发中）</p>';
            },
            'recycler-supplies': () => {
                container.innerHTML = '<h2>♻️ 回收商供应</h2><p>回收商供应列表将显示在这里...（正在开发中）</p>';
            },
            'farmer-supplies': () => {
                this.showFarmerSupplies();
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
                            <button data-supply-action="accept" data-id="${r.id}" style="background:var(--primary-green);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">接单</button>
                            <a href="tel:${r.farmer_phone || ''}" style="background:#74b9ff;color:#fff;border:none;border-radius:6px;padding:6px 14px;text-decoration:none;">联系农户</a>
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
        document.querySelectorAll('[data-supply-action="accept"]').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;
                const item = list.find(r => String(r.id) === String(id));
                if (!item) return;
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
    }
};

// ====== 页面加载完成后初始化 ======
document.addEventListener('DOMContentLoaded', () => {
    authSystem.init();
});
