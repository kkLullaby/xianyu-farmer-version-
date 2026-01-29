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

        const reset = () => {
            knob.style.left = '0px';
            track.style.background = '#f0f0f0';
            text.textContent = '按住滑块拖动验证';
            text.style.color = '#666';
            this.sliderVerified = false;
        };

        const complete = () => {
            knob.style.left = (track.clientWidth - knob.clientWidth) + 'px';
            track.style.background = '#e8f8f2';
            text.textContent = '验证通过';
            text.style.color = '#27ae60';
            this.sliderVerified = true;
        };

            const sendOtpBtn = document.getElementById('btn-send-otp');
            if (!track || !knob || !text || !sendOtpBtn) return;
        let dragging = false;
            let locked = false;
        let startX = 0;
        let knobStart = 0;

        const onMove = (clientX) => {
            if (!dragging) return;
            const delta = clientX - startX;
            let pos = knobStart + delta;
                locked = false;
                knob.style.pointerEvents = '';
                sendOtpBtn.disabled = true;
            if (pos > maxX()) pos = maxX();
            knob.style.left = pos + 'px';
            if (pos >= maxX()) complete();
        };

        const onMouseMove = (e) => onMove(e.clientX);
        const onTouchMove = (e) => {
            if (e.touches && e.touches.length) onMove(e.touches[0].clientX);
                locked = true;
                knob.style.pointerEvents = 'none';
                sendOtpBtn.disabled = false;
        };

        const stop = () => {
            if (!dragging) return;
            dragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', stop);
            document.removeEventListener('touchmove', onTouchMove);
                if (!dragging || locked) return;
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
                if (locked) return;
        track.addEventListener('click', (e) => {
            const rect = track.getBoundingClientRect();
            const pos = e.clientX - rect.left;
            if (pos >= maxX()) complete();
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
    
                if (locked) return;
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
                <div style="animation: fadeIn 0.6s ease;">
                    <h1 style="font-size: 48px; color: #2c3e50; text-align: center; margin-bottom: 10px;">欢迎来到农业废品回收平台</h1>
                    <p style="text-align: center; color: #666; font-size: 18px;">请登录后继续</p>
                    <div style="width: 100px; height: 3px; background: #1abc9c; margin: 30px auto;"></div>
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
                <h1 style="color: #2c3e50; border-bottom: 3px solid #e74c3c; padding-bottom: 15px;">
                    👨‍💼 管理员工作台
                </h1>
                <p style="color: #666; font-size: 14px;">登录时间：${this.currentUser.loginTime}</p>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 30px;">
                    <!-- 系统概览卡片 -->
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #e74c3c;">
                        <h3 style="color: #e74c3c; margin: 0 0 10px 0;">📊 系统概览</h3>
                        <p>注册用户总数：<strong>328</strong></p>
                        <p>农户数：<strong>156</strong></p>
                        <p>回收商数：<strong>172</strong></p>
                        <p>待审核申报：<strong>12</strong></p>
                    </div>
                    
                    <!-- 用户管理卡片 -->
                    <div onclick="authSystem.navigateTo('user-management')" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #3498db; cursor: pointer; transition: all 0.3s;">
                        <h3 style="color: #3498db; margin: 0 0 10px 0;">👥 用户管理</h3>
                        <p>管理所有用户账户</p>
                        <p>包括审核、禁用、删除等操作</p>
                        <button style="background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;">进入管理</button>
                    </div>
                    
                    <!-- 申报审核卡片 -->
                    <div onclick="authSystem.navigateTo('audit-reports')" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #f39c12; cursor: pointer; transition: all 0.3s;">
                        <h3 style="color: #f39c12; margin: 0 0 10px 0;">📝 申报审核</h3>
                        <p>审核农户的处理申报</p>
                        <p>核实处理数据和文件</p>
                        <button style="background: #f39c12; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;">审核申报</button>
                    </div>
                    
                    <!-- 数据统计卡片 -->
                    <div onclick="authSystem.navigateTo('data-stats')" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #27ae60; cursor: pointer; transition: all 0.3s;">
                        <h3 style="color: #27ae60; margin: 0 0 10px 0;">📈 数据统计</h3>
                        <p>查看平台各类数据</p>
                        <p>处理量、用户活跃度等</p>
                        <button style="background: #27ae60; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;">查看统计</button>
                    </div>
                    
                    <!-- 系统设置卡片 -->
                    <div onclick="authSystem.navigateTo('system-settings')" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #9b59b6; cursor: pointer; transition: all 0.3s;">
                        <h3 style="color: #9b59b6; margin: 0 0 10px 0;">⚙️ 系统设置</h3>
                        <p>配置平台参数</p>
                        <p>管理处理点、费用等</p>
                        <button style="background: #9b59b6; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;">进入设置</button>
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
                <h1 style="color: #2c3e50; border-bottom: 3px solid #27ae60; padding-bottom: 15px;">
                    🌾 农户工作台 - ${this.currentUser.name}
                </h1>
                <p style="color: #666; font-size: 14px;">登录时间：${this.currentUser.loginTime}</p>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 30px;">
                    <!-- 我的统计卡片 -->
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #27ae60;">
                        <h3 style="color: #27ae60; margin: 0 0 10px 0;">📊 我的统计</h3>
                        <p>今年处理总量：<strong>2,580 斤</strong></p>
                        <p>申报记录数：<strong>18</strong></p>
                        <p>已批准：<strong>16</strong></p>
                        <p>待审核：<strong>2</strong></p>
                    </div>
                    
                    <!-- 发起新申报卡片 -->
                    <div onclick="authSystem.navigateTo('new-report')" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #3498db; cursor: pointer; transition: all 0.3s;">
                        <h3 style="color: #3498db; margin: 0 0 10px 0;">📝 发起申报</h3>
                        <p>申报新的柑肉处理</p>
                        <p>获取处理凭证和记录</p>
                        <button style="background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;">新建申报</button>
                    </div>
                    
                    <!-- 申报历史卡片 -->
                    <div onclick="authSystem.navigateTo('my-reports')" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #f39c12; cursor: pointer; transition: all 0.3s;">
                        <h3 style="color: #f39c12; margin: 0 0 10px 0;">📋 申报记录</h3>
                        <p>查看所有申报历史</p>
                        <p>跟踪申报状态</p>
                        <button style="background: #f39c12; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;">查看记录</button>
                    </div>
                    
                    <!-- 附近处理点查询卡片 -->
                    <div onclick="window.location.href='farmer-nearby-recyclers.html'" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #27ae60; cursor: pointer; transition: all 0.3s; hover: transform translateY(-5px);">
                        <h3 style="color: #27ae60; margin: 0 0 10px 0;">🌍 附近处理点</h3>
                        <p>查找距离最近的处理点</p>
                        <p>实时显示3-5个最近的回收商</p>
                        <button style="background: #27ae60; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;">查找处理点</button>
                    </div>
                    
                    <!-- 我的账户卡片 -->
                    <div onclick="authSystem.navigateTo('my-account')" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #9b59b6; cursor: pointer; transition: all 0.3s;">
                        <h3 style="color: #9b59b6; margin: 0 0 10px 0;">👤 我的账户</h3>
                        <p>管理账户信息</p>
                        <p>修改密码和隐私设置</p>
                        <button style="background: #9b59b6; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;">管理账户</button>
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
                <h1 style="color: #2c3e50; border-bottom: 3px solid #1abc9c; padding-bottom: 15px;">
                    ♻️ 回收商工作台 - ${this.currentUser.name}
                </h1>
                <p style="color: #666; font-size: 14px;">登录时间：${this.currentUser.loginTime}</p>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 30px;">
                    <!-- 我的统计卡片 -->
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #1abc9c;">
                        <h3 style="color: #1abc9c; margin: 0 0 10px 0;">📊 我的统计</h3>
                        <p>本月回收总量：<strong>15,680 斤</strong></p>
                        <p>合作农户数：<strong>42</strong></p>
                        <p>完成交易数：<strong>58</strong></p>
                        <p>待处理订单：<strong>8</strong></p>
                    </div>
                    
                    <!-- 发布求购卡片 -->
                    <div onclick="authSystem.navigateTo('publish-demand')" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #3498db; cursor: pointer; transition: all 0.3s;">
                        <h3 style="color: #3498db; margin: 0 0 10px 0;">📢 发布求购</h3>
                        <p>发布收购需求</p>
                        <p>吸引农户投资</p>
                        <button style="background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;">新建求购</button>
                    </div>
                    
                    <!-- 订单管理卡片 -->
                    <div onclick="authSystem.navigateTo('my-orders')" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #f39c12; cursor: pointer; transition: all 0.3s;">
                        <h3 style="color: #f39c12; margin: 0 0 10px 0;">📦 订单管理</h3>
                        <p>查看和管理订单</p>
                        <p>跟踪交易进度</p>
                        <button style="background: #f39c12; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;">管理订单</button>
                    </div>
                    
                    <!-- 合作农户卡片 -->
                    <div onclick="authSystem.navigateTo('partner-farmers')" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #e74c3c; cursor: pointer; transition: all 0.3s;">
                        <h3 style="color: #e74c3c; margin: 0 0 10px 0;">🤝 合作农户</h3>
                        <p>管理合作关系</p>
                        <p>查看农户信息和评价</p>
                        <button style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;">查看农户</button>
                    </div>
                    
                    <!-- 财务中心卡片 -->
                    <div onclick="authSystem.navigateTo('finance')" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #27ae60; cursor: pointer; transition: all 0.3s;">
                        <h3 style="color: #27ae60; margin: 0 0 10px 0;">💰 财务中心</h3>
                        <p>查看账单和收款</p>
                        <p>管理账户余额</p>
                        <button style="background: #27ae60; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;">财务管理</button>
                    </div>
                    
                    <!-- 我的账户卡片 -->
                    <div onclick="authSystem.navigateTo('my-account')" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #9b59b6; cursor: pointer; transition: all 0.3s;">
                        <h3 style="color: #9b59b6; margin: 0 0 10px 0;">👤 我的账户</h3>
                        <p>管理账户信息</p>
                        <p>修改密码和企业信息</p>
                        <button style="background: #9b59b6; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;">管理账户</button>
                    </div>
                </div>
            </div>
        `;
        // 更新侧边栏
        this.updateSidebar('recycler');
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
        }
        
        const navList = document.querySelector('.nav-list');
        if (navList) {
            navList.innerHTML = menuHTML;
        }
    },
    
    // 页面导航
    navigateTo(page) {
        const container = document.getElementById('content-area');
        
        // 这里可以根据不同页面显示不同内容
        const pages = {
            'dashboard': () => this.redirectToDashboard(),
            'user-management': () => {
                container.innerHTML = '<h2>👥 用户管理</h2><p>用户列表将显示在这里...（正在开发中）</p>';
            },
            'audit-reports': () => {
                container.innerHTML = '<h2>📝 申报审核</h2><p>申报审核列表将显示在这里...（正在开发中）</p>';
            },
            'new-report': () => {
                container.innerHTML = '<h2>📝 发起新申报</h2><p>申报表单将显示在这里...（正在开发中）</p>';
            },
            'my-reports': () => {
                container.innerHTML = '<h2>📋 申报记录</h2><p>您的申报记录将显示在这里...（正在开发中）</p>';
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
            }
        };
        
        if (pages[page]) {
            pages[page]();
        }
    },
    
    // 获取身份标签
    getRoleLabel(role) {
        const labels = {
            'admin': '管理员',
            'farmer': '农户',
            'recycler': '回收商'
        };
        return labels[role] || '未知';
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
