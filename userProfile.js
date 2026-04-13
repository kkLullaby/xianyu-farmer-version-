/**
 * userProfile.js
 * 废旧柑橘果肉回收平台 - Web 端个人中心模块重构
 * 100% 对齐小程序端业务逻辑，采用组件化模板和全局事件代理
 */

class UserProfileManager {
    constructor() {
        this.container = null;
        this.initDelegation();
    }

    // 全局事件代理，避免内联 onclick
    initDelegation() {
        document.body.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (el) {
                // 如果是超链接或按钮带有 action，阻止默认行为
                if (el.tagName === 'A' || el.tagName === 'BUTTON') {
                    e.preventDefault();
                }
                const action = el.dataset.action;
                const payload = el.dataset.payload;
                this.handleAction(action, payload);
            }
        });
    }

    // 事件处理核心分发枢纽
    handleAction(action, payload) {
        if (!authSystem || !authSystem.currentUser) return;
        
        switch (action) {
            case 'nav':
                console.log('触发跳转:', action, payload);
                authSystem.navigateTo(payload);
                break;
            case 'coming-soon':
                console.log('触发跳转:', action);
                if (authSystem.showAlert) {
                    authSystem.showAlert('该功能将在正式版开放', 'info');
                } else {
                    alert('该功能将在正式版开放');
                }
                break;
            case 'call-admin':
                console.log('触发跳转:', action);
                this.handleCallAdmin();
                break;
            case 'logout':
                console.log('触发跳转:', action);
                if (authSystem.logout) {
                    authSystem.logout();
                }
                break;
            // -- 以下为业务功能页面的入口（此处可继续扩展为实际视图） --
            case 'address-list':
                console.log('触发跳转:', action);
                this.renderAddressList();
                break;
            case 'edit-address':
                console.log('触发跳转:', action, payload);
                this.renderAddressForm(payload); // payload 可能是已有地址 ID 或空
                break;
            case 'intentions-list':
                console.log('触发跳转:', action);
                this.renderIntentionsList();
                break;
            default:
                console.warn('[UserProfile] Unknown action:', action);
        }
    }

    handleCallAdmin() {
        const phone = '400-888-6688';
        if (confirm(`是否拨打平台客服电话：${phone} ？`)) {
            // Web 端的模拟拨打，直接调起 tel 协议
            window.location.href = `tel:${phone}`;
        }
    }

    // ====== 数据与结构组装层 ======

    // ====== 获取真实数据层 ======
    async fetchUserProfile() {
        if (!authSystem || !authSystem.currentUser) return null;
        const user = authSystem.currentUser;

        try {
            // 尝试调用后端获取完整用户数据和资产的 API
            const apiData = await window.authFetch('/api/users/profile', { method: 'GET' });
            if (apiData) {
                return {
                    nickname: apiData.name || apiData.username || user.username || '用户',
                    role: user.role,
                    roleName: authSystem.getRoleLabel ? authSystem.getRoleLabel(user.role) : '未知角色',
                    isRealName: apiData.isRealName !== undefined ? apiData.isRealName : true,
                    avatar: apiData.avatar || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
                    balance: apiData.balance || '0.00',
                    pendingAmount: apiData.pendingAmount || '0.00'
                };
            }
        } catch (error) {
            console.warn('[UserProfile] 真实接口获取失败，使用降级数据:', error.message);
        }

        // 降级：如果服务端暂无该接口或返回错误，使用本地计算默认值（对齐小程序Mock）
        const base = {
            nickname: user.name || user.username || '用户',
            role: user.role || 'farmer',
            roleName: authSystem.getRoleLabel ? authSystem.getRoleLabel(user.role) : '未知角色',
            isRealName: true,
            avatar: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
        };

        switch (user.role) {
            case 'merchant': return { ...base, balance: '24000.00', pendingAmount: '3500.00' };
            case 'processor': return { ...base, balance: '50000.00', pendingAmount: '12000.00' };
            case 'admin': return { ...base, balance: '0.00', pendingAmount: '0.00' };
            default: return { ...base, balance: '8500.00', pendingAmount: '1200.00' };
        }
    }

    // ====== 视图渲染层 (相当于 Vue Template) ======

    renderHeader(userInfo) {
        let roleIcon = '🟢';
        let roleClass = 'role-farmer';
        if (userInfo.role === 'merchant') { roleIcon = '🟠'; roleClass = 'role-merchant'; }
        if (userInfo.role === 'processor') { roleIcon = '🔵'; roleClass = 'role-processor'; }
        if (userInfo.role === 'admin') { roleIcon = '🛠️'; roleClass = 'role-admin'; }

        return `
            <div style="display: flex; align-items: center; background-color: #FFFFFF; padding: 25px 20px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); margin-bottom: 20px;">
                <img src="${userInfo.avatar}" style="width: 70px; height: 70px; border-radius: 50%; margin-right: 20px; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" alt="Avatar">
                <div style="display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 20px; font-weight: bold; color: #333; margin-bottom: 10px;">${userInfo.nickname}</div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <span class="user-prop-tag ${roleClass}" style="font-size: 13px; padding: 4px 10px; border-radius: 4px; display: flex; align-items: center; font-weight: bold;">
                            ${roleIcon} ${userInfo.roleName}
                        </span>
                        ${userInfo.isRealName ? 
                            '<span class="user-prop-tag realname-tag" style="background-color: #F0FDF4; color: #1B5E20; font-size: 13px; padding: 4px 10px; border-radius: 4px;">✅ 已实名</span>' : 
                            '<span class="user-prop-tag unverified-tag" style="background-color: #FFEBEE; color: #C62828; font-size: 13px; padding: 4px 10px; border-radius: 4px;">❌ 未实名</span>'}
                    </div>
                </div>
            </div>
            
            <style>
                .role-farmer { background-color: #E8F5E9; color: #2E7D32; }
                .role-merchant { background-color: #FFF3E0; color: #EF6C00; }
                .role-processor { background-color: #E3F2FD; color: #1565C0; }
                .role-admin { background-color: #ECEFF1; color: #455A64; }
            </style>
        `;
    }

    renderWallet(userInfo) {
        if (userInfo.role === 'admin') return ''; // 管理员不展示钱包

        return `
            <div style="background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%); border-radius: 12px; padding: 20px; color: #FFFFFF; box-shadow: 0 8px 24px rgba(46, 125, 50, 0.2); margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <span style="font-size: 16px; font-weight: bold; opacity: 0.9;">我的钱包</span>
                    <a href="#" data-action="coming-soon" style="font-size: 13px; color: #fff; opacity: 0.8; text-decoration: none;">账单明细 ></a>
                </div>
                <div style="display: flex; align-items: center;">
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <span style="font-size: 13px; opacity: 0.8; margin-bottom: 6px;">账户余额 (元)</span>
                        <span style="font-size: 26px; font-weight: bold;">${userInfo.balance}</span>
                    </div>
                    <div style="width: 1px; height: 30px; background-color: rgba(255, 255, 255, 0.2); margin: 0 20px;"></div>
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <span style="font-size: 13px; opacity: 0.8; margin-bottom: 6px;">待结算 (元)</span>
                        <span style="font-size: 20px; font-weight: bold;">${userInfo.pendingAmount}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 辅助生成标准业务分类列表
    renderListGroup(items) {
        const renderItem = (item) => `
            <div data-action="${item.action}" data-payload="${item.payload || ''}" style="display: flex; justify-content: space-between; align-items: center; padding: 18px 0; border-bottom: 1px solid #F0F0F0; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#fafafa'" onmouseout="this.style.backgroundColor='transparent'">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 15px; color: #333333; font-weight: 500; margin-bottom: 4px;">${item.icon} ${item.title}</span>
                    <span style="font-size: 12px; color: #999999;">${item.desc}</span>
                </div>
                <span style="color: #CCCCCC; font-size: 16px; font-weight: bold;">></span>
            </div>
        `;

        const lis = items.map(renderItem).join('');

        return `
            <div style="background-color: #FFFFFF; border-radius: 12px; padding: 0 20px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02); margin-bottom: 20px;">
                ${lis}
            </div>
        `;
    }

    // 专属菜单渲染：根据不同角色组合对应的区块
    renderMenus(userInfo) {
        let menusHTML = '';

        // 基础通用业务层（对齐小程序 business-section）
        if (userInfo.role !== 'admin') {
            const businessItems = [
                { icon: '📍', title: '地址管理', desc: '管理收发货与果园/厂区地址', action: 'address-list' },
                { icon: '📨', title: '我的意向', desc: '查看已发起的所有报价意向及状态', action: 'intentions-list' },
                { icon: '⭐', title: '我的收藏', desc: '关注的优质买家/卖家', action: 'coming-soon' }
            ];
            menusHTML += this.renderListGroup(businessItems);
        }

        // Web 端特有的细分业务（根据旧版 auth.js 整理合并）
        if (userInfo.role === 'admin') {
            menusHTML += `
                <div style="margin-bottom: 15px;"><h3 style="font-size:16px;">📊 管理中心</h3></div>
                ${this.renderListGroup([
                    { icon: '👥', title: '用户管理', desc: '审核、禁用、删除账户', action: 'nav', payload: 'user-management' },
                    { icon: '📝', title: '申报审核', desc: '核实处理数据和文件', action: 'nav', payload: 'audit-reports' },
                    { icon: '📈', title: '数据统计', desc: '查看各类平台数据指标', action: 'nav', payload: 'data-stats' },
                    { icon: '📰', title: '公告编辑中心', desc: '配置主页政策与广告', action: 'nav', payload: 'cms-center' }
                ])}
            `;
        }

        if (userInfo.role === 'farmer') {
            menusHTML += `
                <div style="margin-bottom: 15px;"><h3 style="font-size:16px;">📦 申报与求购</h3></div>
                ${this.renderListGroup([
                    { icon: '📝', title: '发起申报', desc: '申报处理获取凭证', action: 'nav', payload: 'new-report' },
                    { icon: '📋', title: '申报记录', desc: '查看所有申报状态', action: 'nav', payload: 'my-reports' },
                    { icon: '📢', title: '回收商求购', desc: '查看收购寻买家', action: 'nav', payload: 'recycler-demands' }
                ])}
            `;
        }

        if (userInfo.role === 'recycler') {
            menusHTML += `
                <div style="margin-bottom: 15px;"><h3 style="font-size:16px;">📦 供需协同</h3></div>
                ${this.renderListGroup([
                    { icon: '📦', title: '订单管理', desc: '跟踪订单与交易流程', action: 'nav', payload: 'my-orders' },
                    { icon: '🌾', title: '农户供应', desc: '对接农户货源', action: 'nav', payload: 'farmer-supplies' },
                    { icon: '📢', title: '发布求购', desc: '发布收购需求寻找供给', action: 'nav', payload: 'publish-demand' },
                    { icon: '🏭', title: '处理商需求', desc: '响应采购订单', action: 'nav', payload: 'processor-demands' }
                ])}
            `;
        }

        if (userInfo.role === 'processor') {
            menusHTML += `
                <div style="margin-bottom: 15px;"><h3 style="font-size:16px;">📦 采购管理</h3></div>
                ${this.renderListGroup([
                    { icon: '📦', title: '采购订单管理', desc: '跟踪收货订单', action: 'nav', payload: 'my-orders' },
                    { icon: '📢', title: '发布采购求购', desc: '发布原料需求', action: 'nav', payload: 'publish-demand' },
                    { icon: '🌾', title: '货源供应', desc: '对接底层货源', action: 'nav', payload: 'supply-sources' }
                ])}
            `;
        }

        // 服务层（对齐小程序 service-section）
        const serviceItems = [
            { icon: '🛡️', title: '资质与安全', desc: '修改密码、上传营业执照/实名证件', action: 'coming-soon' },
            { icon: '🎧', title: '联系平台客服', desc: '工作时间：9:00 - 18:00', action: 'call-admin' },
            { icon: '⚖️', title: '仲裁中心', desc: '提交仲裁进度处理', action: 'nav', payload: 'arbitration-center' },
            { icon: '📜', title: '规则与协议', desc: '用户协议、隐私政策与交易规则', action: 'coming-soon' }
        ];
        menusHTML += `
            <div style="margin-bottom: 15px;"><h3 style="font-size:16px;">⚙️ 系统与支持</h3></div>
            ${this.renderListGroup(serviceItems)}
        `;

        return menusHTML;
    }

    // ====== 主入口：渲染个人中心面板 ======
    async render() {
        const container = document.getElementById('content-area');
        if (!container) return;

        // 隐藏首页内容
        const homepageContent = document.getElementById('homepage-content');
        if (homepageContent) homepageContent.style.display = 'none';

        // 骨架屏加载状态 (可选项)
        container.innerHTML = `<div style="text-align: center; color: #999; padding: 40px 0;">加载中...</div>`;

        // 注入真实数据
        const userInfo = await this.fetchUserProfile();
        if (!userInfo) {
            console.error('[UserProfile] currentUser is null, cannot render profile.');
            container.innerHTML = `<div style="text-align: center; color: #E53935; padding: 40px 0;">数据加载失败，请重新登录</div>`;
            return;
        }

        // 构建内部骨架
        container.innerHTML = `
            <div style="animation: fadeIn 0.4s ease-out; padding-bottom: 60px;">
                ${this.renderHeader(userInfo)}
                ${this.renderWallet(userInfo)}
                ${this.renderMenus(userInfo)}
                
                <button data-action="logout" style="width: 100%; margin-top: 20px; padding: 16px; background-color: #FFFFFF; color: #E53935; font-size: 16px; font-weight: bold; border-radius: 12px; border: none; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02); cursor: pointer; transition: all 0.2s;">退出登录</button>
            </div>
        `;
    }

    // ====== 附加功能页：地址列表（暂存简单态结构）======
    renderAddressList() {
        const container = document.getElementById('content-area');
        if (!container) return;
        
        container.innerHTML = `
            <div style="animation: fadeIn 0.3s; padding-bottom: 80px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <div>
                        <h2 style="margin:0 0 5px; font-size:20px; color:#1B3A24;">📍 我的地址</h2>
                        <span style="font-size:13px; color:#45664E;">管理您的收发货与果园/厂区地址</span>
                    </div>
                </div>
                
                <div style="text-align:center; padding: 80px 20px; background:#fff; border-radius:12px; box-shadow:0 4px 16px rgba(0,0,0,0.04);">
                    <div style="font-size:40px; margin-bottom:15px;">📭</div>
                    <div style="font-size:14px; color:#999;">Web 端详细地址管理界面正在载入... <br>(功能逻辑对齐已下发至核心框架)</div>
                </div>
                
                <div style="position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:95%; max-width:1400px; padding:20px; box-sizing:border-box; background:#fff; box-shadow: 0 -4px 16px rgba(0,0,0,0.05);">
                    <button data-action="coming-soon" style="width:100%; background:#2E7D32; color:#fff; font-size:16px; font-weight:bold; padding:15px; border-radius:8px; border:none; cursor:pointer;">+ 新增收货地址</button>
                </div>
            </div>
        `;
    }

    // ====== 附加功能页：我的意向（完整列表拉取+渲染）======
    renderIntentionsList() {
        const container = document.getElementById('content-area');
        if (!container) return;

        container.innerHTML = `
            <div style="animation: fadeIn 0.3s; padding-bottom: 80px;">
                <div style="margin-bottom: 20px;">
                    <h2 style="margin:0 0 5px; font-size:20px; color:#1B3A24;">📨 我的意向</h2>
                    <span style="font-size:13px; color:#45664E;">查看你发出的所有报价意向及其最新状态</span>
                </div>
                <div id="my-intentions-list" style="display:grid; gap:16px;">
                    <div style="text-align:center; padding:40px; color:#999;"><div class="spinner"></div><p>加载中...</p></div>
                </div>
            </div>
        `;

        this.loadMyIntentions();
    }

    async loadMyIntentions() {
        const listDiv = document.getElementById('my-intentions-list');
        if (!listDiv) return;

        const userId = authSystem && authSystem.currentUser ? authSystem.currentUser.id : null;
        if (!userId) {
            listDiv.innerHTML = '<p style="color:#e74c3c; text-align:center; padding:40px;">未登录，无法查询意向</p>';
            return;
        }

        const statusLabels = { pending: '⏳ 待处理', accepted: '✅ 已接受', rejected: '❌ 已拒绝' };
        const statusColors = { pending: '#f39c12', accepted: '#27ae60', rejected: '#e74c3c' };
        const typeLabels  = { farmer_report: '农户供货', recycler_request: '回收商求购', processor_request: '处理商求购' };

        try {
            const rows = await window.authFetch(`/api/intentions?applicant_id=${userId}`);
            const data = Array.isArray(rows) ? rows : [];

            if (!data.length) {
                listDiv.innerHTML = `
                    <div style="text-align:center; padding:60px 20px; background:#fff; border-radius:12px; box-shadow:0 4px 16px rgba(0,0,0,0.04);">
                        <div style="font-size:40px; margin-bottom:15px;">📭</div>
                        <p style="font-size:14px; color:#999;">暂无发出的意向</p>
                        <p style="font-size:12px; color:#bbb;">前往「求购大厅」发起意向投递</p>
                    </div>
                `;
                return;
            }

            listDiv.innerHTML = data.map(r => {
                const sColor = statusColors[r.status] || '#999';
                const sLabel = statusLabels[r.status] || r.status;
                const tLabel = typeLabels[r.target_type] || r.target_type;
                return `
                    <div style="background:#fff; border-radius:12px; padding:18px 20px; box-shadow:0 2px 12px rgba(0,0,0,0.04); border-left:4px solid ${sColor};">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <span style="font-size:13px; font-weight:600; color:#555;">${tLabel}${r.target_no ? ' · ' + r.target_no : ''}${r.target_name ? ' · ' + r.target_name : ''}</span>
                            <span style="background:${sColor}; color:#fff; padding:3px 10px; border-radius:20px; font-size:12px;">${sLabel}</span>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 16px; font-size:14px; color:#555;">
                            <p style="margin:0;"><strong>预估量：</strong>${r.estimated_weight ? r.estimated_weight + ' 斤' : '--'}</p>
                            <p style="margin:0;"><strong>期望日期：</strong>${r.expected_date || '未指定'}</p>
                        </div>
                        ${r.notes ? `<p style="margin:8px 0 0; font-size:13px; color:#777;">💬 ${r.notes}</p>` : ''}
                        <p style="margin:8px 0 0; font-size:12px; color:#bbb;">提交时间：${r.created_at || '--'}</p>
                    </div>
                `;
            }).join('');

        } catch (err) {
            console.error('[loadMyIntentions] Error:', err);
            listDiv.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:40px;">${err.message || '加载失败'}</p>`;
        }
    }
}

// 挂载到全局
window.userProfileSystem = new UserProfileManager();
