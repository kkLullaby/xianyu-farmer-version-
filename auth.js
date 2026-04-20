/**
 * 农业废品回收系统 - 身份认证与分流管理
 */

// ====== 身份信息管理 ======
// ====== 防飞单脱敏工具 ======
const fuzzPhone = (phone) => {
    if (!phone) return '暂无联系方式';
    return String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

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

    sanitizeRelativeAssetPath(value) {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        return trimmed.startsWith('/uploads/') ? trimmed : '';
    },

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    escapeJsSingleQuotedString(value) {
        return String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'");
    },

    getAuthToken() {
        return localStorage.getItem('agri_token') || this.currentUser?.token || '';
    },

    buildProtectedFileUrl(filePath) {
        if (typeof filePath !== 'string') return '';
        const normalized = filePath.trim();
        if (!normalized.startsWith('/')) return '';
        return `${this.API_BASE}${normalized}`;
    },

    async fetchProtectedFileBlob(filePath) {
        const fileUrl = this.buildProtectedFileUrl(filePath);
        if (!fileUrl) {
            throw new Error('文件路径无效，无法预览');
        }

        const headers = {};
        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(fileUrl, { headers });
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('请先登录后再查看文件');
            }
            if (response.status === 403) {
                throw new Error('无权访问该文件');
            }
            if (response.status === 404) {
                throw new Error('文件不存在或已被删除');
            }
            throw new Error(`文件加载失败（${response.status}）`);
        }

        return response.blob();
    },

    renderImagePreview(previewEl, imageUrl, maxWidth = 240) {
        if (!previewEl) return;
        previewEl.innerHTML = '';

        const safePath = this.sanitizeRelativeAssetPath(imageUrl);
        if (!safePath) {
            previewEl.style.display = 'none';
            return;
        }

        const img = document.createElement('img');
        img.src = `${this.API_BASE}${safePath}`;
        img.style.maxWidth = `${maxWidth}px`;
        img.style.borderRadius = '10px';
        img.style.border = '1px solid #eee';
        img.alt = '上传预览';

        previewEl.appendChild(img);
        previewEl.style.display = 'block';
    },

    renderPlaceholderPage(title, description) {
        const container = document.getElementById('content-area');
        if (!container) return;
        container.innerHTML = '';

        const heading = document.createElement('h2');
        heading.textContent = title;

        const desc = document.createElement('p');
        desc.textContent = description;

        container.appendChild(heading);
        container.appendChild(desc);
    },

    renderMyAccountPage() {
        const container = document.getElementById('content-area');
        if (!container) return;
        container.innerHTML = '';

        const heading = document.createElement('h2');
        heading.textContent = '👤 我的账户';

        const username = document.createElement('p');
        username.textContent = `用户名：${this.currentUser?.username || '--'}`;

        const fullName = document.createElement('p');
        fullName.textContent = `姓名：${this.currentUser?.name || '--'}`;

        const role = document.createElement('p');
        role.textContent = `身份：${this.getRoleLabel(this.currentUser?.role || '')}`;

        container.appendChild(heading);
        container.appendChild(username);
        container.appendChild(fullName);
        container.appendChild(role);
    },

    // ====== 个人中心（电商风格聚合入口）======
    showPersonalCenter() {
        // [Refactor] 逻辑已全面迁移至 userProfile.js
        if (typeof userProfileSystem !== 'undefined' && userProfileSystem.render) {
            userProfileSystem.render();
        } else {
            console.error('[authSystem] userProfileSystem is not loaded.');
            this.showAlert('系统升级加载中，请刷新页面', 'warning');
        }
    },

    // ====== 公告编辑中心（管理员）======
    showCmsCenter() {
        // 隐藏首页内容
        const homepageContent = document.getElementById('homepage-content');
        if (homepageContent) {
            homepageContent.style.display = 'none';
        }
        
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation: fadeIn 0.5s;">
                <h1 class="page-title">📰 公告编辑中心</h1>
                <p style="color: var(--text-medium); margin-top: -20px;">首页内容图像化编辑，支持政策公告、案例与广告位</p>

                <div style="display: flex; gap: 12px; border-bottom: 2px solid #eee; margin-bottom: 20px;">
                    <button class="cms-tab active" data-tab="ann" style="padding: 10px 18px; border: none; background: transparent; cursor: pointer; font-weight: bold; border-bottom: 3px solid #1565C0; color: #1565C0;">政策&公告</button>
                    <button class="cms-tab" data-tab="case" style="padding: 10px 18px; border: none; background: transparent; cursor: pointer; font-weight: bold; border-bottom: 3px solid transparent; color: #888;">成功案例</button>
                    <button class="cms-tab" data-tab="ad" style="padding: 10px 18px; border: none; background: transparent; cursor: pointer; font-weight: bold; border-bottom: 3px solid transparent; color: #888;">合作商广告</button>
                    <button class="cms-tab" data-tab="info" style="padding: 10px 18px; border: none; background: transparent; cursor: pointer; font-weight: bold; border-bottom: 3px solid transparent; color: #888;">底部信息</button>
                </div>

                <div id="cms-panel-ann" class="cms-panel">
                    <div class="glass-card" style="padding: 20px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 15px 0;">📝 新增/编辑公告</h3>
                        <form id="cms-ann-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <select id="cms-ann-type" required>
                                <option value="">选择类型</option>
                                <option value="policy">政策</option>
                                <option value="subsidy">补贴</option>
                                <option value="platform">平台公告</option>
                            </select>
                            <input type="text" id="cms-ann-title" placeholder="标题" required>
                            <input type="text" id="cms-ann-doc" placeholder="文件编号(可选)">
                            <input type="text" id="cms-ann-link" placeholder="链接(可选)">
                            <input type="number" id="cms-ann-sort" placeholder="排序(数字越小越靠前)">
                            <select id="cms-ann-active">
                                <option value="1">启用</option>
                                <option value="0">停用</option>
                            </select>
                            <textarea id="cms-ann-summary" placeholder="简要说明" style="grid-column: 1/-1; min-height: 70px;"></textarea>
                            <div style="grid-column: 1/-1; display: flex; gap: 12px; align-items: center;">
                                <input type="file" id="cms-ann-image" accept="image/*">
                                <button type="button" data-cms-form-action="upload-image" data-file-input-id="cms-ann-image" data-target-input-id="cms-ann-image-url" data-preview-id="cms-ann-preview" style="padding: 8px 14px; background: #1565C0; color: white; border: none; border-radius: 8px;">上传图片</button>
                                <input type="hidden" id="cms-ann-image-url">
                            </div>
                            <div id="cms-ann-preview" style="grid-column: 1/-1; display: none;"></div>
                            <div style="grid-column: 1/-1; display: flex; gap: 10px;">
                                <button type="submit" style="padding: 10px 16px; background: #2E7D32; color: white; border: none; border-radius: 8px;">保存公告</button>
                                <button type="button" data-cms-form-action="reset-form" data-cms-form-type="ann" style="padding: 10px 16px; background: #95a5a6; color: white; border: none; border-radius: 8px;">清空</button>
                            </div>
                        </form>
                    </div>
                    <div id="cms-ann-list"></div>
                </div>

                <div id="cms-panel-case" class="cms-panel" style="display:none;">
                    <div class="glass-card" style="padding: 20px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 15px 0;">🏆 新增/编辑案例</h3>
                        <form id="cms-case-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <input type="text" id="cms-case-title" placeholder="案例标题" required>
                            <input type="text" id="cms-case-trade" placeholder="交易数据(如20车一级柑肉)" required>
                            <input type="text" id="cms-case-buyer" placeholder="采购方(企业)" required>
                            <input type="text" id="cms-case-seller" placeholder="供货方" required>
                            <input type="number" id="cms-case-sort" placeholder="排序">
                            <select id="cms-case-active">
                                <option value="1">启用</option>
                                <option value="0">停用</option>
                            </select>
                            <textarea id="cms-case-desc" placeholder="案例说明" style="grid-column: 1/-1; min-height: 70px;"></textarea>
                            <div style="grid-column: 1/-1; display: flex; gap: 12px; align-items: center;">
                                <input type="file" id="cms-case-thumb" accept="image/*">
                                <button type="button" data-cms-form-action="upload-image" data-file-input-id="cms-case-thumb" data-target-input-id="cms-case-thumb-url" data-preview-id="cms-case-thumb-preview" style="padding: 8px 14px; background: #1565C0; color: white; border: none; border-radius: 8px;">上传缩略图</button>
                                <input type="hidden" id="cms-case-thumb-url">
                            </div>
                            <div id="cms-case-thumb-preview" style="grid-column: 1/-1; display: none;"></div>
                            <div style="grid-column: 1/-1; display: flex; gap: 12px; align-items: center;">
                                <input type="file" id="cms-case-logo" accept="image/*">
                                <button type="button" data-cms-form-action="upload-image" data-file-input-id="cms-case-logo" data-target-input-id="cms-case-logo-url" data-preview-id="cms-case-logo-preview" style="padding: 8px 14px; background: #2E7D32; color: white; border: none; border-radius: 8px;">上传Logo</button>
                                <input type="hidden" id="cms-case-logo-url">
                            </div>
                            <div id="cms-case-logo-preview" style="grid-column: 1/-1; display: none;"></div>
                            <div style="grid-column: 1/-1; display: flex; gap: 10px;">
                                <button type="submit" style="padding: 10px 16px; background: #2E7D32; color: white; border: none; border-radius: 8px;">保存案例</button>
                                <button type="button" data-cms-form-action="reset-form" data-cms-form-type="case" style="padding: 10px 16px; background: #95a5a6; color: white; border: none; border-radius: 8px;">清空</button>
                            </div>
                        </form>
                    </div>
                    <div id="cms-case-list"></div>
                </div>

                <div id="cms-panel-ad" class="cms-panel" style="display:none;">
                    <div class="glass-card" style="padding: 20px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 15px 0;">🤝 新增/编辑合作商广告</h3>
                        <form id="cms-ad-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <input type="text" id="cms-ad-title" placeholder="广告标题" required>
                            <input type="text" id="cms-ad-company" placeholder="企业名称" required>
                            <input type="text" id="cms-ad-contact" placeholder="联系方式" required>
                            <input type="text" id="cms-ad-badge" placeholder="标记(如官方认证合作商)">
                            <input type="number" id="cms-ad-sort" placeholder="排序">
                            <select id="cms-ad-active">
                                <option value="1">启用</option>
                                <option value="0">停用</option>
                            </select>
                            <textarea id="cms-ad-desc" placeholder="广告描述" style="grid-column: 1/-1; min-height: 70px;"></textarea>
                            <div style="grid-column: 1/-1; display: flex; gap: 12px; align-items: center;">
                                <input type="file" id="cms-ad-image" accept="image/*">
                                <button type="button" data-cms-form-action="upload-image" data-file-input-id="cms-ad-image" data-target-input-id="cms-ad-image-url" data-preview-id="cms-ad-preview" style="padding: 8px 14px; background: #1565C0; color: white; border: none; border-radius: 8px;">上传图片</button>
                                <input type="hidden" id="cms-ad-image-url">
                            </div>
                            <div id="cms-ad-preview" style="grid-column: 1/-1; display: none;"></div>
                            <div style="grid-column: 1/-1; display: flex; gap: 10px;">
                                <button type="submit" style="padding: 10px 16px; background: #2E7D32; color: white; border: none; border-radius: 8px;">保存广告</button>
                                <button type="button" data-cms-form-action="reset-form" data-cms-form-type="ad" style="padding: 10px 16px; background: #95a5a6; color: white; border: none; border-radius: 8px;">清空</button>
                            </div>
                        </form>
                    </div>
                    <div id="cms-ad-list"></div>
                </div>

                <div id="cms-panel-info" class="cms-panel" style="display:none;">
                    <div class="glass-card" style="padding: 20px;">
                        <h3 style="margin: 0 0 15px 0;">📌 底部信息编辑</h3>
                        <form id="cms-info-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <input type="text" id="cms-info-phone" placeholder="客服电话">
                            <input type="text" id="cms-info-license" placeholder="合规资质/备案编号">
                            <textarea id="cms-info-about" placeholder="平台简介(约100字)" style="grid-column: 1/-1; min-height: 90px;"></textarea>
                            <div style="grid-column: 1/-1;">
                                <button type="submit" style="padding: 10px 16px; background: #2E7D32; color: white; border: none; border-radius: 8px;">保存信息</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.bindCmsTabActions(container);
        this.bindCmsFormActions(container);

        this.cmsState = { annId: null, caseId: null, adId: null };
        this.loadCmsAnnouncements();
        this.loadCmsCases();
        this.loadCmsAds();
        this.loadCmsSiteInfo();

        const annForm = container.querySelector('#cms-ann-form');
        if (annForm) {
            annForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCmsAnnouncement();
            });
        }
        const caseForm = container.querySelector('#cms-case-form');
        if (caseForm) {
            caseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCmsCase();
            });
        }
        const adForm = container.querySelector('#cms-ad-form');
        if (adForm) {
            adForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCmsAd();
            });
        }
        const infoForm = container.querySelector('#cms-info-form');
        if (infoForm) {
            infoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCmsSiteInfo();
            });
        }
    },

    bindCmsTabActions(container) {
        if (!container) return;

        container.querySelectorAll('.cms-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.cms-tab').forEach(tabButton => {
                    tabButton.classList.remove('active');
                    tabButton.style.borderBottom = '3px solid transparent';
                    tabButton.style.color = '#888';
                });

                btn.classList.add('active');
                btn.style.borderBottom = '3px solid #1565C0';
                btn.style.color = '#1565C0';

                const tab = btn.dataset.tab;
                ['ann', 'case', 'ad', 'info'].forEach(panelType => {
                    const panel = container.querySelector(`#cms-panel-${panelType}`);
                    if (panel) panel.style.display = panelType === tab ? 'block' : 'none';
                });
            });
        });
    },

    bindCmsFormActions(container) {
        if (!container) return;

        container.querySelectorAll('[data-cms-form-action]').forEach(node => {
            const action = node.getAttribute('data-cms-form-action') || '';
            node.addEventListener('click', () => {
                if (action === 'upload-image') {
                    const fileInputId = node.getAttribute('data-file-input-id') || '';
                    const targetInputId = node.getAttribute('data-target-input-id') || '';
                    const previewId = node.getAttribute('data-preview-id') || '';

                    if (!fileInputId || !targetInputId || !previewId) {
                        this.showAlert('图片上传按钮配置缺失', 'warning');
                        return;
                    }

                    this.cmsUploadImage(fileInputId, targetInputId, previewId);
                    return;
                }

                if (action === 'reset-form') {
                    const formType = node.getAttribute('data-cms-form-type') || '';
                    if (!formType) {
                        this.showAlert('表单类型无效', 'warning');
                        return;
                    }
                    this.cmsResetForm(formType);
                }
            });
        });
    },

    bindCmsListActions(listContainer) {
        if (!listContainer) return;

        listContainer.querySelectorAll('[data-cms-list-action]').forEach(node => {
            const action = node.getAttribute('data-cms-list-action') || '';
            node.addEventListener('click', () => {
                const actionId = Number(node.getAttribute('data-cms-id') || '0');
                if (!Number.isInteger(actionId) || actionId <= 0) {
                    this.showAlert('CMS 记录 ID 无效', 'warning');
                    return;
                }

                if (action === 'edit-ann') {
                    this.fillCmsAnnouncement(actionId);
                    return;
                }
                if (action === 'delete-ann') {
                    this.deleteCmsAnnouncement(actionId);
                    return;
                }
                if (action === 'edit-case') {
                    this.fillCmsCase(actionId);
                    return;
                }
                if (action === 'delete-case') {
                    this.deleteCmsCase(actionId);
                    return;
                }
                if (action === 'edit-ad') {
                    this.fillCmsAd(actionId);
                    return;
                }
                if (action === 'delete-ad') {
                    this.deleteCmsAd(actionId);
                }
            });
        });
    },

    cmsResetForm(type) {
        if (type === 'ann') {
            this.cmsState.annId = null;
            document.getElementById('cms-ann-form').reset();
            document.getElementById('cms-ann-image-url').value = '';
            document.getElementById('cms-ann-preview').style.display = 'none';
        }
        if (type === 'case') {
            this.cmsState.caseId = null;
            document.getElementById('cms-case-form').reset();
            document.getElementById('cms-case-thumb-url').value = '';
            document.getElementById('cms-case-logo-url').value = '';
            document.getElementById('cms-case-thumb-preview').style.display = 'none';
            document.getElementById('cms-case-logo-preview').style.display = 'none';
        }
        if (type === 'ad') {
            this.cmsState.adId = null;
            document.getElementById('cms-ad-form').reset();
            document.getElementById('cms-ad-image-url').value = '';
            document.getElementById('cms-ad-preview').style.display = 'none';
        }
    },

    async cmsUploadImage(fileInputId, targetInputId, previewId) {
        const input = document.getElementById(fileInputId);
        if (!input || !input.files || input.files.length === 0) {
            return this.showAlert('请选择图片文件', 'warning');
        }
        const formData = new FormData();
        formData.append('file', input.files[0]);
        try {
            const token = localStorage.getItem('agri_token') || this.currentUser?.token;
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${this.API_BASE}/api/cms/upload`, { method: 'POST', headers, body: formData });
            const json = await res.json();
            // ✅ 兼容统一格式 { code, msg, data: { url } }
            if (json && json.code === 200 && json.data) {
                const imageUrl = this.sanitizeRelativeAssetPath(json.data.url);
                if (!imageUrl) {
                    throw new Error('上传返回了非法文件路径');
                }
                document.getElementById(targetInputId).value = imageUrl;
                const preview = document.getElementById(previewId);
                this.renderImagePreview(preview, imageUrl, 240);
                this.showAlert('图片上传成功', 'success');
            } else {
                throw new Error((json && (json.msg || json.error)) || '上传失败');
            }
        } catch (err) {
            this.showAlert(err.message, 'error');
        }
    },

    async loadCmsAnnouncements() {
        const list = document.getElementById('cms-ann-list');
        list.innerHTML = '<p style="color:#888;">加载中...</p>';
        const res = await this.authFetch(`/api/cms/announcements`);
        const json = res;
        // ✅ 兼容统一格式 { code, msg, data: [...] }
        const data = (json && json.code === 200 && Array.isArray(json.data)) ? json.data
                    : (Array.isArray(json) ? json : []);
        if (data.length === 0) {
            list.innerHTML = '<div class="glass-card" style="padding:20px;">暂无公告数据</div>';
            return;
        }
        list.innerHTML = data.map((item) => {
            const safeId = Number(item.id);
            if (!Number.isInteger(safeId) || safeId <= 0) return '';

            const safeImage = this.sanitizeRelativeAssetPath(item.image_url || '');
            const safeTitle = this.escapeHtml(item.title);
            const safeType = this.escapeHtml(item.type);
            const safeDocNo = this.escapeHtml(item.doc_number || '无编号');

            return `
                <div class="glass-card" style="padding: 16px; margin-bottom: 12px; display: flex; gap: 12px; align-items: center;">
                    ${safeImage ? `<img src="${this.API_BASE}${safeImage}" style="width:80px;height:60px;object-fit:cover;border-radius:8px;">` : '<div style="width:80px;height:60px;background:#f5f5f5;border-radius:8px;display:flex;align-items:center;justify-content:center;">📰</div>'}
                    <div style="flex:1;">
                        <div style="font-weight:bold;">${safeTitle}</div>
                        <div style="font-size:12px;color:#666;">${safeType} | ${safeDocNo} | ${item.is_active ? '启用' : '停用'}</div>
                    </div>
                    <button data-cms-list-action="edit-ann" data-cms-id="${safeId}" style="padding:6px 10px;">编辑</button>
                    <button data-cms-list-action="delete-ann" data-cms-id="${safeId}" style="padding:6px 10px; color:#e74c3c;">删除</button>
                </div>
            `;
        }).join('');

        this.bindCmsListActions(list);
    },

    fillCmsAnnouncement(id) {
        fetch(`${this.API_BASE}/api/cms/announcements`).then(r => r.json()).then(raw => {
            // ✅ 兼容统一格式
            const list = (raw && raw.code === 200 && Array.isArray(raw.data)) ? raw.data
                        : (Array.isArray(raw) ? raw : []);
            const item = list.find(i => i.id === id);
            if (!item) return;
            this.cmsState.annId = id;
            document.getElementById('cms-ann-type').value = item.type;
            document.getElementById('cms-ann-title').value = item.title;
            document.getElementById('cms-ann-summary').value = item.summary || '';
            document.getElementById('cms-ann-doc').value = item.doc_number || '';
            document.getElementById('cms-ann-link').value = item.link_url || '';
            document.getElementById('cms-ann-sort').value = item.sort_order || 0;
            document.getElementById('cms-ann-active').value = item.is_active ? '1' : '0';
            const annImage = this.sanitizeRelativeAssetPath(item.image_url || '');
            document.getElementById('cms-ann-image-url').value = annImage;
            const preview = document.getElementById('cms-ann-preview');
            this.renderImagePreview(preview, annImage, 240);
        });
    },

    async saveCmsAnnouncement() {
        const payload = {
            type: document.getElementById('cms-ann-type').value,
            title: document.getElementById('cms-ann-title').value,
            summary: document.getElementById('cms-ann-summary').value,
            doc_number: document.getElementById('cms-ann-doc').value,
            link_url: document.getElementById('cms-ann-link').value,
            sort_order: Number(document.getElementById('cms-ann-sort').value || 0),
            is_active: Number(document.getElementById('cms-ann-active').value || 1),
            image_url: document.getElementById('cms-ann-image-url').value,
            created_by: this.currentUser.id
        };
        const url = this.cmsState.annId ? `${this.API_BASE}/api/cms/announcements/${this.cmsState.annId}` : `${this.API_BASE}/api/cms/announcements`;
        const method = this.cmsState.annId ? 'PUT' : 'POST';
        const token = localStorage.getItem('agri_token') || this.currentUser?.token;
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) return this.showAlert(data.error || '保存失败', 'error');
        this.showAlert('公告已保存', 'success');
        this.cmsResetForm('ann');
        this.loadCmsAnnouncements();
        // 刷新首页内容
        if (typeof loadHomepageContent === 'function') {
            loadHomepageContent();
        }
    },

    async deleteCmsAnnouncement(id) {
        if (!confirm('确认删除该公告？')) return;
        const token = localStorage.getItem('agri_token') || this.currentUser?.token;
        const res = await fetch(`${this.API_BASE}/api/cms/announcements/${id}`, { method: 'DELETE', headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } });
        if (res.ok) { this.showAlert('已删除', 'success'); this.loadCmsAnnouncements(); }
    },

    async loadCmsCases() {
        const list = document.getElementById('cms-case-list');
        list.innerHTML = '<p style="color:#888;">加载中...</p>';
        const res = await this.authFetch(`/api/cms/cases`);
        const json = res;
        // ✅ 兼容统一格式 { code, msg, data: [...] }
        const data = (json && json.code === 200 && Array.isArray(json.data)) ? json.data
                    : (Array.isArray(json) ? json : []);
        if (data.length === 0) {
            list.innerHTML = '<div class="glass-card" style="padding:20px;">暂无案例数据</div>';
            return;
        }
        list.innerHTML = data.map((item) => {
            const safeId = Number(item.id);
            if (!Number.isInteger(safeId) || safeId <= 0) return '';

            const safeThumb = this.sanitizeRelativeAssetPath(item.thumbnail_url || '');
            const safeTitle = this.escapeHtml(item.title);
            const safeTradeData = this.escapeHtml(item.trade_data || '');

            return `
                <div class="glass-card" style="padding: 16px; margin-bottom: 12px; display: flex; gap: 12px; align-items: center;">
                    ${safeThumb ? `<img src="${this.API_BASE}${safeThumb}" style="width:80px;height:60px;object-fit:cover;border-radius:8px;">` : '<div style="width:80px;height:60px;background:#f5f5f5;border-radius:8px;display:flex;align-items:center;justify-content:center;">🏆</div>'}
                    <div style="flex:1;">
                        <div style="font-weight:bold;">${safeTitle}</div>
                        <div style="font-size:12px;color:#666;">${safeTradeData} | ${item.is_active ? '启用' : '停用'}</div>
                    </div>
                    <button data-cms-list-action="edit-case" data-cms-id="${safeId}" style="padding:6px 10px;">编辑</button>
                    <button data-cms-list-action="delete-case" data-cms-id="${safeId}" style="padding:6px 10px; color:#e74c3c;">删除</button>
                </div>
            `;
        }).join('');

        this.bindCmsListActions(list);
    },

    fillCmsCase(id) {
        fetch(`${this.API_BASE}/api/cms/cases`).then(r => r.json()).then(raw => {
            // ✅ 兼容统一格式
            const list = (raw && raw.code === 200 && Array.isArray(raw.data)) ? raw.data
                        : (Array.isArray(raw) ? raw : []);
            const item = list.find(i => i.id === id);
            if (!item) return;
            this.cmsState.caseId = id;
            document.getElementById('cms-case-title').value = item.title || '';
            document.getElementById('cms-case-trade').value = item.trade_data || '';
            document.getElementById('cms-case-buyer').value = item.buyer_name || '';
            document.getElementById('cms-case-seller').value = item.seller_name || '';
            document.getElementById('cms-case-sort').value = item.sort_order || 0;
            document.getElementById('cms-case-active').value = item.is_active ? '1' : '0';
            document.getElementById('cms-case-desc').value = item.description || '';
            const caseThumb = this.sanitizeRelativeAssetPath(item.thumbnail_url || '');
            const caseLogo = this.sanitizeRelativeAssetPath(item.logo_url || '');
            document.getElementById('cms-case-thumb-url').value = caseThumb;
            document.getElementById('cms-case-logo-url').value = caseLogo;
            const p1 = document.getElementById('cms-case-thumb-preview');
            this.renderImagePreview(p1, caseThumb, 240);
            const p2 = document.getElementById('cms-case-logo-preview');
            this.renderImagePreview(p2, caseLogo, 120);
        });
    },

    async saveCmsCase() {
        const payload = {
            title: document.getElementById('cms-case-title').value,
            trade_data: document.getElementById('cms-case-trade').value,
            buyer_name: document.getElementById('cms-case-buyer').value,
            seller_name: document.getElementById('cms-case-seller').value,
            sort_order: Number(document.getElementById('cms-case-sort').value || 0),
            is_active: Number(document.getElementById('cms-case-active').value || 1),
            description: document.getElementById('cms-case-desc').value,
            thumbnail_url: document.getElementById('cms-case-thumb-url').value,
            logo_url: document.getElementById('cms-case-logo-url').value,
            created_by: this.currentUser.id
        };
        const url = this.cmsState.caseId ? `${this.API_BASE}/api/cms/cases/${this.cmsState.caseId}` : `${this.API_BASE}/api/cms/cases`;
        const method = this.cmsState.caseId ? 'PUT' : 'POST';
        const token = localStorage.getItem('agri_token') || this.currentUser?.token;
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) return this.showAlert(data.error || '保存失败', 'error');
        this.showAlert('案例已保存', 'success');
        this.cmsResetForm('case');
        this.loadCmsCases();
        // 刷新首页内容
        if (typeof loadHomepageContent === 'function') {
            loadHomepageContent();
        }
    },

    async deleteCmsCase(id) {
        if (!confirm('确认删除该案例？')) return;
        const token = localStorage.getItem('agri_token') || this.currentUser?.token;
        const res = await fetch(`${this.API_BASE}/api/cms/cases/${id}`, { method: 'DELETE', headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } });
        if (res.ok) { this.showAlert('已删除', 'success'); this.loadCmsCases(); }
    },

    async loadCmsAds() {
        const list = document.getElementById('cms-ad-list');
        list.innerHTML = '<p style="color:#888;">加载中...</p>';
        const res = await this.authFetch(`/api/cms/ads`);
        const json = res;
        // ✅ 兼容统一格式 { code, msg, data: [...] }
        const data = (json && json.code === 200 && Array.isArray(json.data)) ? json.data
                    : (Array.isArray(json) ? json : []);
        if (data.length === 0) {
            list.innerHTML = '<div class="glass-card" style="padding:20px;">暂无广告数据</div>';
            return;
        }
        list.innerHTML = data.map((item) => {
            const safeId = Number(item.id);
            if (!Number.isInteger(safeId) || safeId <= 0) return '';

            const safeImage = this.sanitizeRelativeAssetPath(item.image_url || '');
            const safeTitle = this.escapeHtml(item.title);
            const safeCompany = this.escapeHtml(item.company_name || '');

            return `
                <div class="glass-card" style="padding: 16px; margin-bottom: 12px; display: flex; gap: 12px; align-items: center;">
                    ${safeImage ? `<img src="${this.API_BASE}${safeImage}" style="width:80px;height:60px;object-fit:cover;border-radius:8px;">` : '<div style="width:80px;height:60px;background:#f5f5f5;border-radius:8px;display:flex;align-items:center;justify-content:center;">🤝</div>'}
                    <div style="flex:1;">
                        <div style="font-weight:bold;">${safeTitle}</div>
                        <div style="font-size:12px;color:#666;">${safeCompany} | ${item.is_active ? '启用' : '停用'}</div>
                    </div>
                    <button data-cms-list-action="edit-ad" data-cms-id="${safeId}" style="padding:6px 10px;">编辑</button>
                    <button data-cms-list-action="delete-ad" data-cms-id="${safeId}" style="padding:6px 10px; color:#e74c3c;">删除</button>
                </div>
            `;
        }).join('');

        this.bindCmsListActions(list);
    },

    fillCmsAd(id) {
        fetch(`${this.API_BASE}/api/cms/ads`).then(r => r.json()).then(raw => {
            // ✅ 兼容统一格式
            const list = (raw && raw.code === 200 && Array.isArray(raw.data)) ? raw.data
                        : (Array.isArray(raw) ? raw : []);
            const item = list.find(i => i.id === id);
            if (!item) return;
            this.cmsState.adId = id;
            document.getElementById('cms-ad-title').value = item.title || '';
            document.getElementById('cms-ad-company').value = item.company_name || '';
            document.getElementById('cms-ad-contact').value = item.contact_info || '';
            document.getElementById('cms-ad-badge').value = item.badge || '';
            document.getElementById('cms-ad-sort').value = item.sort_order || 0;
            document.getElementById('cms-ad-active').value = item.is_active ? '1' : '0';
            document.getElementById('cms-ad-desc').value = item.description || '';
            const adImage = this.sanitizeRelativeAssetPath(item.image_url || '');
            document.getElementById('cms-ad-image-url').value = adImage;
            const p = document.getElementById('cms-ad-preview');
            this.renderImagePreview(p, adImage, 240);
        });
    },

    async saveCmsAd() {
        const payload = {
            title: document.getElementById('cms-ad-title').value,
            company_name: document.getElementById('cms-ad-company').value,
            contact_info: document.getElementById('cms-ad-contact').value,
            badge: document.getElementById('cms-ad-badge').value || '官方认证合作商',
            sort_order: Number(document.getElementById('cms-ad-sort').value || 0),
            is_active: Number(document.getElementById('cms-ad-active').value || 1),
            description: document.getElementById('cms-ad-desc').value,
            image_url: document.getElementById('cms-ad-image-url').value,
            created_by: this.currentUser.id
        };
        const url = this.cmsState.adId ? `${this.API_BASE}/api/cms/ads/${this.cmsState.adId}` : `${this.API_BASE}/api/cms/ads`;
        const method = this.cmsState.adId ? 'PUT' : 'POST';
        const token = localStorage.getItem('agri_token') || this.currentUser?.token;
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) return this.showAlert(data.error || '保存失败', 'error');
        this.showAlert('广告已保存', 'success');
        this.cmsResetForm('ad');
        this.loadCmsAds();
        // 刷新首页内容
        if (typeof loadHomepageContent === 'function') {
            loadHomepageContent();
        }
    },

    async deleteCmsAd(id) {
        if (!confirm('确认删除该广告？')) return;
        const token = localStorage.getItem('agri_token') || this.currentUser?.token;
        const res = await fetch(`${this.API_BASE}/api/cms/ads/${id}`, { method: 'DELETE', headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } });
        if (res.ok) { this.showAlert('已删除', 'success'); this.loadCmsAds(); }
    },

    async loadCmsSiteInfo() {
        const res = await this.authFetch(`/api/cms/site-info`);
        const json = res;
        // ✅ 兼容统一格式
        const info = (json && json.code === 200) ? (json.data || {}) : (json || {});
        if (info.phone) document.getElementById('cms-info-phone').value = info.phone;
        if (info.license) document.getElementById('cms-info-license').value = info.license;
        if (info.about) document.getElementById('cms-info-about').value = info.about;
    },

    async saveCmsSiteInfo() {
        const payload = {
            phone: document.getElementById('cms-info-phone').value,
            license: document.getElementById('cms-info-license').value,
            about: document.getElementById('cms-info-about').value
        };
        const token = localStorage.getItem('agri_token') || this.currentUser?.token;
        const res = await fetch(`${this.API_BASE}/api/cms/site-info`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) return this.showAlert(data.error || '保存失败', 'error');
        this.showAlert('底部信息已保存', 'success');
        // 保存成功后，刷新首页底部信息显示
        if (typeof loadHomepageContent === 'function') {
            loadHomepageContent();
        }
    },
    
    // 当前登录用户信息
    currentUser: null,

    /**
     * ✅ 统一 HTTP 请求封装 (authFetch)
     * - 自动从 currentUser 读取 JWT Token，注入 Authorization 头
     * - 自动解包后端统一格式 { code, msg, data }
     * - code !== 200 时，弹出 Toast(msg) 并 throw Error，阻断后续业务逻辑
     * @param {string} url       - 相对路径（/api/xxx）或完整 URL
     * @param {Object} options   - fetch 原始选项（method, body, headers 等）
     * @returns {Promise<any>}   - 成功时返回剥壳后的 data 字段
     */
    async authFetch(url, options = {}) {
        // ✅ 优先从 localStorage 读取持久化 Token，兜底从内存读
        const token = localStorage.getItem('agri_token') || this.currentUser?.token;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        // 不覆盖 FormData（文件上传场景）
        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        const fullUrl = url.startsWith('http') ? url : `${this.API_BASE}${url}`;
        const response = await fetch(fullUrl, { ...options, headers });

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const text = await response.text();
            // 404 不存在的端点：降级为 warn，不打断 UI
            if (response.status === 404) {
                console.warn(`[authFetch 404] 端点不存在: ${fullUrl}`);
                return null;
            }
            const msg = `服务器错误 (${response.status})`;
            this.showAlert(msg, 'error');
            throw new Error(`${msg}: ${text.slice(0, 120)}`);
        }

        const json = await response.json();

        // 识别后端统一格式 { code, msg, data }
        if (json && typeof json === 'object' && 'code' in json && 'data' in json) {
            if (json.code === 200) {
                return json.data;         // ✅ 剥壳，业务层直接拿数据
            } else if (json.code === 404) {
                // 404 JSON 格式：同样降级为 warn，不打断 UI
                console.warn(`[authFetch 404] ${fullUrl}:`, json.msg);
                return null;
            } else if (json.code === 401) {
                // ✅ 401：清除失效 token，引导重新登录，不弹通用 Toast（避免误报风暴）
                console.error('🚨 [401 Intercepted] 被拦截的 API 路径:', fullUrl, '\n完整响应:', json);
                localStorage.removeItem('agri_token');
                sessionStorage.removeItem('currentUser');
                this.currentUser = null;
                this.showAlert('登录已过期，请重新登录', 'warning');
                setTimeout(() => this.openLoginModal?.(), 1500);
                throw new Error('Unauthorized');
            } else {
                console.error('🚨 [authFetch Error] API 路径:', fullUrl, '\ncode:', json.code, '\nmsg:', json.msg, '\n完整响应:', json);
                const errMsg = json.msg || '请求失败';
                this.showAlert(errMsg, 'error');
                throw new Error(errMsg);  // 阻断执行
            }
        }

        // 兼容旧式裸返回（非 { code, msg, data } 格式）
        if (!response.ok) {
            console.error('🚨 [authFetch Non-OK] API 路径:', fullUrl, '\nHTTP Status:', response.status, '\n响应体:', json);
            const errMsg = (json && (json.error || json.msg)) || `请求失败 (${response.status})`;
            this.showAlert(errMsg, 'error');
            throw new Error(errMsg);
        }
        return json;
    },

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
        // ✅ 优先校验 localStorage 中的持久化 token 是否存在
        const storedToken = localStorage.getItem('agri_token');
        const savedUser = sessionStorage.getItem('currentUser');

        if (savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                // 若 sessionStorage 里的 currentUser 没有 token 字段（旧数据），清除 stale session
                if (!parsed.token && !storedToken) {
                    sessionStorage.removeItem('currentUser');
                    console.warn('[AuthSystem] Stale session without token cleared');
                    return;
                }
                // 用 localStorage 里的 token 补全（若内存中没有）
                if (!parsed.token && storedToken) {
                    parsed.token = storedToken;
                }
                this.currentUser = parsed;
                // 同步 token 到内存
                if (storedToken && !this.currentUser.token) {
                    this.currentUser.token = storedToken;
                }
                this.updateSidebar(this.currentUser.role);
                this.updateNavbar();
                this.syncCurrentUserFromServer();
            } catch (e) {
                sessionStorage.removeItem('currentUser');
                localStorage.removeItem('agri_token');
            }
            return;
        }

        if (storedToken) {
            this.currentUser = { token: storedToken };
            this.syncCurrentUserFromServer();
        }
    },

    async syncCurrentUserFromServer() {
        const token = this.getAuthToken();
        if (!token) return;

        try {
            const profile = await this.authFetch('/api/me');
            if (!profile || !profile.id || !profile.role) {
                throw new Error('用户信息无效');
            }

            this.currentUser = {
                id: profile.id,
                username: profile.username,
                role: profile.role,
                name: profile.full_name || profile.username,
                phone: profile.phone || '',
                token,
                loginTime: this.currentUser?.loginTime || new Date().toLocaleString('zh-CN')
            };

            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.updateSidebar(this.currentUser.role);
            this.updateNavbar();
        } catch (err) {
            console.warn('[AuthSystem] syncCurrentUserFromServer failed:', err.message);
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('agri_token');
            this.currentUser = null;
            this.updateNavbar();
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
        // 防止表单默认提交行为（如外部被 form 包裹时）
        try {
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!username || !password) {
                this.showAlert('请输入用户名和密码', 'warning');
                return;
            }

            const payload = { username, password };
            console.log('🚀 [Login] 发起登录请求，Payload:', payload, '\nAPI:', `${this.API_BASE}/api/login`);

            // ⚠️ 登录必须用原生 fetch，不能用 authFetch（未登录时无 Token）
            const response = await fetch(`${this.API_BASE}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log('📥 [Login] 接口返回 HTTP Status:', response.status, response.statusText);

            // 检查是否返回了 JSON
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ [Login] 服务器返回了非 JSON 响应:', text.slice(0, 200));
                this.showAlert(`服务器异常 (${response.status})，请检查后端是否启动`, 'error');
                return;
            }

            const data = await response.json();
            console.log('📦 [Login] 接口返回 Data:', data);

            // ✅ 后端统一格式：{ code, msg, data: { id, username, role, full_name, token } }
            //    兼容旧式裸返回（data 直接含字段）
            if (!response.ok) {
                const errMsg = (data && (data.msg || data.error)) || '登录失败';
                console.warn('⚠️ [Login] HTTP 非 2xx，错误信息:', errMsg);
                this.showAlert(errMsg, 'error');
                return;
            }

            const user = (data && data.data) ? data.data : data;
            console.log('👤 [Login] 解析后的 user 对象:', user);

            if (!user || !user.token) {
                console.error('❌ [Login] user 对象无效或缺少 token 字段！user:', user);
                this.showAlert('登录响应格式异常，请联系管理员', 'error');
                return;
            }

            // 登录成功，保存用户信息（含 token）
            this.currentUser = {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.full_name,
                token: user.token,
                loginTime: new Date().toLocaleString('zh-CN')
            };

            // ✅ 双重持久化：localStorage（跨标签/刷新）+ sessionStorage（向后兼容）
            localStorage.setItem('agri_token', user.token);
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            console.log('✅ [Login] Token 已写入 localStorage:', localStorage.getItem('agri_token')?.slice(0, 20) + '...');


            // 更新UI
            this.updateNavbar();

            // 显示欢迎信息
            this.showAlert(`登录成功！欢迎 ${this.currentUser.name}`, 'success');

            // 关闭登录弹窗
            this.closeLoginModal();

            // 更新侧边栏和用户信息，保持在首页
            this.updateSidebar(this.currentUser.role);

        } catch (err) {
            console.error('❌ [Login] 登录过程发生 JS 异常:', err);
            this.showAlert(`登录失败：${err.message || '未知错误，请查看控制台'}`, 'error');
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
            // ✅ 清除双重持久化存储
            localStorage.removeItem('agri_token');
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
        // 隐藏首页内容
        const homepageContent = document.getElementById('homepage-content');
        if (homepageContent) {
            homepageContent.style.display = 'none';
        }
        
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
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="user-management" style="padding: 24px; border-left: 6px solid var(--primary-green); cursor: pointer;">
                        <h3 style="color: var(--primary-green); margin: 0 0 10px 0;">👥 用户管理</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">管理所有用户账户，审核、禁用、删除等操作</p>
                        <button style="background: var(--primary-green); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">进入管理</button>
                    </div>
                    
                    <!-- 申报审核卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="audit-reports" style="padding: 24px; border-left: 6px solid var(--citrus-gold); cursor: pointer;">
                        <h3 style="color: var(--citrus-gold); margin: 0 0 10px 0;">📝 申报审核</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">审核农户的处理申报，核实处理数据和文件</p>
                        <button style="background: var(--citrus-gold); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">审核申报</button>
                    </div>
                    
                    <!-- 数据统计卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="data-stats" style="padding: 24px; border-left: 6px solid var(--primary-light); cursor: pointer;">
                        <h3 style="color: var(--primary-light); margin: 0 0 10px 0;">📈 数据统计</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看平台各类数据，处理量、用户活跃度等</p>
                        <button style="background: var(--primary-light); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">查看统计</button>
                    </div>

                    <!-- 公告编辑中心卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="cms-center" style="padding: 24px; border-left: 6px solid #1565C0; cursor: pointer;">
                        <h3 style="color: #1565C0; margin: 0 0 10px 0;">📰 公告编辑中心</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">编辑首页政策公告、案例展示与合作商推荐</p>
                        <button style="background: #1565C0; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">进入编辑</button>
                    </div>
                    
                    <!-- 系统设置卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="system-settings" style="padding: 24px; border-left: 6px solid var(--text-medium); cursor: pointer;">
                        <h3 style="color: var(--text-medium); margin: 0 0 10px 0;">⚙️ 系统设置</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">配置平台参数，管理处理点、费用等</p>
                        <button style="background: var(--text-medium); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">进入设置</button>
                    </div>
                    
                    <!-- 仲裁管理卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="arbitration-management" style="padding: 24px; border-left: 6px solid #e74c3c; cursor: pointer;">
                        <h3 style="color: #e74c3c; margin: 0 0 10px 0;">⚖️ 仲裁管理</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">处理订单纠纷，查看仲裁请求并做出裁决</p>
                        <button style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">进入管理</button>
                    </div>
                </div>
            </div>
        `;
        // 更新侧边栏
        this.updateSidebar('admin');
        this.bindDashboardActions(container);
    },
    
    // 农户仪表板
    showFarmerDashboard() {
        const container = document.getElementById('content-area');
        const safeDisplayName = this.escapeHtml(this.currentUser?.name || '用户');
        const safeLoginTime = this.escapeHtml(this.currentUser?.loginTime || '--');
        container.innerHTML = `
            <div style="animation: fadeIn 0.5s;">
                <h1 class="page-title">
                    🌾 农户工作台 - ${safeDisplayName}
                </h1>
                <p style="color: var(--text-medium); font-size: 14px; margin-top: -20px;">登录时间：${safeLoginTime}</p>
                
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
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="recycler-demands" style="padding: 24px; border-left: 6px solid var(--citrus-gold); cursor: pointer;">
                        <h3 style="color: var(--citrus-gold); margin: 0 0 10px 0;">📢 回收商求购</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看回收商发布的收购需求，寻找最佳买家</p>
                        <button style="background: var(--citrus-gold); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">查看求购</button>
                    </div>

                    <!-- 发起新申报卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="new-report" style="padding: 24px; border-left: 6px solid var(--citrus-orange); cursor: pointer;">
                        <h3 style="color: var(--citrus-orange); margin: 0 0 10px 0;">📝 发起申报</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">申报新的柑肉处理，获取处理凭证和记录</p>
                        <button style="background: var(--citrus-orange); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">新建申报</button>
                    </div>
                    
                    <!-- 申报历史卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="my-reports" style="padding: 24px; border-left: 6px solid var(--citrus-gold); cursor: pointer;">
                        <h3 style="color: var(--citrus-gold); margin: 0 0 10px 0;">📋 申报记录</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看所有申报历史，跟踪申报状态</p>
                        <button style="background: var(--citrus-gold); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">查看记录</button>
                    </div>
                    
                    <!-- 附近处理点查询卡片 -->
                    <div class="glass-card" data-dashboard-action="open-nearby" style="padding: 24px; border-left: 6px solid var(--primary-light); cursor: pointer;">
                        <h3 style="color: var(--primary-light); margin: 0 0 10px 0;">🌍 附近处理点</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查找距离最近的处理点，实时显示最近的回收商</p>
                        <button style="background: var(--primary-light); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">查找处理点</button>
                    </div>
                    
                    <!-- 我的账户卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="my-account" style="padding: 24px; border-left: 6px solid var(--text-medium); cursor: pointer;">
                        <h3 style="color: var(--text-medium); margin: 0 0 10px 0;">👤 我的账户</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">管理账户信息，修改密码和隐私设置</p>
                        <button style="background: var(--text-medium); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">管理账户</button>
                    </div>
                    
                    <!-- 仲裁中心卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="arbitration-center" style="padding: 24px; border-left: 6px solid #e74c3c; cursor: pointer;">
                        <h3 style="color: #e74c3c; margin: 0 0 10px 0;">⚖️ 仲裁中心</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">提出订单仲裁申请，查看仲裁进度和结果</p>
                        <button style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">进入中心</button>
                    </div>
                </div>
            </div>
        `;
        // 更新侧边栏
        this.updateSidebar('farmer');
        this.bindDashboardActions(container);
        // 检查并显示未读消息红点
        setTimeout(() => this.updateRequestUnreadBadge(), 100);
    },
    
    // 回收商仪表板
    showRecyclerDashboard() {
        const container = document.getElementById('content-area');
        const safeDisplayName = this.escapeHtml(this.currentUser?.name || '用户');
        const safeLoginTime = this.escapeHtml(this.currentUser?.loginTime || '--');
        container.innerHTML = `
            <div style="animation: fadeIn 0.5s;">
                <h1 class="page-title">
                    ♻️ 回收商工作台 - ${safeDisplayName}
                </h1>
                <p style="color: var(--text-medium); font-size: 14px; margin-top: -20px;">登录时间：${safeLoginTime}</p>
                
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
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="farmer-supplies" style="padding: 24px; border-left: 6px solid var(--primary-green); cursor: pointer;">
                        <h3 style="color: var(--primary-green); margin: 0 0 10px 0;">🌾 农户供应</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看农户发布的供应信息，寻找优质货源</p>
                        <button style="background: var(--primary-green); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">查看供应</button>
                    </div>

                    <!-- 发布求购卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="publish-demand" style="padding: 24px; border-left: 6px solid var(--citrus-orange); cursor: pointer;">
                        <h3 style="color: var(--citrus-orange); margin: 0 0 10px 0;">📢 发布求购</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">发布收购需求，吸引农户投资</p>
                        <button style="background: var(--citrus-orange); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">新建求购</button>
                    </div>
                    
                    <!-- 订单管理卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="my-orders" style="padding: 24px; border-left: 6px solid var(--citrus-gold); cursor: pointer;">
                        <h3 style="color: var(--citrus-gold); margin: 0 0 10px 0;">📦 订单管理</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看和管理订单，跟踪交易进度</p>
                        <button style="background: var(--citrus-gold); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">管理订单</button>
                    </div>
                    
                    <!-- 处理商需求卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="processor-demands" style="padding: 24px; border-left: 6px solid var(--primary-light); cursor: pointer;">
                        <h3 style="color: var(--primary-light); margin: 0 0 10px 0;">🏭 处理商需求</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看处理商发布的求购需求，对接处理商</p>
                        <button style="background: var(--primary-light); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">查看需求</button>
                    </div>
                    
                    <!-- 财务中心卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="finance" style="padding: 24px; border-left: 6px solid var(--text-dark); cursor: pointer;">
                        <h3 style="color: var(--text-dark); margin: 0 0 10px 0;">💰 财务中心</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看账单和收款，管理账户余额</p>
                        <button style="background: var(--text-dark); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">财务管理</button>
                    </div>
                    
                    <!-- 我的账户卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="my-account" style="padding: 24px; border-left: 6px solid var(--text-medium); cursor: pointer;">
                        <h3 style="color: var(--text-medium); margin: 0 0 10px 0;">👤 我的账户</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">管理账户信息，修改密码和企业信息</p>
                        <button style="background: var(--text-medium); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">管理账户</button>
                    </div>
                    
                    <!-- 仲裁中心卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="arbitration-center" style="padding: 24px; border-left: 6px solid #e74c3c; cursor: pointer;">
                        <h3 style="color: #e74c3c; margin: 0 0 10px 0;">⚖️ 仲裁中心</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">提出订单仲裁申请，查看仲裁进度和结果</p>
                        <button style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">进入中心</button>
                    </div>
                </div>
            </div>
        `;
        // 更新侧边栏
        this.updateSidebar('recycler');
        this.bindDashboardActions(container);
        // 检查并显示未读消息红点
        setTimeout(() => this.updateRequestUnreadBadge(), 100);
    },
    
    // 果肉处理商仪表板
    showProcessorDashboard() {
        const container = document.getElementById('content-area');
        const safeDisplayName = this.escapeHtml(this.currentUser?.name || '用户');
        const safeLoginTime = this.escapeHtml(this.currentUser?.loginTime || '--');
        container.innerHTML = `
            <div style="animation: fadeIn 0.5s;">
                <h1 class="page-title">
                    🏭 处理商工作台 - ${safeDisplayName}
                </h1>
                <p style="color: var(--text-medium); font-size: 14px; margin-top: -20px;">登录时间：${safeLoginTime}</p>
                
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
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="supply-sources" style="padding: 24px; border-left: 6px solid var(--primary-light); cursor: pointer;">
                        <h3 style="color: var(--primary-light); margin: 0 0 10px 0;">🌾 货源供应</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">查看农户和回收商发布的货源信息，批量采购原料</p>
                        <button style="background: var(--primary-light); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">寻找货源</button>
                    </div>

                    <!-- 发布求购卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="publish-demand" style="padding: 24px; border-left: 6px solid var(--citrus-orange); cursor: pointer;">
                        <h3 style="color: var(--citrus-orange); margin: 0 0 10px 0;">📢 发布求购</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">发布原料收购需求，对接回收商</p>
                        <button style="background: var(--citrus-orange); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">新建求购</button>
                    </div>
                    
                    <!-- 订单管理卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="my-orders" style="padding: 24px; border-left: 6px solid var(--citrus-gold); cursor: pointer;">
                        <h3 style="color: var(--citrus-gold); margin: 0 0 10px 0;">📦 订单管理</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">管理采购订单，跟踪物流与入库</p>
                        <button style="background: var(--citrus-gold); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">管理订单</button>
                    </div>
                    
                    <!-- 我的账户卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="my-account" style="padding: 24px; border-left: 6px solid var(--text-medium); cursor: pointer;">
                        <h3 style="color: var(--text-medium); margin: 0 0 10px 0;">👤 我的账户</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">管理企业资质，修改密码和联系人信息</p>
                        <button style="background: var(--text-medium); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">管理账户</button>
                    </div>
                    
                    <!-- 仲裁中心卡片 -->
                    <div class="glass-card" data-dashboard-action="navigate" data-dashboard-page="arbitration-center" style="padding: 24px; border-left: 6px solid #e74c3c; cursor: pointer;">
                        <h3 style="color: #e74c3c; margin: 0 0 10px 0;">⚖️ 仲裁中心</h3>
                        <p style="color: var(--text-medium); font-size: 14px;">提出订单仲裁申请，查看仲裁进度和结果</p>
                        <button style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">进入中心</button>
                    </div>
                </div>
            </div>
        `;
        // 更新侧边栏
        this.updateSidebar('processor');
        this.bindDashboardActions(container);
    },
    
    // ====== 辅助函数 ======
    
    // 更新导航栏（显示登录状态）
    updateNavbar() {
        const loginBtn = document.querySelector('.btn-login');
        const authButtons = document.querySelector('.auth-buttons');

        if (loginBtn && loginBtn.dataset.authNavbarBound !== '1') {
            loginBtn.dataset.authNavbarBound = '1';
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = loginBtn.dataset.authNavbarAction || '';
                if (action === 'logout') {
                    this.logout();
                    return;
                }
                if (action === 'open-login') {
                    this.openLoginModal();
                }
            });
        }
        
        if (this.currentUser) {
            // 已登录状态
            loginBtn.textContent = `👤 ${this.currentUser.name}`;
            loginBtn.style.color = '#1abc9c';
            loginBtn.style.border = '1px solid #1abc9c';
            loginBtn.dataset.authNavbarAction = 'logout';
            
            // 隐藏注册按钮
            const signupBtn = document.querySelector('.btn-signup');
            if (signupBtn) signupBtn.style.display = 'none';
        } else {
            // 未登录状态
            loginBtn.textContent = '登录';
            loginBtn.style.color = '#1abc9c';
            loginBtn.style.border = '1px solid #1abc9c';
            loginBtn.dataset.authNavbarAction = 'open-login';
            
            // 显示注册按钮
            const signupBtn = document.querySelector('.btn-signup');
            if (signupBtn) signupBtn.style.display = 'block';
        }
    },

    bindDashboardActions(container) {
        if (!container) return;

        container.querySelectorAll('[data-dashboard-action]').forEach(node => {
            const action = node.getAttribute('data-dashboard-action') || '';
            node.addEventListener('click', (event) => {
                event.preventDefault();

                if (action === 'navigate') {
                    const page = node.getAttribute('data-dashboard-page') || '';
                    if (page) this.navigateTo(page);
                    return;
                }

                if (action === 'open-nearby') {
                    window.location.href = 'farmer-nearby-recyclers.html';
                }
            });
        });
    },

    bindSidebarActions(navList) {
        if (!navList) return;

        navList.querySelectorAll('[data-nav-action]').forEach(node => {
            const action = node.getAttribute('data-nav-action') || '';
            node.addEventListener('click', (event) => {
                event.preventDefault();

                if (action === 'navigate') {
                    const page = node.getAttribute('data-nav-page') || '';
                    if (page) this.navigateTo(page);
                    return;
                }

                if (action === 'logout') {
                    this.logout();
                }
            });
        });
    },
    
    // 更新侧边栏（根据身份显示不同菜单）
    updateSidebar(role) {
        let menuHTML = '';
        
        if (role === 'admin') {
            menuHTML = `
                <li><a href="#" data-nav-action="navigate" data-nav-page="homepage">🏠 我的首页</a></li>
                <li><a href="#" data-nav-action="navigate" data-nav-page="dashboard">📊 管理工作台</a></li>
                <li><a href="#" data-nav-action="navigate" data-nav-page="personal-center">🧭 个人中心</a></li>
                <li style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 20px;"><a href="#" data-nav-action="logout">🚪 退出登录</a></li>
            `;
        } else if (role === 'farmer') {
            menuHTML = `
                <li><a href="#" data-nav-action="navigate" data-nav-page="homepage">🏠 我的首页</a></li>
                <li><a href="#" data-nav-action="navigate" data-nav-page="personal-center">🧭 个人中心</a></li>
                <li style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 20px;"><a href="#" data-nav-action="logout">🚪 退出登录</a></li>
            `;
        } else if (role === 'recycler') {
            menuHTML = `
                <li><a href="#" data-nav-action="navigate" data-nav-page="homepage">🏠 我的首页</a></li>
                <li><a href="#" data-nav-action="navigate" data-nav-page="personal-center">🧭 个人中心</a></li>
                <li style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 20px;"><a href="#" data-nav-action="logout">🚪 退出登录</a></li>
            `;
        } else if (role === 'processor') {
            menuHTML = `
                <li><a href="#" data-nav-action="navigate" data-nav-page="homepage">🏠 我的首页</a></li>
                <li><a href="#" data-nav-action="navigate" data-nav-page="personal-center">🧭 个人中心</a></li>
                <li style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 20px;"><a href="#" data-nav-action="logout">🚪 退出登录</a></li>
            `;
        }
        
        const navList = document.querySelector('.nav-list');
        if (navList) {
            navList.innerHTML = menuHTML;
            this.bindSidebarActions(navList);
        }
    },
    
    // 页面导航
    navigateTo(page) {
        // ✅ 路由守卫：除首页外，所有内页必须已登录
        const publicPages = ['homepage'];
        if (!publicPages.includes(page) && !this.currentUser) {
            this.showAlert('请先登录后再操作', 'warning');
            this.openLoginModal();
            return;
        }

        const container = document.getElementById('content-area');
        const homepageContent = document.getElementById('homepage-content');
        
        // 处理首页内容的显示/隐藏
        if (page === 'homepage') {
            // 清空容器的所有动态内容
            container.innerHTML = '';
            // 重新创建首页内容容器
            const newHomepage = document.createElement('div');
            newHomepage.id = 'homepage-content';
            newHomepage.style.animation = 'fadeIn 0.6s';
            container.appendChild(newHomepage);
            
            // 从页面中恢复首页HTML（如果存在备份）或重新加载
            fetch(window.location.href).then(r => r.text()).then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const homepage = doc.getElementById('homepage-content');
                if (homepage) {
                    newHomepage.innerHTML = homepage.innerHTML;
                    // 重新加载首页数据
                    if (typeof loadHomepageContent === 'function') {
                        loadHomepageContent();
                    }
                }
            }).catch(() => {
                // 如果获取失败，重新加载整个页面
                window.location.href = window.location.origin;
            });
            return;
        } else {
            // 隐藏首页内容，显示其他页面
            if (homepageContent) {
                homepageContent.style.display = 'none';
            }
        }
        
        const pages = {
            'dashboard': () => this.redirectToDashboard(),
            'user-management': () => {
                this.renderPlaceholderPage('👥 用户管理', '用户列表将显示在这里...（正在开发中）');
            },
            'audit-reports': () => {
                this.renderPlaceholderPage('📝 申报审核', '申报审核列表将显示在这里...（正在开发中）');
            },
            'new-report': () => {
                this.showNewReportForm();
            },
            'my-reports': () => {
                this.showMyReports();
            },
            'processing-points': () => {
                this.renderPlaceholderPage('🗺️ 处理点查询', '处理点列表将显示在这里...（正在开发中）');
            },
            'my-account': () => {
                this.renderMyAccountPage();
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
                    this.renderPlaceholderPage('📦 订单管理', '您的订单列表将显示在这里...（正在开发中）');
                }
            },
            'partner-farmers': () => {
                this.renderPlaceholderPage('🤝 合作农户', '合作农户列表将显示在这里...（正在开发中）');
            },
            'processor-demands': () => {
                this.showProcessorDemands();
            },
            'finance': () => {
                this.renderPlaceholderPage('💰 财务中心', '财务信息将显示在这里...（正在开发中）');
            },
            'data-stats': () => {
                this.renderPlaceholderPage('📈 数据统计', '统计数据将显示在这里...（正在开发中）');
            },
            'cms-center': () => {
                this.showCmsCenter();
            },
            'system-settings': () => {
                this.renderPlaceholderPage('⚙️ 系统设置', '系统设置界面将显示在这里...（正在开发中）');
            },
            'recycler-demands': () => {
                this.showRecyclerDemands();
            },
            'recycler-supplies': () => {
                this.renderPlaceholderPage('♻️ 回收商供应', '回收商供应列表将显示在这里...（正在开发中）');
            },
            'supply-sources': () => {
                this.showSupplySources();
            },
            'farmer-supplies': () => {
                this.showFarmerSupplies();
            },
            'personal-center': () => {
                this.showPersonalCenter();
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
        const safeReportId = report && Number.isFinite(Number(report.id)) ? String(Number(report.id)) : '';
        const safePickupDate = this.escapeHtml(report ? (report.pickup_date || '') : '');
        const safeWeight = this.escapeHtml(report ? (report.weight_kg ?? '') : '');
        const safeLocation = this.escapeHtml(report ? (report.location_address || '') : '');
        const safeLat = this.escapeHtml(report && report.location_lat ? report.location_lat : '');
        const safeLng = this.escapeHtml(report && report.location_lng ? report.location_lng : '');
        const safeVariety = this.escapeHtml(report ? (report.citrus_variety || '') : '');
        const safeContactName = this.escapeHtml(report ? (report.contact_name || '') : (this.currentUser?.name || ''));
        const safeContactPhone = this.escapeHtml(report ? (report.contact_phone || '') : '');
        const safeNotes = this.escapeHtml(report ? (report.notes || '') : '');

        container.innerHTML = `
            <div style="max-width:700px;margin:0 auto;animation:fadeIn 0.5s;">
                <h1 class="page-title">${title}</h1>
                <form id="farmer-report-form" style="margin-top:30px;">
                    ${isEdit && safeReportId ? `<input type="hidden" name="report_id" value="${safeReportId}">` : ''}
                    <div style="margin-bottom:18px;">
                        <label>回收日期 <span style='color:#e67e22;'>*</span></label>
                        <input type="date" name="pickup_date" required value="${safePickupDate}" style="width:100%;">
                    </div>
                    <div style="margin-bottom:18px;">
                        <label>回收重量（斤） <span style='color:#e67e22;'>*</span></label>
                        <input type="number" name="weight_kg" min="1" required placeholder="请输入重量" value="${safeWeight}" style="width:100%;">
                    </div>
                    <div style="margin-bottom:18px;">
                        <label>收获地点 <span style='color:#e67e22;'>*</span></label>
                        <input type="text" name="location_address" required placeholder="如：陈皮镇××村" value="${safeLocation}" style="width:100%;">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
                        <div>
                            <label>纬度（可选）</label>
                            <input type="number" step="0.000001" name="location_lat" value="${safeLat}" style="width:100%;">
                        </div>
                        <div>
                            <label>经度（可选）</label>
                            <input type="number" step="0.000001" name="location_lng" value="${safeLng}" style="width:100%;">
                        </div>
                    </div>
                    <div style="margin-bottom:18px;">
                        <label>柑橘品种 <span style='color:#e67e22;'>*</span></label>
                        <input type="text" name="citrus_variety" required placeholder="如：新会大红柑" value="${safeVariety}" style="width:100%;">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
                        <div>
                            <label>联系人 <span style='color:#e67e22;'>*</span></label>
                            <input type="text" name="contact_name" required value="${safeContactName}" style="width:100%;">
                        </div>
                        <div>
                            <label>联系电话 <span style='color:#e67e22;'>*</span></label>
                            <input type="text" name="contact_phone" required placeholder="手机号" value="${safeContactPhone}" style="width:100%;">
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
                            <button type="button" data-report-form-action="toggle-grade-info" style="padding:16px; border:1px solid #ddd; background:white; border-radius:12px; cursor:pointer;">
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
                        <textarea name="notes" rows="3" placeholder="可填写处理过程、注意事项等" style="width:100%;">${safeNotes}</textarea>
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

        const gradeInfo = document.getElementById('grade-info');
        const gradeToggleBtn = container.querySelector('[data-report-form-action="toggle-grade-info"]');
        if (gradeToggleBtn && gradeInfo) {
            gradeToggleBtn.addEventListener('click', () => {
                gradeInfo.style.display = gradeInfo.style.display === 'none' ? 'block' : 'none';
            });
        }

        const farmerReportForm = document.getElementById('farmer-report-form');
        if (farmerReportForm) {
            farmerReportForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitFarmerReport('pending', report ? report.id : null, defaultPhotos);
            });
        }
        const saveDraftBtn = document.getElementById('btn-save-draft');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => {
                this.submitFarmerReport('draft', report ? report.id : null, defaultPhotos);
            });
        }
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
            await this.authFetch(`/api/farmer-reports`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            this.showAlert(status === 'draft' ? '草稿已保存' : '申报已发布', 'success');
            setTimeout(() => this.navigateTo('my-reports'), 1000);
        } catch (err) {
            console.error('Submit report error:', err);
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
                // ✅ 使用 authFetch：自动注入 Token + 自动剥壳 { code, msg, data }
                const rows = await this.authFetch(`/api/farmer-reports?farmer_id=${this.currentUser.id}&status=${status}`);
                const data = Array.isArray(rows) ? rows : [];
                if (!data.length) {
                    listDiv.innerHTML = '<p style="color:#888;">暂无申报记录</p>';
                    return;
                }
                listDiv.innerHTML = data.map(r => {
                    const safeId = Number(r.id);
                    const idAttr = Number.isFinite(safeId) && safeId > 0 ? String(safeId) : '';
                    const recyclerId = Number(r.recycler_id);
                    const uidAttr = Number.isFinite(recyclerId) && recyclerId > 0 ? String(recyclerId) : '';
                    const safeReportNo = this.escapeHtml(r.report_no || '');
                    const safeStatus = this.escapeHtml(this.getReportStatusLabel(r.status));
                    const safeCreatedAt = this.escapeHtml(r.created_at || '--');
                    const safePickupDate = this.escapeHtml(r.pickup_date || '--');
                    const safeWeight = this.escapeHtml(r.weight_kg ?? '--');
                    const safeVariety = this.escapeHtml(r.citrus_variety || '--');
                    const safeAddress = this.escapeHtml(r.location_address || '--');

                    return `
                    <div class="glass-card" style="padding:18px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                            <div>
                                <strong>${safeReportNo}</strong>
                                <span style="margin-left:10px;padding:3px 10px;border-radius:12px;font-size:12px;background:#f1f2f6;color:#2d3436;">${safeStatus}</span>
                            </div>
                            <div style="font-size:13px;color:#888;">${safeCreatedAt}</div>
                        </div>
                        <div style="margin-top:10px;font-size:14px;color:#555;line-height:1.7;">
                            回收日期：${safePickupDate} ｜ 重量：${safeWeight} 斤 ｜ 品种：${safeVariety}<br>
                            地址：${safeAddress}
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                            ${r.status === 'accepted' && idAttr && uidAttr ? `<button data-action="intention" data-id="${idAttr}" data-uid="${uidAttr}" style="background:var(--citrus-orange);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">📋 发起意向</button>` : ''}
                            ${r.status === 'draft' && idAttr ? `<button data-action="publish" data-id="${idAttr}" style="background:var(--primary-green);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">发布</button>` : ''}
                            ${(r.status === 'draft' || r.status === 'pending') && idAttr ? `<button data-action="edit" data-id="${idAttr}" style="background:#74b9ff;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">编辑</button>` : ''}
                            ${r.status === 'draft' && idAttr ? `<button data-action="delete" data-id="${idAttr}" style="background:#fab1a0;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">删除</button>` : ''}
                        </div>
                    </div>
                `;
                }).join('');
                this.bindReportActions(data);
            } catch (err) {
                listDiv.innerHTML = `<p style="color:#e74c3c;">${this.escapeHtml(err.message || '加载失败')}</p>`;
            }
        };

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.style.opacity = '0.6');
                btn.style.opacity = '1';
                loadReports(btn.dataset.status);
            });
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
                    const farmerData = await this.authFetch(`/api/farmer-supplies`);
                    if (Array.isArray(farmerData) && farmerData.length) {
                        allItems = allItems.concat(farmerData.map(r => ({...r, source_type: 'farmer'})));
                    }
                }
                
                // 获取回收商供应（这里需要有对应的API）
                if (source === 'all' || source === 'recycler') {
                    try {
                        const recyclerData = await this.authFetch(`/api/recycler-supplies`);
                        if (Array.isArray(recyclerData) && recyclerData.length) {
                            allItems = allItems.concat(recyclerData.map(r => ({...r, source_type: 'recycler'})));
                        }
                    } catch(e) { /* ignore if no recycler supplies */ }
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
                    const safeName = this.escapeHtml(isFarmer ? (r.farmer_name || '农户') : (r.recycler_name || '回收商'));
                    const safeNo = this.escapeHtml(r.report_no || r.supply_no || '');
                    const safeCreatedAt = this.escapeHtml(r.created_at || '--');
                    const safePickupDate = this.escapeHtml(r.pickup_date || '--');
                    const safeWeight = this.escapeHtml(r.weight_kg ?? '--');
                    const safeVariety = this.escapeHtml(r.citrus_variety || '--');
                    const safeGrade = this.escapeHtml(this.getGradeLabel(r.grade));
                    const safeStockWeight = this.escapeHtml(r.stock_weight ?? '--');
                    const safeAddress = this.escapeHtml(r.location_address || r.address || '未填写');
                    const safeNotes = this.escapeHtml(r.notes || '');
                    const recordId = Number(r.id);
                    const safeRecordId = Number.isFinite(recordId) && recordId > 0 ? String(recordId) : '';
                    const userId = Number(isFarmer ? r.farmer_id : r.recycler_id);
                    const safeUserId = Number.isFinite(userId) && userId > 0 ? String(userId) : '';
                    
                    return `
                        <div class="glass-card" style="padding:18px;margin-bottom:16px;border-left:4px solid ${borderColor};">
                            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                                <div>
                                    <span style="background:${sourceBg};color:${borderColor};padding:4px 10px;border-radius:12px;font-size:12px;font-weight:bold;">${sourceLabel}</span>
                                    <strong style="margin-left:8px;">${safeName}</strong>
                                    <span style="margin-left:8px;font-size:12px;color:#888;">${safeNo}</span>
                                </div>
                                <div style="font-size:12px;color:#888;">${safeCreatedAt}</div>
                            </div>
                            <div style="margin-top:12px;background:#f9f9f9;padding:12px;border-radius:8px;">
                                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;font-size:14px;color:#555;">
                                    ${isFarmer ? `
                                        <div>📅 回收日期：${safePickupDate}</div>
                                        <div>⚖️ 重量：<strong style="color:var(--citrus-orange);">${safeWeight} 斤</strong></div>
                                        <div>🍊 品种：${safeVariety}</div>
                                    ` : `
                                        <div>🏷️ 品级：${safeGrade}</div>
                                        <div>⚖️ 库存：<strong style="color:var(--primary-light);">${safeStockWeight} 斤</strong></div>
                                    `}
                                    <div>📍 地址：${safeAddress}</div>
                                </div>
                                ${safeNotes ? `<div style="margin-top:8px;font-size:13px;color:#888;">备注：${safeNotes}</div>` : ''}
                            </div>
                            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                                ${safeRecordId ? `<button data-source-action="intention" data-id="${safeRecordId}" data-uid="${safeUserId}" data-type="${r.source_type}" style="background:${borderColor};color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;">💬 联系${isFarmer ? '农户' : '回收商'}</button>` : ''}
                                <span style="background:#74b9ff;color:#fff;border:none;border-radius:6px;padding:8px 16px;">📞 电话</span>
                                ${isFarmer && r.status === 'pending' && safeRecordId ? `<button data-source-action="accept" data-id="${safeRecordId}" data-type="farmer" style="background:#2ecc71;color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;">✅ 接单</button>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
                
                // 绑定按钮事件
                document.querySelectorAll('[data-source-action]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const action = btn.dataset.sourceAction;
                        const id = btn.dataset.id;
                        const type = btn.dataset.type;
                        const uid = btn.dataset.uid;
                        
                        if (action === 'chat' || action === 'intention') {
                            const typeMap = { farmer: 'farmer_report', recycler: 'recycler_request' };
                            this.openIntentionModal({ target_type: typeMap[type] || 'farmer_report', target_id: id, target_no: '', target_name: type === 'farmer' ? '农户供货' : '回收商货源' });
                        } else if (action === 'accept' && type === 'farmer') {
                            if (!confirm('确认接单该货源？')) return;
                            try {
                                const resp = await this.authFetch(`/api/farmer-reports/${id}/accept`, {
                                    method: 'POST',
                                    body: JSON.stringify({ processor_id: this.currentUser.id })
                                });
                                        this.showAlert('🎉 接单成功！', 'success');
                                loadSources(source);
                            } catch (err) {
                                this.showAlert(err.message, 'error');
                            }
                        }
                    });
                });
                
            } catch (err) {
                listDiv.innerHTML = `<p style="color:#e74c3c;">${this.escapeHtml(err.message || '加载失败')}</p>`;
            }
        };
        
        // 绑定Tab切换
        document.querySelectorAll('.supply-source-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.supply-source-tab').forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'white';
                    t.style.color = t.dataset.source === 'farmer' ? 'var(--citrus-orange)' : (t.dataset.source === 'recycler' ? 'var(--primary-light)' : 'var(--primary-green)');
                });
                tab.classList.add('active');
                tab.style.background = tab.dataset.source === 'farmer' ? 'var(--citrus-orange)' : (tab.dataset.source === 'recycler' ? 'var(--primary-light)' : 'var(--primary-green)');
                tab.style.color = 'white';
                loadSources(tab.dataset.source);
            });
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
                const rows = await this.authFetch(`/api/farmer-supplies?${params.toString()}`);
                const data = Array.isArray(rows) ? rows : [];
                if (!data.length) {
                    listDiv.innerHTML = '<p style="color:#888;">暂无供应信息</p>';
                    return;
                }
                listDiv.innerHTML = data.map(r => {
                    const safeFarmer = this.escapeHtml(r.farmer_name || '农户');
                    const safeReportNo = this.escapeHtml(r.report_no || '');
                    const safeCreatedAt = this.escapeHtml(r.created_at || '--');
                    const safePickupDate = this.escapeHtml(r.pickup_date || '--');
                    const safeWeight = this.escapeHtml(r.weight_kg ?? '--');
                    const safeVariety = this.escapeHtml(r.citrus_variety || '--');
                    const safeAddress = this.escapeHtml(r.location_address || '--');
                    const distanceText = (r.distance !== null && r.distance !== undefined)
                        ? this.escapeHtml(this.formatDistance(r.distance))
                        : '';
                    const safeId = Number(r.id);
                    const idAttr = Number.isFinite(safeId) && safeId > 0 ? String(safeId) : '';
                    const safeFarmerId = Number(r.farmer_id);
                    const uidAttr = Number.isFinite(safeFarmerId) && safeFarmerId > 0 ? String(safeFarmerId) : '';
                    return `
                    <div class="glass-card" style="padding:18px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                            <div>
                                <strong>${safeFarmer}</strong>
                                <span style="margin-left:8px;font-size:12px;color:#888;">${safeReportNo}</span>
                            </div>
                            <div style="font-size:13px;color:#888;">${safeCreatedAt}</div>
                        </div>
                        <div style="margin-top:10px;font-size:14px;color:#555;line-height:1.7;">
                            回收日期：${safePickupDate} ｜ 重量：${safeWeight} 斤 ｜ 品种：${safeVariety}<br>
                            地址：${safeAddress}
                            ${distanceText ? `<br>距离：${distanceText}` : ''}
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                            ${r.status === 'accepted' && idAttr && uidAttr ? `<button data-supply-action="intention" data-id="${idAttr}" data-uid="${uidAttr}" style="background:var(--citrus-orange);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">📋 发起意向</button>`:''}
                            ${r.status === 'pending' && idAttr ? `<button data-supply-action="accept" data-id="${idAttr}" style="background:var(--primary-green);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">接单</button>` : `<span style='color:#2ecc71;font-weight:bold;'>✔ 已接单</span>`}
                            <span style="background:#74b9ff;color:#fff;border:none;border-radius:6px;padding:6px 14px;">📞 电话</span>
                        </div>
                    </div>
                `;
                }).join('');
                this.bindSupplyActions(data);
            } catch (err) {
                listDiv.innerHTML = `<p style="color:#e74c3c;">${this.escapeHtml(err.message || '加载失败')}</p>`;
            }
        };

        document.getElementById('btn-refresh-supplies').addEventListener('click', loadSupplies);
        document.getElementById('supply-sort').addEventListener('change', loadSupplies);
        loadSupplies();
    },

    bindSupplyActions(list) {
        document.querySelectorAll('[data-supply-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.supplyAction;
                const id = btn.dataset.id;
                const item = list.find(r => String(r.id) === String(id));
                if (!item) return;

                if (action === 'accept') {
                    if (!confirm('确认接单该农户供应？')) return;
                    try {
                        await this.authFetch(`/api/farmer-reports/${id}/status`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: 'accepted', recycler_id: this.currentUser.id })
                            });
                        this.showAlert('接单成功', 'success');
                        this.showFarmerSupplies();
                    } catch (err) {
                        this.showAlert(err.message, 'error');
                    }
                } else if (action === 'chat' || action === 'intention') {
                    this.openIntentionModal({ target_type: 'farmer_report', target_id: id, target_no: '', target_name: '农户供货' });
                }
            });
        });
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
                        <button data-demand-entry-action="navigate" data-demand-entry-page="publish-demand" style="padding:10px 20px;background:var(--citrus-orange);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">+ 发布新求购</button>
                    </div>
                    <div id="my-demands-list"></div>
                </div>
            </div>
        `;

        this.bindDemandEntryActions(container);

        // 标签页切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
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
            });
        });

        const loadOrders = async (status = 'all') => {
            const listDiv = document.getElementById('order-list');
            listDiv.innerHTML = '<p style="color:#888;">加载中...</p>';
            try {
                // ✅ 使用 authFetch：自动注入 Token + 自动剥壳 { code, msg, data }
                let url = `/api/farmer-reports?recycler_id=${this.currentUser.id}`;
                if (status !== 'all') url += `&status=${status}`;
                const rows = await this.authFetch(url);
                const data = Array.isArray(rows) ? rows : [];
                
                if (!data.length) {
                    listDiv.innerHTML = '<p style="color:#888;">暂无订单记录</p>';
                    return;
                }
                listDiv.innerHTML = data.map(r => {
                    const safeReportNo = this.escapeHtml(r.report_no || '');
                    const safeStatus = this.escapeHtml(this.getReportStatusLabel(r.status));
                    const safeCreatedAt = this.escapeHtml(r.created_at || '--');
                    const safeFarmerName = this.escapeHtml(r.farmer_name || '未知');
                    const safeFarmerPhone = this.escapeHtml(fuzzPhone(r.farmer_phone || ''));
                    const safePickupDate = this.escapeHtml(r.pickup_date || '--');
                    const safeWeight = this.escapeHtml(r.weight_kg ?? '--');
                    const safeVariety = this.escapeHtml(r.citrus_variety || '--');
                    const safeAddress = this.escapeHtml(r.location_address || '--');
                    const safeId = Number(r.id);
                    const idAttr = Number.isFinite(safeId) && safeId > 0 ? String(safeId) : '';
                    const safeFarmerId = Number(r.farmer_id);
                    const uidAttr = Number.isFinite(safeFarmerId) && safeFarmerId > 0 ? String(safeFarmerId) : '';

                    return `
                    <div class="glass-card" style="padding:18px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                            <div>
                                <strong>单号: ${safeReportNo}</strong>
                                <span style="margin-left:10px;padding:3px 10px;border-radius:12px;font-size:12px;background:#f1f2f6;color:#2d3436;">${safeStatus}</span>
                            </div>
                            <div style="font-size:13px;color:#888;">${safeCreatedAt}</div>
                        </div>
                        <div style="margin-top:10px;font-size:14px;color:#555;line-height:1.7;">
                            <strong>农户:</strong> ${safeFarmerName} (${safeFarmerPhone})<br>
                            回收日期：${safePickupDate} ｜ 重量：${safeWeight} 斤 ｜ 品种：${safeVariety}<br>
                            地址：${safeAddress}
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                             ${r.status === 'accepted' && idAttr ? `
                                 <button data-order-action="complete" data-id="${idAttr}" style="background:var(--primary-green);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">✅ 完成交易</button>
                                 ${uidAttr ? `<button data-order-action="intention" data-id="${idAttr}" data-uid="${uidAttr}" style="background:var(--citrus-orange);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">📋 发起意向</button>` : ''}
                             ` : ''}
                             ${r.status === 'completed' && idAttr && uidAttr ? `
                                 <button data-order-action="intention" data-id="${idAttr}" data-uid="${uidAttr}" style="background:var(--citrus-orange);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">💬 历史消息</button>
                             ` : ''}
                             <span style="background:#74b9ff;color:#fff;border:none;border-radius:6px;padding:6px 14px;">📞 电话</span>
                        </div>
                    </div>
                `;
                }).join('');
                
                this.bindRecyclerOrderActions(data, loadOrders, status);

            } catch (err) {
                listDiv.innerHTML = `<p style="color:#e74c3c;">${this.escapeHtml(err.message || '加载失败')}</p>`;
            }
        };

        // 加载回收商接单的处理商订单
        const loadProcessorOrders = async () => {
            const listDiv = document.getElementById('processor-order-list');
            listDiv.innerHTML = '<p style="color:#888;">加载中...</p>';
            
            try {
                const rows = await this.authFetch(`/api/processor-requests?recycler_id=${this.currentUser.id}`);
                const data = Array.isArray(rows) ? rows : [];
                
                if (!data || data.length === 0) {
                    listDiv.innerHTML = '<p style="color:#888;">暂无处理商订单，前往<a href="#" data-demand-entry-action="navigate" data-demand-entry-page="processor-demands" style="color:var(--primary-green);">处理商需求</a>接单</p>';
                    this.bindDemandEntryActions(listDiv);
                    return;
                }

                const gradeLabels = { 'grade1': '一级品', 'grade2': '二级品', 'grade3': '三级品', 'offgrade': '等外级', 'any': '不限品级' };
                const citrusLabels = { 'mandarin': '柑橘', 'orange': '橙子', 'pomelo': '柚子', 'tangerine': '橘子', 'any': '不限种类' };

                listDiv.innerHTML = data.map(r => {
                    const safeProcessorName = this.escapeHtml(r.processor_name || '处理商');
                    const safeGrade = this.escapeHtml(gradeLabels[r.grade] || '未知品级');
                    const safeCitrus = this.escapeHtml(citrusLabels[r.citrus_type] || '未知种类');
                    const safeRequestNo = this.escapeHtml(r.request_no || '--');
                    const safeWeight = this.escapeHtml(r.weight_kg ?? '--');
                    const safeTransport = this.escapeHtml(r.has_transport ? '可上门收货' : '需送货到厂');
                    const safeLocation = this.escapeHtml(r.location_address || '--');
                    const safeContactName = this.escapeHtml(r.contact_name || '--');
                    const safeContactPhone = this.escapeHtml(fuzzPhone(r.contact_phone || ''));
                    const safeId = Number(r.id);
                    const idAttr = Number.isFinite(safeId) && safeId > 0 ? String(safeId) : '';
                    const safeProcessorId = Number(r.processor_id);
                    const uidAttr = Number.isFinite(safeProcessorId) && safeProcessorId > 0 ? String(safeProcessorId) : '';

                    return `
                    <div class="glass-card" style="padding:18px;margin-bottom:16px;border-left:4px solid #9b59b6;">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                            <div>
                                <span style="background:#9b59b6;color:white;padding:3px 10px;border-radius:12px;font-size:12px;">🏭 ${safeProcessorName}</span>
                                <span style="margin-left:8px;padding:3px 10px;border-radius:12px;font-size:12px;background:#f0e6ff;color:#9b59b6;">${safeGrade} ${safeCitrus}</span>
                            </div>
                            <div style="font-size:12px;color:#999;">编号: ${safeRequestNo}</div>
                        </div>
                        <div style="margin-top:12px;background:#f5f0ff;padding:12px;border-radius:8px;">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;">
                                <p style="margin:0;"><strong>需求量：</strong><span style="color:#9b59b6;font-weight:bold;">${safeWeight} 斤</span></p>
                                <p style="margin:0;"><strong>运输：</strong>${safeTransport}</p>
                                <p style="margin:0;grid-column:1/-1;"><strong>收货地址：</strong>${safeLocation}</p>
                            </div>
                        </div>
                        <div style="margin-top:10px;font-size:14px;color:#555;">
                            <strong>联系人：</strong>${safeContactName} | ${safeContactPhone}
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                            ${idAttr && uidAttr ? `<button data-processor-order-action="intention" data-id="${idAttr}" data-uid="${uidAttr}" style="background:#9b59b6;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">📋 发起意向</button>` : ''}
                            <span style="background:#74b9ff;color:#fff;border:none;border-radius:6px;padding:6px 14px;">📞 电话</span>
                        </div>
                    </div>
                `;
                }).join('');
                
                // 绑定处理商订单操作
                listDiv.querySelectorAll('[data-processor-order-action]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const action = btn.dataset.processorOrderAction;
                        const id = btn.dataset.id;
                        const uid = btn.dataset.uid;
                        if (action === 'chat' || action === 'intention') {
                            this.openIntentionModal({ target_type: 'processor_request', target_id: id, target_no: '', target_name: '处理商求购' });
                        }
                    });
                });
            } catch (err) {
                listDiv.innerHTML = `<p style="color:#e74c3c;">${this.escapeHtml(err.message || '加载失败')}</p>`;
            }
        };

        const loadMyDemands = async () => {
            const listDiv = document.getElementById('my-demands-list');
            listDiv.innerHTML = '<p style="color:#888;">加载中...</p>';
            
            try {
                // ✅ 使用 authFetch：自动注入 Token + 自动剥壳 { code, msg, data }
                const rows = await this.authFetch(`/api/recycler-requests?recycler_id=${this.currentUser.id}`);
                const data = Array.isArray(rows) ? rows : [];
                
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
                    const safeGrade = this.escapeHtml(gradeLabels[r.grade] || '不限品级');
                    const safeStatus = this.escapeHtml(statusLabels[r.status] || r.status || '未知状态');
                    const safeRequestNo = this.escapeHtml(r.request_no || '--');
                    const safeContactName = this.escapeHtml(r.contact_name || '--');
                    const safeContactPhone = this.escapeHtml(fuzzPhone(r.contact_phone || ''));
                    const safeNotes = this.escapeHtml(r.notes || '');
                    const safeValidUntil = this.escapeHtml(r.valid_until || '');
                    const validText = safeValidUntil ? 
                        `至 ${safeValidUntil}` : 
                        '<span style="color:var(--primary-green);">长期有效</span>';
                    const safeId = Number(r.id);
                    const idAttr = Number.isFinite(safeId) && safeId > 0 ? String(safeId) : '';
                    
                    return `
                        <div class="glass-card" style="padding:20px;margin-bottom:16px;">
                            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
                                <div>
                                    <span style="background:var(--citrus-orange);color:white;padding:4px 12px;border-radius:20px;font-size:14px;margin-right:10px;">
                                        ${safeGrade}
                                    </span>
                                    <span style="background:#95a5a6;color:white;padding:4px 12px;border-radius:20px;font-size:13px;">
                                        ${safeStatus}
                                    </span>
                                </div>
                                <div style="text-align:right;font-size:12px;color:#999;">
                                    ${validText}<br>
                                    编号: ${safeRequestNo}
                                </div>
                            </div>
                            
                            <div style="background:#f9f9f9;padding:12px;border-radius:8px;margin-bottom:12px;">
                                <p style="margin:4px 0;"><strong>联系人：</strong>${safeContactName}</p>
                                <p style="margin:4px 0;"><strong>联系电话：</strong>${safeContactPhone}</p>
                                ${safeNotes ? `<p style="margin:4px 0;"><strong>备注：</strong>${safeNotes}</p>` : ''}
                            </div>
                            
                            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                                ${r.status === 'draft' ? `
                                    ${idAttr ? `<button data-demand-action="edit" data-id="${idAttr}" style="background:var(--primary-green);color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">✏️ 编辑</button>` : ''}
                                    ${idAttr ? `<button data-demand-action="delete" data-id="${idAttr}" style="background:#e74c3c;color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">🗑️ 删除</button>` : ''}
                                ` : ''}
                                ${r.status === 'active' ? `
                                    ${idAttr ? `<button data-demand-action="intention" data-id="${idAttr}" style="background:var(--citrus-orange);color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">💬 查看咨询</button>` : ''}
                                    ${idAttr ? `<button data-demand-action="cancel" data-id="${idAttr}" style="background:#f39c12;color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">⏸️ 取消发布</button>` : ''}
                                ` : ''}
                                ${r.status === 'cancelled' ? `
                                    ${idAttr ? `<button data-demand-action="reactivate" data-id="${idAttr}" style="background:var(--primary-green);color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">▶️ 重新发布</button>` : ''}
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                // 绑定求购操作按钮 - 只绑定my-demands-list中的按钮
                listDiv.querySelectorAll('[data-demand-action]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const action = btn.dataset.demandAction;
                        const id = btn.dataset.id;
                        
                        if (action === 'edit') {
                            const item = this.currentDemands.find(d => String(d.id) === String(id));
                            this.showPublishDemandForm(item);
                        } else if (action === 'chat' || action === 'intention') {
                            // 回收商查看求购收到的意向
                            this.viewIntentions('recycler_request', id, '');
                        } else if (action === 'delete') {
                            if (!confirm('确定删除这条求购信息？')) return;
                            try {
                                await this.authFetch(`/api/recycler-requests/${id}?recycler_id=${this.currentUser.id}`, { method: 'DELETE' });
                                this.showAlert('已删除', 'success');
                                loadMyDemands();
                            } catch (err) {
                                this.showAlert(err.message, 'error');
                            }
                        } else if (action === 'cancel' || action === 'reactivate') {
                            const newStatus = action === 'cancel' ? 'cancelled' : 'active';
                            try {
                                await this.authFetch(`/api/recycler-requests/${id}/status`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ status: newStatus, recycler_id: this.currentUser.id })
                                    });
                                this.showAlert('状态已更新', 'success');
                                loadMyDemands();
                            } catch (err) {
                                this.showAlert(err.message, 'error');
                            }
                        }
                    });
                });

            } catch (err) {
                listDiv.innerHTML = `<p style="color:#e74c3c;">${this.escapeHtml(err.message || '加载失败')}</p>`;
            }
        };
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                 document.querySelectorAll('.filter-btn').forEach(b => b.style.opacity = '0.6');
                 btn.style.opacity = '1';
                 loadOrders(btn.dataset.status);
            });
        });
        
        loadOrders('all');
    },

    bindRecyclerOrderActions(list, refreshCb, currentStatus) {
        document.querySelectorAll('[data-order-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.orderAction;
                const id = btn.dataset.id;
                const item = list.find(r => String(r.id) === String(id));
                if (!item) return;

                if (action === 'chat' || action === 'intention') {
                    this.openIntentionModal({ target_type: 'farmer_report', target_id: id, target_no: item ? item.report_no : '', target_name: item ? (item.farmer_name || '农户') + '供货' : '农户供货' });
                } else if (action === 'complete') {
                    if(!confirm('确认与农户已完成交易？订单状态将设为“已完成”')) return;
                    try {
                         const resp = await this.authFetch(`/api/farmer-reports/${id}/status`, {
                             method: 'PATCH',
                             body: JSON.stringify({ status: 'completed' })
                         });
                        this.showAlert('订单已完成', 'success');
                        if (refreshCb) refreshCb(currentStatus);
                    } catch(e) {
                        this.showAlert(e.message, 'error');
                    }
                }
            });
        });
    },
    
    // 处理商订单管理
    async showProcessorOrders() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div style="animation:fadeIn 0.5s;">
                <h1 class="page-title">📦 我的求购</h1>
                <div style="margin:20px 0;">
                    <button data-demand-entry-action="navigate" data-demand-entry-page="publish-demand" style="padding:10px 20px;background:#9b59b6;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">+ 发布新求购</button>
                </div>
                <div id="processor-orders-list"></div>
            </div>
        `;
        this.bindDemandEntryActions(container);
        this.loadProcessorOrders();
    },

    async loadProcessorOrders() {
        const listDiv = document.getElementById('processor-orders-list');
        listDiv.innerHTML = '<p style="color:#888;">加载中...</p>';
        
        try {
            console.log('[loadProcessorOrders] Fetching for processor_id:', this.currentUser.id);
            const data = await this.authFetch(`/api/processor-requests?processor_id=${this.currentUser.id}`);
            console.log('[loadProcessorOrders] Response:', data);
            
            this.currentProcessorDemands = data;
            
            if (!data.length) {
                listDiv.innerHTML = '<p style="color:#888;">暂无求购信息，点击上方按钮发布</p>';
                return;
            }

            const gradeLabels = { 'grade1': '一级品', 'grade2': '二级品', 'grade3': '三级品', 'offgrade': '等外级', 'any': '不限品级' };
            const citrusLabels = { 'mandarin': '柑橘', 'orange': '橙子', 'pomelo': '柚子', 'tangerine': '橘子', 'any': '不限种类' };
            const statusLabels = { 'draft': '草稿', 'active': '生效中', 'cancelled': '已取消', 'expired': '已过期' };

            listDiv.innerHTML = data.map(r => {
                const safeGrade = this.escapeHtml(gradeLabels[r.grade] || '不限品级');
                const safeCitrus = this.escapeHtml(citrusLabels[r.citrus_type] || '不限种类');
                const safeStatus = this.escapeHtml(statusLabels[r.status] || r.status || '未知状态');
                const safeValidUntil = this.escapeHtml(r.valid_until || '');
                const validText = safeValidUntil ? `至 ${safeValidUntil}` : '<span style="color:var(--primary-green);">长期有效</span>';
                const safeRequestNo = this.escapeHtml(r.request_no || '--');
                const safeWeight = this.escapeHtml(r.weight_kg ?? '--');
                const safeLocation = this.escapeHtml(r.location_address || '--');
                const safeContactName = this.escapeHtml(r.contact_name || '--');
                const safeContactPhone = this.escapeHtml(fuzzPhone(r.contact_phone || ''));
                const safeNotes = this.escapeHtml(r.notes || '');
                const safeId = Number(r.id);
                const idAttr = Number.isFinite(safeId) && safeId > 0 ? String(safeId) : '';

                return `
                    <div class="glass-card" style="padding:20px;margin-bottom:16px;border-left:4px solid #9b59b6;">
                        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
                            <div>
                                <span style="background:#9b59b6;color:white;padding:4px 12px;border-radius:20px;font-size:14px;margin-right:8px;">${safeGrade}</span>
                                <span style="background:#f0e6ff;color:#9b59b6;padding:4px 10px;border-radius:20px;font-size:13px;margin-right:8px;">${safeCitrus}</span>
                                <span style="background:#95a5a6;color:white;padding:4px 12px;border-radius:20px;font-size:13px;">${safeStatus}</span>
                            </div>
                            <div style="text-align:right;font-size:12px;color:#999;">${validText}<br>编号: ${safeRequestNo}</div>
                        </div>
                        <div style="background:#f5f0ff;padding:14px;border-radius:8px;margin-bottom:12px;">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                <p style="margin:4px 0;"><strong>需求量：</strong><span style="color:#9b59b6;font-weight:bold;">${safeWeight} 斤</span></p>
                                <p style="margin:4px 0;"><strong>运输：</strong>${r.has_transport ? '<span style="color:var(--primary-green);">可上门收货</span>' : '需送货到厂'}</p>
                            </div>
                            <p style="margin:4px 0;"><strong>收货地址：</strong>${safeLocation}</p>
                            <p style="margin:4px 0;"><strong>联系人：</strong>${safeContactName} | ${safeContactPhone}</p>
                            ${safeNotes ? `<p style="margin:4px 0;"><strong>备注：</strong>${safeNotes}</p>` : ''}
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;">
                            ${r.status === 'draft' ? `
                                ${idAttr ? `<button data-processor-action="edit" data-id="${idAttr}" style="background:#9b59b6;color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">✏️ 编辑</button>` : ''}
                                ${idAttr ? `<button data-processor-action="publish" data-id="${idAttr}" style="background:var(--primary-green);color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">📢 发布</button>` : ''}
                                ${idAttr ? `<button data-processor-action="delete" data-id="${idAttr}" style="background:#e74c3c;color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">🗑️ 删除</button>` : ''}
                            ` : ''}
                            ${r.status === 'active' ? `
                                ${idAttr ? `<button data-processor-action="chat" data-id="${idAttr}" style="background:#9b59b6;color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">💬 查看咨询</button>` : ''}
                                ${idAttr ? `<button data-processor-action="cancel" data-id="${idAttr}" style="background:#f39c12;color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">⏸️ 取消发布</button>` : ''}
                            ` : ''}
                            ${r.status === 'cancelled' && idAttr ? `<button data-processor-action="reactivate" data-id="${idAttr}" style="background:var(--primary-green);color:white;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;">▶️ 重新发布</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            this.bindProcessorOrderActions();
        } catch (err) {
            listDiv.innerHTML = `<p style="color:#e74c3c;">${this.escapeHtml(err.message || '加载失败')}</p>`;
        }
    },
    
    bindProcessorOrderActions() {
        document.getElementById('processor-orders-list')?.querySelectorAll('[data-processor-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.processorAction;
                const id = btn.dataset.id;
                
                if (action === 'edit') {
                    const item = this.currentProcessorDemands.find(d => String(d.id) === String(id));
                    this.showPublishDemandForm(item);
                } else if (action === 'chat') {
                    const demand = this.currentProcessorDemands ? this.currentProcessorDemands.find(d => String(d.id) === String(id)) : null;
                    this.viewIntentions('processor_request', id, demand ? demand.request_no : '');
                } else if (action === 'delete') {
                    if (!confirm('确定删除这条求购信息？')) return;
                    try {
                        await this.authFetch(`/api/processor-requests/${id}?processor_id=${this.currentUser.id}`, { method: 'DELETE' });
                        this.showAlert('已删除', 'success');
                        this.loadProcessorOrders();
                    } catch (err) { this.showAlert(err.message, 'error'); }
                } else if (action === 'publish') {
                    try {
                        await this.authFetch(`/api/processor-requests/${id}/status`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: 'active', processor_id: this.currentUser.id })
                            });
                        this.showAlert('求购已发布', 'success');
                        this.loadProcessorOrders();
                    } catch (err) { this.showAlert(err.message, 'error'); }
                } else if (action === 'cancel' || action === 'reactivate') {
                    const newStatus = action === 'cancel' ? 'cancelled' : 'active';
                    try {
                        await this.authFetch(`/api/processor-requests/${id}/status`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: newStatus, processor_id: this.currentUser.id })
                            });
                        this.showAlert('状态已更新', 'success');
                        this.loadProcessorOrders();
                    } catch (err) { this.showAlert(err.message, 'error'); }
                }
            });
        });
    },

    bindReportActions(reportList) {
        document.querySelectorAll('[data-action]')?.forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                const report = reportList.find(r => String(r.id) === String(id));
                if (!report) return;
                if (action === 'edit') {
                    this.showNewReportForm(report);
                } else if (action === 'chat' || action === 'intention') {
                    this.openIntentionModal({ target_type: 'farmer_report', target_id: id, target_no: report ? report.report_no : '', target_name: '我的供货申报' });
                } else if (action === 'publish') {
                    try {
                        await this.authFetch(`/api/farmer-reports/${report.id}/status`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: 'pending' })
                            });
                        this.showAlert('申报已发布', 'success');
                        this.showMyReports();
                    } catch (err) {
                        this.showAlert(err.message, 'error');
                    }
                } else if (action === 'delete') {
                    if (!confirm('确认删除该草稿吗？')) return;
                    try {
                        await this.authFetch(`/api/farmer-reports/${report.id}?farmer_id=${this.currentUser.id}`, { method: 'DELETE' });
                        this.showAlert('草稿已删除', 'success');
                        this.showMyReports();
                    } catch (err) {
                        this.showAlert(err.message, 'error');
                    }
                }
            });
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
    
    // ========== 回收商求购功能 ==========
    
    // 显示发布求购表单
    showPublishDemandForm(editData = null) {
        const container = document.getElementById('content-area');
        const isEdit = !!editData;
        const isProcessor = this.currentUser.role === 'processor';
        const safeEditId = Number(editData?.id);
        const editIdExpr = Number.isFinite(safeEditId) && safeEditId > 0 ? String(safeEditId) : 'null';
        const editWeight = this.escapeHtml(editData?.weight_kg ?? '');
        const editLocationAddress = this.escapeHtml(editData?.location_address || '');
        const editContactName = this.escapeHtml(editData?.contact_name || '');
        const editContactPhone = this.escapeHtml(editData?.contact_phone || '');
        const editValidUntil = this.escapeHtml(editData?.valid_until || '');
        const editNotes = this.escapeHtml(editData?.notes || '');
        
        if (isProcessor) {
            // 处理商求购表单
            container.innerHTML = `
                <div style="animation: fadeIn 0.5s; max-width: 800px; margin: 0 auto;">
                    <h1 class="page-title">📝 ${isEdit ? '编辑' : '新建'}柑肉求购</h1>
                    
                    <form id="processor-demand-form" class="glass-card" style="padding: 30px;">
                        <div class="form-row">
                            <div class="form-group">
                                <label>需求重量(斤) <span style="color: red;">*</span></label>
                                <input type="number" id="demand-weight" placeholder="如：5000" value="${editWeight}" min="1" required>
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
                            <input type="text" id="demand-address" placeholder="如：广东省江门市新会区XX工业园" value="${editLocationAddress}" required>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>联系人 <span style="color: red;">*</span></label>
                                <input type="text" id="demand-contact-name" placeholder="如：张经理" value="${editContactName}" required>
                            </div>
                            
                            <div class="form-group">
                                <label>联系电话 <span style="color: red;">*</span></label>
                                <input type="tel" id="demand-contact-phone" placeholder="如：13800138000" value="${editContactPhone}" required>
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
                                <input type="date" id="demand-valid-until" value="${editValidUntil}" style="flex: 1;">
                                <label style="display: flex; align-items: center; gap: 6px; margin: 0;">
                                    <input type="checkbox" id="demand-permanent" ${!editData?.valid_until ? 'checked' : ''}>
                                    <span>长期有效</span>
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>备注说明</label>
                            <textarea id="demand-notes" rows="3" placeholder="可输入更详细的需求信息，如：价格、品质要求等">${editNotes}</textarea>
                        </div>

                        <div style="display: flex; gap: 15px; margin-top: 30px;">
                            <button type="button" data-demand-form-action="save-processor-demand" data-demand-status="draft" data-demand-edit-id="${editIdExpr}" style="flex: 1; padding: 14px; background: #95a5a6; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
                                💾 存为草稿
                            </button>
                            <button type="submit" style="flex: 2; padding: 14px; background: var(--citrus-orange); color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
                                📢 ${isEdit ? '保存修改' : '发布求购'}
                            </button>
                        </div>
                    </form>
                </div>
            `;

            this.bindDemandFormActions(container);
            
            // 绑定表单提交
            const processorDemandForm = document.getElementById('processor-demand-form');
            if (processorDemandForm) {
                processorDemandForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.saveProcessorDemand('active', editData?.id);
                });
            }
            
            // 长期有效复选框逻辑
            const permanentCheckbox = document.getElementById('demand-permanent');
            const dateInput = document.getElementById('demand-valid-until');
            permanentCheckbox.addEventListener('change', () => {
                dateInput.disabled = permanentCheckbox.checked;
                if (permanentCheckbox.checked) dateInput.value = '';
            });
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
                                <input type="text" id="demand-contact-name" placeholder="如：李农户" value="${editContactName}" required>
                            </div>
                            
                            <div class="form-group">
                                <label>联系电话 <span style="color: red;">*</span></label>
                                <input type="tel" id="demand-contact-phone" placeholder="如：13800138000" value="${editContactPhone}" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>有效期截止至</label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <input type="date" id="demand-valid-until" value="${editValidUntil}" style="flex: 1;">
                                <label style="display: flex; align-items: center; gap: 6px; margin: 0;">
                                    <input type="checkbox" id="demand-permanent" ${!editData?.valid_until ? 'checked' : ''}>
                                    <span>长期有效</span>
                                </label>
                            </div>
                            <span class="hint-text">💡 不选择日期或勾选"长期有效"表示该求购长期有效</span>
                        </div>

                        <div class="form-group">
                            <label>备注说明</label>
                            <textarea id="demand-notes" rows="4" placeholder="可输入更详细的需求信息，如：价格、数量要求等">${editNotes}</textarea>
                        </div>

                        <div style="display: flex; gap: 15px; margin-top: 30px;">
                            ${isEdit ? `
                                <button type="button" data-demand-form-action="navigate" data-demand-page="my-orders" style="flex: 1; padding: 14px; background: #7f8c8d; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
                                    ← 返回
                                </button>
                            ` : `
                                <button type="button" data-demand-form-action="save-recycler-demand" data-demand-status="draft" data-demand-edit-id="${editIdExpr}" style="flex: 1; padding: 14px; background: #95a5a6; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
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
                            <button type="button" data-demand-form-action="save-recycler-supply" data-demand-status="draft" style="flex: 1; padding: 14px; background: #95a5a6; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
                                💾 存为草稿
                            </button>
                            <button type="submit" style="flex: 2; padding: 14px; background: #9b59b6; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
                                📢 发布供应
                            </button>
                        </div>
                    </form>
                </div>
            `;

            this.bindDemandFormActions(container);

            // 切换表单显示
            const targetRadios = document.querySelectorAll('input[name="target-type"]');
            const farmerForm = document.getElementById('demand-form-farmer');
            const processorForm = document.getElementById('demand-form-processor');
            const farmerLabel = document.getElementById('target-farmer-label');
            const processorLabel = document.getElementById('target-processor-label');
            
            targetRadios.forEach(radio => {
                radio.addEventListener('change', () => {
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
                });
            });
            
            // 初始化样式
            farmerLabel.style.background = '#fff3e0';

            // 绑定农户表单提交事件
            const demandFormFarmer = document.getElementById('demand-form-farmer');
            if (demandFormFarmer) {
                demandFormFarmer.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.saveDemand('active', editData?.id);
                });
            }
            
            // 绑定处理商表单提交事件
            const demandFormProcessor = document.getElementById('demand-form-processor');
            if (demandFormProcessor) {
                demandFormProcessor.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.saveRecyclerSupply('active');
                });
            }

            // 长期有效复选框逻辑（农户表单）
            const permanentCheckbox = document.getElementById('demand-permanent');
            const dateInput = document.getElementById('demand-valid-until');
            
            permanentCheckbox.addEventListener('change', () => {
                if (permanentCheckbox.checked) {
                    dateInput.value = '';
                    dateInput.disabled = true;
                } else {
                    dateInput.disabled = false;
                }
            });
            
            if (permanentCheckbox.checked) {
                dateInput.disabled = true;
            }
        }
    },

    bindDemandEntryActions(scope) {
        if (!scope) return;

        scope.querySelectorAll('[data-demand-entry-action]').forEach(node => {
            const action = node.getAttribute('data-demand-entry-action') || '';
            node.addEventListener('click', (event) => {
                event.preventDefault();

                if (action === 'navigate') {
                    const page = node.getAttribute('data-demand-entry-page') || '';
                    if (page) this.navigateTo(page);
                }
            });
        });
    },

    bindDemandFormActions(scope) {
        if (!scope) return;

        scope.querySelectorAll('[data-demand-form-action]').forEach(node => {
            const action = node.getAttribute('data-demand-form-action') || '';
            node.addEventListener('click', async (event) => {
                event.preventDefault();

                const status = node.getAttribute('data-demand-status') || 'draft';
                const editIdRaw = node.getAttribute('data-demand-edit-id') || '';
                const editIdNum = Number(editIdRaw);
                const editId = Number.isInteger(editIdNum) && editIdNum > 0 ? editIdNum : null;

                if (action === 'navigate') {
                    const page = node.getAttribute('data-demand-page') || '';
                    if (page) this.navigateTo(page);
                    return;
                }

                if (action === 'save-processor-demand') {
                    await this.saveProcessorDemand(status, editId);
                    return;
                }

                if (action === 'save-recycler-demand') {
                    await this.saveDemand(status, editId);
                    return;
                }

                if (action === 'save-recycler-supply') {
                    await this.saveRecyclerSupply(status);
                }
            });
        });
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

            const response = await this.authFetch(`/api/processor-requests`, {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });

            const data = response;
            console.log('[saveProcessorDemand] Response:', data);
            
            if (!data) throw new Error('保存失败');

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
            await this.authFetch(`/api/recycler-requests`, {
                method: 'POST',
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
            await this.authFetch(`/api/recycler-supplies`, {
                method: 'POST',
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
            const data = await this.authFetch(`/api/processor-requests?for_recyclers=true`);
            
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
                const safeProcessorName = this.escapeHtml(r.processor_name || '处理商');
                const safeGrade = this.escapeHtml(gradeLabels[r.grade] || '不限品级');
                const safeRequestNo = this.escapeHtml(r.request_no || '--');
                const safeValidUntil = this.escapeHtml(r.valid_until || '');
                const validText = safeValidUntil ? 
                    `有效期至 ${safeValidUntil}` : 
                    '<span style="color: var(--primary-green);">长期有效</span>';
                const safeCitrus = this.escapeHtml(citrusLabels[r.citrus_type] || '不限种类');
                const safeWeight = this.escapeHtml(r.weight_kg ?? '--');
                const safeLocation = this.escapeHtml(r.location_address || '--');
                const safeContactName = this.escapeHtml(r.contact_name || '--');
                const safeContactPhone = this.escapeHtml(fuzzPhone(r.contact_phone || ''));
                const safeNotes = this.escapeHtml(r.notes || '');
                const safeId = Number(r.id);
                const idAttr = Number.isFinite(safeId) && safeId > 0 ? String(safeId) : '';
                const safeProcessorId = Number(r.processor_id);
                const uidAttr = Number.isFinite(safeProcessorId) && safeProcessorId > 0 ? String(safeProcessorId) : '';
                
                return `
                    <div class="glass-card" style="padding: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                            <div>
                                <h3 style="margin: 0 0 8px 0;">
                                    <span style="background: #9b59b6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                                        🏭 ${safeProcessorName}
                                    </span>
                                    <span style="background: var(--citrus-orange); color: white; padding: 4px 10px; border-radius: 20px; font-size: 13px; margin-left: 8px;">
                                        ${safeGrade}
                                    </span>
                                </h3>
                                <p style="color: #666; margin: 4px 0; font-size: 13px;">
                                    求购编号：${safeRequestNo}
                                </p>
                            </div>
                            <div style="text-align: right; font-size: 12px; color: #999;">
                                ${validText}
                            </div>
                        </div>
                        
                        <div style="background: #f5f0ff; padding: 16px; border-radius: 10px; margin-bottom: 16px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <p style="margin: 0;"><strong>🍊 种类：</strong>${safeCitrus}</p>
                                <p style="margin: 0;"><strong>⚖️ 需求量：</strong><span style="color: var(--citrus-orange); font-weight: bold;">${safeWeight} 斤</span></p>
                                <p style="margin: 0;"><strong>📍 收货地址：</strong>${safeLocation}</p>
                                <p style="margin: 0;"><strong>🚚 运输：</strong>${r.has_transport ? '<span style="color: var(--primary-green);">可上门收货</span>' : '需送货到厂'}</p>
                            </div>
                        </div>
                        
                        <div style="background: #f9f9f9; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                            <p style="margin: 0 0 6px 0;"><strong>联系人：</strong>${safeContactName}</p>
                            <p style="margin: 0;"><strong>联系电话：</strong>${safeContactPhone}</p>
                        </div>
                        
                        ${safeNotes ? `<p style="color: #666; margin: 0 0 16px 0;">💬 ${safeNotes}</p>` : ''}
                        
                        <div style="display: flex; justify-content: flex-end; gap: 10px;">
                            ${idAttr ? `<button data-processor-demand-action="accept" data-id="${idAttr}" 
                                    style="background: var(--primary-green); color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: bold;">
                                ✅ 接单
                            </button>` : ''}
                            ${idAttr && uidAttr ? `<button data-processor-demand-action="intention" data-id="${idAttr}" data-uid="${uidAttr}" 
                                    style="background: #9b59b6; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: bold;">
                                📋 发起意向
                            </button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            // 绑定按钮事件
            listDiv.querySelectorAll('[data-processor-demand-action]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const action = btn.dataset.processorDemandAction;
                    const id = btn.dataset.id;
                    const uid = btn.dataset.uid;
                    
                    if (action === 'chat' || action === 'intention') {
                        this.openIntentionModal({ target_type: 'processor_request', target_id: id, target_no: '', target_name: '处理商求购' });
                    } else if (action === 'accept') {
                        if (!confirm('确认接单该处理商求购？')) return;
                        try {
                            const resp = await this.authFetch(`/api/processor-requests/${id}/accept`, {
                                method: 'POST',
                                body: JSON.stringify({ recycler_id: this.currentUser.id })
                                });
                            this.showAlert('接单成功！可在"我的订单-处理商订单"中查看', 'success');
                            this.loadProcessorDemands();
                        } catch (err) {
                            this.showAlert(err.message, 'error');
                        }
                    }
                });
            });
            
        } catch (err) {
            console.error('Load processor demands error:', err);
            listDiv.innerHTML = `<div class="glass-card" style="padding: 24px;"><p style="color: #e74c3c;">${this.escapeHtml(err.message || '加载失败')}</p></div>`;
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
            const [recyclerData, processorData] = await Promise.all([
                this.authFetch(`/api/purchase-requests`),
                this.authFetch(`/api/processor-requests?for_farmers=true`)
            ]);
            
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
                const safeValidUntil = this.escapeHtml(r.valid_until || '');
                const validText = safeValidUntil ? 
                    `有效期至 ${safeValidUntil}` : 
                    '<span style="color: var(--primary-green);">长期有效</span>';
                const safeGrade = this.escapeHtml(gradeLabels[r.grade] || '不限品级');
                const safeCitrus = this.escapeHtml(citrusLabels[r.citrus_type] || '不限种类');
                const safeRequestNo = this.escapeHtml(r.request_no || '--');
                const safeWeight = this.escapeHtml(r.weight_kg ?? '--');
                const safeLocation = this.escapeHtml(r.location_address || '--');
                const safeContactName = this.escapeHtml(r.contact_name || '--');
                const safeContactPhone = this.escapeHtml(fuzzPhone(r.contact_phone || ''));
                const safeProcessorName = this.escapeHtml(r.processor_name || '未知');
                const safeRecyclerName = this.escapeHtml(r.recycler_name || '未知');
                const safeNotes = this.escapeHtml(r.notes || '');
                const safeId = Number(r.id);
                const idAttr = Number.isFinite(safeId) && safeId > 0 ? String(safeId) : '';
                const safeProcessorId = Number(r.processor_id);
                const processorUidAttr = Number.isFinite(safeProcessorId) && safeProcessorId > 0 ? String(safeProcessorId) : '';
                const safeRecyclerId = Number(r.recycler_id);
                const recyclerUidAttr = Number.isFinite(safeRecyclerId) && safeRecyclerId > 0 ? String(safeRecyclerId) : '';
                
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
                                            ${safeGrade} ${safeCitrus}
                                        </span>
                                    </h3>
                                    <p style="color: #666; margin: 4px 0; font-size: 13px;">
                                        求购编号：${safeRequestNo}
                                    </p>
                                </div>
                                <div style="text-align: right; font-size: 12px; color: #999;">
                                    ${validText}
                                </div>
                            </div>
                            
                            <div style="background: #f5f0ff; padding: 14px; border-radius: 8px; margin-bottom: 16px;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                                    <p style="margin: 0;"><strong>需求量：</strong><span style="color: #9b59b6; font-weight: bold;">${safeWeight} 斤</span></p>
                                    <p style="margin: 0;"><strong>🚚 可上门收货</strong></p>
                                    <p style="margin: 0; grid-column: 1 / -1;"><strong>📍 收货地址：</strong>${safeLocation}</p>
                                </div>
                            </div>
                            
                            <div style="background: #f9f9f9; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                                <p style="margin: 0 0 6px 0;"><strong>联系人：</strong>${safeContactName}</p>
                                <p style="margin: 0 0 6px 0;"><strong>联系电话：</strong>${safeContactPhone}</p>
                                <p style="margin: 0;"><strong>处理商：</strong>${safeProcessorName}</p>
                            </div>
                            
                            ${safeNotes ? `<p style="color: #666; margin: 0 0 16px 0;">💬 ${safeNotes}</p>` : ''}
                            
                            <div style="text-align: right;">
                                ${idAttr && processorUidAttr ? `<button data-processor-demand-action="intention" data-id="${idAttr}" data-uid="${processorUidAttr}" 
                                        style="background: #9b59b6; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: bold;">
                                    📋 发起意向
                                </button>` : ''}
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
                                            ${safeGrade}柑
                                        </span>
                                    </h3>
                                    <p style="color: #666; margin: 4px 0; font-size: 13px;">
                                        求购编号：${safeRequestNo}
                                    </p>
                                </div>
                                <div style="text-align: right; font-size: 12px; color: #999;">
                                    ${validText}
                                </div>
                            </div>
                            
                            <div style="background: #f9f9f9; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                                <p style="margin: 0 0 8px 0;"><strong>联系人：</strong>${safeContactName}</p>
                                <p style="margin: 0 0 8px 0;"><strong>联系电话：</strong>${safeContactPhone}</p>
                                <p style="margin: 0;"><strong>回收商：</strong>${safeRecyclerName}</p>
                            </div>
                            
                            ${safeNotes ? `<p style="color: #666; margin: 0 0 16px 0;">💬 ${safeNotes}</p>` : ''}
                            
                            <div style="text-align: right;">
                                ${idAttr && recyclerUidAttr ? `<button data-demand-action="intention" data-id="${idAttr}" data-uid="${recyclerUidAttr}" 
                                        style="background: var(--citrus-orange); color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: bold;">
                                    📋 发起意向
                                </button>` : ''}
                            </div>
                        </div>
                    `;
                }
            }).join('');

            // 绑定回收商按钮事件
            listDiv.querySelectorAll('[data-demand-action="intention"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    this.openIntentionModal({ target_type: 'recycler_request', target_id: id, target_no: '', target_name: '回收商求购' });
                });
            });
            
            // 绑定处理商按钮事件
            listDiv.querySelectorAll('[data-processor-demand-action="intention"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    this.openIntentionModal({ target_type: 'processor_request', target_id: id, target_no: '', target_name: '处理商求购' });
                });
            });
            
        } catch (err) {
            console.error('Load demands error:', err);
            listDiv.innerHTML = `<div class="glass-card" style="padding: 24px;"><p style="color: #e74c3c;">${this.escapeHtml(err.message || '加载失败')}</p></div>`;
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
                                    <option value="order">平台交易订单（推荐）</option>
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
                                <button type="button" data-arb-submit-action="cancel-submit" style="padding: 14px 30px; background: #95a5a6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
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
            btn.addEventListener('click', () => {
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
            });
        });
        
        // 绑定表单提交
        const arbitrationForm = document.getElementById('arbitration-form');
        if (arbitrationForm) {
            arbitrationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitArbitration();
            });
        }

        container.querySelectorAll('[data-arb-submit-action]').forEach(node => {
            const action = node.getAttribute('data-arb-submit-action') || '';
            node.addEventListener('click', () => {
                if (action === 'cancel-submit') {
                    this.navigateTo('dashboard');
                }
            });
        });
        
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
        
        input.addEventListener('change', () => {
            preview.innerHTML = '';
            const files = Array.from(input.files);
            
            files.forEach((file, index) => {
                const item = document.createElement('div');
                item.style.cssText = 'position: relative; padding: 8px 12px; background: #e8f5e9; border-radius: 6px; font-size: 12px; display: flex; align-items: center; gap: 6px;';
                
                const icon = file.type.includes('image') ? '🖼️' : (file.type.includes('pdf') ? '📄' : '📹');

                const iconEl = document.createElement('span');
                iconEl.textContent = icon;

                const nameEl = document.createElement('span');
                nameEl.style.cssText = 'max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
                nameEl.textContent = file.name;

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.textContent = '×';
                removeBtn.style.cssText = 'background: #e74c3c; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; margin-left: 5px;';
                removeBtn.addEventListener('click', () => {
                    item.remove();
                    input.value = '';
                });

                item.appendChild(iconEl);
                item.appendChild(nameEl);
                item.appendChild(removeBtn);
                preview.appendChild(item);
            });
        });
    },
    
    loadMyArbitrations() {
        const listDiv = document.getElementById('arbitration-list');
        listDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">加载中...</p>';
        
        this.authFetch(`/api/arbitration-requests?applicant_id=${this.currentUser.id}`)
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
                
                const currentUserId = Number(this.currentUser?.id);

                listDiv.innerHTML = data.map(item => {
                    const safeId = Number(item.id);
                    if (!Number.isInteger(safeId) || safeId <= 0) return '';

                    const status = statusLabels[item.status] || statusLabels.pending;
                    const applicantId = Number(item.applicant_id);
                    const respondentId = Number(item.respondent_id);
                    const safeArbitrationNo = this.escapeHtml(item.arbitration_no);
                    const safeOrderNo = this.escapeHtml(item.order_no);
                    const safeReason = this.escapeHtml(reasonLabels[item.reason] || item.reason || '');
                    const safeDescription = this.escapeHtml(item.description);
                    const safeCreatedAt = this.escapeHtml(item.created_at);
                    const safePenaltyAmount = Number.isFinite(Number(item.penalty_amount)) ? Number(item.penalty_amount).toString() : '0';
                    const safePenaltyReason = this.escapeHtml(item.penalty_reason || '');
                    const safePenaltyPaidAt = this.escapeHtml(item.penalty_paid_at || '');
                    const safeDecision = this.escapeHtml(item.decision || '');
                    const safeDecidedAt = this.escapeHtml(item.decided_at || '');
                    const safeAdminNotes = this.escapeHtml(item.admin_notes || '');
                    
                    // 判断当前用户是否是被罚方
                    const isPenaltyTarget = (
                        (item.penalty_party === 'applicant' && Number.isInteger(applicantId) && applicantId === currentUserId) ||
                        (item.penalty_party === 'respondent' && Number.isInteger(respondentId) && respondentId === currentUserId)
                    );
                    
                    return `
                        <div class="glass-card" style="padding: 24px; margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                                <div>
                                    <h3 style="margin: 0; font-size: 18px;">
                                        ${status.icon} 仲裁编号：${safeArbitrationNo}
                                    </h3>
                                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">订单编号：${safeOrderNo}</p>
                                </div>
                                <span style="padding: 6px 14px; border-radius: 20px; background: ${status.color}; color: white; font-size: 13px; font-weight: bold;">
                                    ${status.text}
                                </span>
                            </div>
                            
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                <p style="margin: 0 0 8px 0;"><strong>仲裁原因：</strong>${safeReason}</p>
                                <p style="margin: 0 0 8px 0;"><strong>详细说明：</strong>${safeDescription}</p>
                                <p style="margin: 0;"><strong>提交时间：</strong>${safeCreatedAt}</p>
                            </div>
                            
                            ${item.penalty_status && item.penalty_status !== 'none' && isPenaltyTarget ? `
                                <div style="background: ${item.penalty_status === 'paid' ? '#e8f5e9' : '#fff3cd'}; padding: 15px; border-radius: 8px; border-left: 4px solid ${item.penalty_status === 'paid' ? '#27ae60' : '#f39c12'}; margin-bottom: 15px;">
                                    <strong style="color: #e74c3c;">💰 罚款通知</strong>
                                    <p style="margin: 8px 0; color: #333;">
                                        根据仲裁结果，您需要支付罚款：<span style="font-size: 20px; font-weight: bold; color: #e74c3c;">¥${safePenaltyAmount}</span>
                                    </p>
                                    ${item.penalty_reason ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">罚款原因：${safePenaltyReason}</p>` : ''}
                                    <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">
                                        状态：${item.penalty_status === 'pending' ? '<span style="color: #f39c12;">⏳ 待支付</span>' : ''}
                                        ${item.penalty_status === 'paid' ? '<span style="color: #27ae60;">✅ 已支付</span>' : ''}
                                        ${item.penalty_status === 'waived' ? '<span style="color: #95a5a6;">🔓 已豁免</span>' : ''}
                                    </p>
                                    ${item.penalty_status === 'pending' ? `
                                        <button data-my-arb-action="pay-penalty" data-arb-id="${safeId}" style="margin-top: 12px; padding: 10px 20px; background: #f39c12; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                                            立即支付罚款
                                        </button>
                                    ` : ''}
                                    ${item.penalty_paid_at ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">支付时间：${safePenaltyPaidAt}</p>` : ''}
                                </div>
                            ` : ''}
                            
                            ${item.status === 'resolved' && item.decision ? `
                                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60; margin-bottom: 15px;">
                                    <strong style="color: #27ae60;">✅ 裁决结果：</strong>
                                    <p style="margin: 8px 0 0 0; color: #333;">${safeDecision}</p>
                                    ${item.decided_at ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">裁决时间：${safeDecidedAt}</p>` : ''}
                                </div>
                            ` : ''}
                            
                            ${item.status === 'rejected' && item.admin_notes ? `
                                <div style="background: #ffebee; padding: 15px; border-radius: 8px; border-left: 4px solid #e74c3c;">
                                    <strong style="color: #e74c3c;">❌ 驳回原因：</strong>
                                    <p style="margin: 8px 0 0 0; color: #333;">${safeAdminNotes}</p>
                                </div>
                            ` : ''}
                            
                            ${item.status === 'investigating' && item.admin_notes ? `
                                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">
                                    <strong style="color: #3498db;">🔍 管理员备注：</strong>
                                    <p style="margin: 8px 0 0 0; color: #333;">${safeAdminNotes}</p>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('');

                listDiv.querySelectorAll('[data-my-arb-action]').forEach(node => {
                    const action = node.getAttribute('data-my-arb-action') || '';
                    node.addEventListener('click', () => {
                        if (action !== 'pay-penalty') return;

                        const actionId = Number(node.getAttribute('data-arb-id') || '0');
                        if (!Number.isInteger(actionId) || actionId <= 0) {
                            this.showAlert('仲裁记录 ID 无效', 'warning');
                            return;
                        }

                        this.payPenalty(actionId);
                    });
                });
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
            this.showAlert('正在校验订单信息...', 'info');

            const orderLookupMap = {
                'farmer_report': {
                    endpoint: '/api/farmer-reports?status=all',
                    noKeys: ['report_no', 'order_no']
                },
                'recycler_request': {
                    endpoint: '/api/recycler-requests?status=all',
                    noKeys: ['request_no', 'order_no']
                },
                'processor_request': {
                    endpoint: '/api/processor-requests?status=all',
                    noKeys: ['request_no', 'order_no']
                }
            };

            let resolvedTarget;
            if (orderType === 'order') {
                const orderDetail = await this.authFetch(`/api/orders/${encodeURIComponent(orderNo)}`);
                const orderId = Number(orderDetail?.id);
                if (!Number.isInteger(orderId) || orderId <= 0) {
                    throw new Error('未找到对应交易订单，请核对订单编号后重试');
                }
                resolvedTarget = {
                    order_id: orderId,
                    order_no: String(orderDetail.order_no || orderNo).trim()
                };
            } else {
                const lookupConfig = orderLookupMap[orderType];
                if (!lookupConfig) {
                    throw new Error('不支持的订单类型，请重新选择');
                }

                const rows = await this.authFetch(lookupConfig.endpoint);
                const normalizedRows = Array.isArray(rows) ? rows : [];
                const normalizedInput = String(orderNo).trim().toLowerCase();
                const matchedRow = normalizedRows.find((row) => {
                    const candidates = [row.id, ...lookupConfig.noKeys.map((key) => row[key])]
                        .filter((value) => value !== undefined && value !== null)
                        .map((value) => String(value).trim().toLowerCase());
                    return candidates.includes(normalizedInput);
                });

                const matchedId = Number(matchedRow?.id);
                if (!Number.isInteger(matchedId) || matchedId <= 0) {
                    throw new Error('未找到对应单据，请核对编号后重试');
                }

                resolvedTarget = {
                    order_id: matchedId,
                    order_no: String(
                        matchedRow.order_no
                        || matchedRow.report_no
                        || matchedRow.request_no
                        || orderNo
                    ).trim()
                };
            }

            this.showAlert('正在上传证据材料...', 'info');
            
            // 上传所有文件
            const formData = new FormData();
            
            // 添加所有文件
            Array.from(tradeFiles).forEach(file => formData.append('files', file));
            Array.from(materialFiles).forEach(file => formData.append('files', file));
            Array.from(paymentFiles).forEach(file => formData.append('files', file));
            Array.from(document.getElementById('evidence-communication').files).forEach(file => formData.append('files', file));
            Array.from(document.getElementById('evidence-other').files).forEach(file => formData.append('files', file));
            
            const uploadResponse = await this.authFetch(`/api/upload-arbitration-files`, {
                method: 'POST',
                body: formData
            });
            const uploadedFiles = uploadResponse.files;
            
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

            await this.authFetch(`/api/arbitration-requests`, {
                method: 'POST',
                body: JSON.stringify({
                    applicant_id: this.currentUser.id,
                    order_type: orderType,
                    order_id: resolvedTarget.order_id,
                    order_no: resolvedTarget.order_no,
                    reason: reason,
                    description: description,
                    evidence_trade: evidence_trade,
                    evidence_material: evidence_material,
                    evidence_payment: evidence_payment,
                    evidence_communication: evidence_communication,
                    evidence_other: evidence_other
                })
            });
            
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
        container.dataset.arbitrationView = 'list';
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
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadArbitrationRequests(btn.dataset.status);
            });
        });
        
        // 加载仲裁请求
        this.loadArbitrationRequests('all');
    },
    
    loadArbitrationRequests(status = 'all') {
        const listDiv = document.getElementById('arbitration-management-list');
        listDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">加载中...</p>';
        
        this.authFetch(`/api/arbitration-requests/all?status=${status}`)
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
                    'order': '平台交易订单',
                    'farmer_report': '农户申报订单',
                    'recycler_request': '回收商求购订单',
                    'processor_request': '处理商求购订单'
                };
                
                listDiv.innerHTML = data.map(item => {
                    const safeId = Number(item.id);
                    if (!Number.isInteger(safeId) || safeId <= 0) return '';

                    const status = statusLabels[item.status] || statusLabels.pending;
                    const evidenceTrade = Array.isArray(item.evidence_trade) ? item.evidence_trade : [];
                    const evidenceMaterial = Array.isArray(item.evidence_material) ? item.evidence_material : [];
                    const evidencePayment = Array.isArray(item.evidence_payment) ? item.evidence_payment : [];
                    const evidenceCommunication = Array.isArray(item.evidence_communication) ? item.evidence_communication : [];
                    const evidenceOther = Array.isArray(item.evidence_other) ? item.evidence_other : [];

                    const safeArbitrationNo = this.escapeHtml(item.arbitration_no);
                    const safeApplicantName = this.escapeHtml(item.applicant_name);
                    const safeApplicantPhone = this.escapeHtml(fuzzPhone(item.applicant_phone));
                    const safeOrderType = this.escapeHtml(orderTypeLabels[item.order_type] || item.order_type || '');
                    const safeOrderNo = this.escapeHtml(item.order_no);
                    const safeReason = this.escapeHtml(reasonLabels[item.reason] || item.reason || '');
                    const safeDescription = this.escapeHtml(item.description);
                    const safeCreatedAt = this.escapeHtml(item.created_at);
                    const safeAdminNotes = this.escapeHtml(item.admin_notes || '');
                    const safeDecision = this.escapeHtml(item.decision || '');
                    const safeDecidedAt = this.escapeHtml(item.decided_at || '');
                    const safeDecidedBy = this.escapeHtml(item.decided_by_name || '管理员');

                    return `
                        <div class="glass-card" data-arb-list-action="view-detail" data-arb-id="${safeId}" style="padding: 24px; margin-bottom: 20px; cursor: pointer; transition: all 0.3s;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                                <div>
                                    <h3 style="margin: 0; font-size: 18px;">
                                        ${status.icon} 仲裁编号：${safeArbitrationNo}
                                    </h3>
                                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">
                                        申请人：${safeApplicantName} (${safeApplicantPhone})
                                    </p>
                                </div>
                                <span style="padding: 6px 14px; border-radius: 20px; background: ${status.color}; color: white; font-size: 13px; font-weight: bold;">
                                    ${status.text}
                                </span>
                            </div>
                            
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                                    <p style="margin: 0;"><strong>订单类型：</strong>${safeOrderType}</p>
                                    <p style="margin: 0;"><strong>订单编号：</strong>${safeOrderNo}</p>
                                </div>
                                <p style="margin: 0 0 8px 0;"><strong>仲裁原因：</strong>${safeReason}</p>
                                <p style="margin: 0 0 8px 0;"><strong>详细说明：</strong>${safeDescription}</p>
                                <p style="margin: 0;"><strong>提交时间：</strong>${safeCreatedAt}</p>
                            </div>
                            
                            <!-- 证据材料 -->
                            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                <strong style="color: #856404;">📎 已提交证据材料：</strong>
                                <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                                    <div>
                                        <strong>平台交易凭证：</strong>
                                        <span style="color: ${evidenceTrade.length > 0 ? '#27ae60' : '#e74c3c'};">
                                            ${evidenceTrade.length > 0 ? `✅ ${evidenceTrade.length}个文件` : '❌ 未提交'}
                                        </span>
                                    </div>
                                    <div>
                                        <strong>废料相关证据：</strong>
                                        <span style="color: ${evidenceMaterial.length > 0 ? '#27ae60' : '#e74c3c'};">
                                            ${evidenceMaterial.length > 0 ? `✅ ${evidenceMaterial.length}个文件` : '❌ 未提交'}
                                        </span>
                                    </div>
                                    <div>
                                        <strong>资金往来凭证：</strong>
                                        <span style="color: ${evidencePayment.length > 0 ? '#27ae60' : '#e74c3c'};">
                                            ${evidencePayment.length > 0 ? `✅ ${evidencePayment.length}个文件` : '❌ 未提交'}
                                        </span>
                                    </div>
                                    <div>
                                        <strong>沟通记录：</strong>
                                        <span style="color: #666;">
                                            ${evidenceCommunication.length > 0 ? `📄 ${evidenceCommunication.length}个文件` : '未提交'}
                                        </span>
                                    </div>
                                    <div>
                                        <strong>其他材料：</strong>
                                        <span style="color: #666;">
                                            ${evidenceOther.length > 0 ? `📄 ${evidenceOther.length}个文件` : '未提交'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            ${item.admin_notes ? `
                                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; margin-bottom: 15px;">
                                    <strong style="color: #3498db;">📝 管理员备注：</strong>
                                    <p style="margin: 8px 0 0 0; color: #333;">${safeAdminNotes}</p>
                                </div>
                            ` : ''}
                            
                            ${item.decision ? `
                                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60; margin-bottom: 15px;">
                                    <strong style="color: #27ae60;">⚖️ 裁决结果：</strong>
                                    <p style="margin: 8px 0 0 0; color: #333;">${safeDecision}</p>
                                    ${item.decided_at ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">裁决时间：${safeDecidedAt} | 裁决人：${safeDecidedBy}</p>` : ''}
                                </div>
                            ` : ''}
                            
                            <!-- 操作按钮 -->
                            ${item.status === 'pending' || item.status === 'investigating' ? `
                                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                    ${item.status === 'pending' ? `
                                        <button data-arb-list-action="start-investigation" data-arb-id="${safeId}" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                                            🔍 开始调查
                                        </button>
                                    ` : ''}
                                    <button data-arb-list-action="resolve" data-arb-id="${safeId}" style="padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                                        ✅ 做出裁决
                                    </button>
                                    <button data-arb-list-action="reject" data-arb-id="${safeId}" style="padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                                        ❌ 驳回申请
                                    </button>
                                    <button data-arb-list-action="add-note" data-arb-id="${safeId}" style="padding: 8px 16px; background: #95a5a6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                        📝 添加备注
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('');

                listDiv.querySelectorAll('[data-arb-list-action]').forEach(node => {
                    const action = node.getAttribute('data-arb-list-action') || '';
                    node.addEventListener('click', (event) => {
                        const actionId = Number(node.getAttribute('data-arb-id') || '0');
                        if (!Number.isInteger(actionId) || actionId <= 0) {
                            this.showAlert('仲裁记录 ID 无效', 'warning');
                            return;
                        }

                        if (action === 'view-detail') {
                            this.showArbitrationDetail(actionId);
                            return;
                        }

                        event.preventDefault();
                        event.stopPropagation();

                        if (action === 'start-investigation') {
                            this.updateArbitrationStatus(actionId, 'investigating');
                            return;
                        }
                        if (action === 'resolve') {
                            this.resolveArbitration(actionId);
                            return;
                        }
                        if (action === 'reject') {
                            this.rejectArbitration(actionId);
                            return;
                        }
                        if (action === 'add-note') {
                            this.addArbitrationNote(actionId);
                        }
                    });
                });
            })
            .catch(err => {
                console.error('加载仲裁请求失败:', err);
                listDiv.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">加载失败，请刷新重试</p>`;
            });
    },
    
    async updateArbitrationStatus(id, status) {
        try {
            await this.authFetch(`/api/arbitration-requests/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
            this.showAlert('状态已更新', 'success');
            this.loadArbitrationRequests('all');
        } catch (err) {
            this.showAlert(err.message, 'error');
        }
    },
    
    async resolveArbitration(id) {
        const decision = prompt('请输入裁决结果：');
        if (!decision || !decision.trim()) return;
        
        try {
            await this.authFetch(`/api/arbitration-requests/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    status: 'resolved',
                    decision: decision.trim(),
                    decided_by: this.currentUser.id,
                    decided_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                })
            });
            this.showAlert('裁决已保存', 'success');
            setTimeout(() => {
                if (this.isArbitrationDetailViewActive()) {
                    this.showArbitrationDetail(id);
                } else {
                    this.loadArbitrationRequests('all');
                }
            }, 800);
        } catch (err) {
            this.showAlert(err.message, 'error');
        }
    },
    
    async rejectArbitration(id) {
        const reason = prompt('请输入驳回原因：');
        if (!reason || !reason.trim()) return;
        
        try {
            await this.authFetch(`/api/arbitration-requests/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    status: 'rejected',
                    decision: '申请已驳回。理由：' + reason.trim(),
                    decided_by: this.currentUser.id,
                    decided_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                })
            });
            this.showAlert('申请已驳回', 'success');
            setTimeout(() => {
                if (this.isArbitrationDetailViewActive()) {
                    this.showArbitrationDetail(id);
                } else {
                    this.loadArbitrationRequests('all');
                }
            }, 800);
        } catch (err) {
            this.showAlert(err.message, 'error');
        }
    },
    
    async addArbitrationNote(id) {
        const note = prompt('请输入备注内容：');
        if (!note || !note.trim()) return;
        
        try {
            await this.authFetch(`/api/arbitration-requests/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    admin_notes: note.trim()
                })
            });
            this.showAlert('备注已添加', 'success');
            setTimeout(() => {
                if (this.isArbitrationDetailViewActive()) {
                    this.showArbitrationDetail(id);
                } else {
                    this.loadArbitrationRequests('all');
                }
            }, 800);
        } catch (err) {
            this.showAlert(err.message, 'error');
        }
    },

    isArbitrationDetailViewActive() {
        const contentArea = document.getElementById('content-area');
        return contentArea?.dataset?.arbitrationView === 'detail';
    },
    
    // 显示仲裁详情页面
    showArbitrationDetail(id) {
        const container = document.getElementById('content-area');
        container.dataset.arbitrationView = 'detail';
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #888;">加载中...</p>';

        const targetId = Number(id);
        if (!Number.isInteger(targetId) || targetId <= 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #e74c3c;">仲裁记录 ID 无效</p>';
            return;
        }

        const filePreviewRegistry = new Map();
        let filePreviewSeq = 0;
        
        // 渲染文件列表的辅助函数
        const renderFileList = (files) => {
            if (!files || files.length === 0) {
                return '<p style="margin: 0; color: #999; font-style: italic;">未提交</p>';
            }
            
            return `
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${files.map(fileStr => {
                        let fileInfo;
                        if (fileStr && typeof fileStr === 'object') {
                            fileInfo = fileStr;
                        } else {
                            try {
                                // 尝试解析JSON格式的文件信息
                                fileInfo = JSON.parse(fileStr);
                            } catch (e) {
                                // 如果不是JSON，则是旧格式的文件名
                                fileInfo = { originalName: fileStr, path: null };
                            }
                        }
                        
                        const fileName = String(fileInfo.originalName || fileInfo.name || fileStr || '未命名文件');
                        const filePath = this.sanitizeRelativeAssetPath(fileInfo.path || '');
                        const safeTitle = this.escapeHtml(fileName);
                        const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(fileName);
                        const isPdf = /\.pdf$/i.test(fileName);
                        const isVideo = /\.(mp4|avi|mov)$/i.test(fileName);
                        
                        let icon = '📄';
                        if (isImage) icon = '🖼️';
                        else if (isPdf) icon = '📄';
                        else if (isVideo) icon = '📹';

                        let previewKey = '';
                        if (filePath) {
                            previewKey = `file-preview-${++filePreviewSeq}`;
                            filePreviewRegistry.set(previewKey, { filePath, fileName, isImage });
                        }
                        const safePreviewKey = this.escapeHtml(previewKey);
                        
                        return `
                            <div class="arbitration-file-item" ${previewKey ? `data-file-preview-key="${safePreviewKey}"` : ''} style="background: white; padding: 10px 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 8px; ${previewKey ? 'cursor: pointer; transition: transform 0.2s;' : ''}">
                                ${icon}
                                <span style="font-size: 14px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${safeTitle}">${safeTitle}</span>
                                ${previewKey ? '<span style="color: #3498db; font-size: 12px;">点击查看</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        };
        
        this.authFetch(`/api/arbitration-requests/all?status=all`)
            .then(data => {
                const rows = Array.isArray(data) ? data : [];
                const item = rows.find(a => Number(a.id) === targetId);
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
                    'order': '平台交易订单',
                    'farmer_report': '农户申报订单',
                    'recycler_request': '回收商求购订单',
                    'processor_request': '处理商求购订单'
                };
                
                const status = statusLabels[item.status] || statusLabels.pending;
                const safeId = Number(item.id);
                const evidenceTrade = Array.isArray(item.evidence_trade) ? item.evidence_trade : [];
                const evidenceMaterial = Array.isArray(item.evidence_material) ? item.evidence_material : [];
                const evidencePayment = Array.isArray(item.evidence_payment) ? item.evidence_payment : [];
                const evidenceCommunication = Array.isArray(item.evidence_communication) ? item.evidence_communication : [];
                const evidenceOther = Array.isArray(item.evidence_other) ? item.evidence_other : [];

                const safeArbitrationNo = this.escapeHtml(item.arbitration_no);
                const safeApplicantName = this.escapeHtml(item.applicant_name);
                const safeApplicantPhone = this.escapeHtml(fuzzPhone(item.applicant_phone));
                const safeOrderType = this.escapeHtml(orderTypeLabels[item.order_type] || item.order_type || '');
                const safeOrderNo = this.escapeHtml(item.order_no);
                const safeReason = this.escapeHtml(reasonLabels[item.reason] || item.reason || '');
                const safeCreatedAt = this.escapeHtml(item.created_at);
                const safeDescription = this.escapeHtml(item.description);
                const safeAdminNotes = this.escapeHtml(item.admin_notes || '');
                const safeRespondentName = this.escapeHtml(item.respondent_name || '被申请人');
                const safePenaltyReason = this.escapeHtml(item.penalty_reason || '');
                const safePenaltyPaidAt = this.escapeHtml(item.penalty_paid_at || '');
                const safeDecision = this.escapeHtml(item.decision || '');
                const safeDecidedAt = this.escapeHtml(item.decided_at || '');
                const safeDecidedByName = this.escapeHtml(item.decided_by_name || '管理员');
                const safePenaltyProof = this.sanitizeRelativeAssetPath(item.penalty_proof || '');
                const safePenaltyProofAttr = this.escapeHtml(safePenaltyProof);
                const safePenaltyAmount = Number.isFinite(Number(item.penalty_amount)) ? Number(item.penalty_amount).toString() : '0';
                const safeOrderAmount = Number.isFinite(Number(item.order_amount)) ? Number(item.order_amount) : 0;

                if (!Number.isInteger(safeId) || safeId <= 0) {
                    container.innerHTML = '<p style="text-align: center; padding: 40px; color: #e74c3c;">仲裁记录 ID 无效</p>';
                    return;
                }
                
                container.innerHTML = `
                    <div style="animation: fadeIn 0.5s;">
                        <!-- 返回按钮 -->
                        <div style="margin-bottom: 20px;">
                            <button data-arb-detail-action="back-list" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
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
                                    <p style="margin: 0; font-size: 16px; color: #666;">仲裁编号：${safeArbitrationNo}</p>
                                </div>
                                <span style="padding: 10px 20px; border-radius: 25px; background: ${status.color}; color: white; font-size: 15px; font-weight: bold;">
                                    ${status.text}
                                </span>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8f9fa; padding: 20px; border-radius: 10px;">
                                <div>
                                    <strong style="color: #555;">申请人：</strong>
                                    <span>${safeApplicantName}</span>
                                </div>
                                <div>
                                    <strong style="color: #555;">联系电话：</strong>
                                    <span>${safeApplicantPhone}</span>
                                </div>
                                <div>
                                    <strong style="color: #555;">订单类型：</strong>
                                    <span>${safeOrderType}</span>
                                </div>
                                <div>
                                    <strong style="color: #555;">订单编号：</strong>
                                    <span>${safeOrderNo}</span>
                                </div>
                                <div>
                                    <strong style="color: #555;">仲裁原因：</strong>
                                    <span>${safeReason}</span>
                                </div>
                                <div>
                                    <strong style="color: #555;">提交时间：</strong>
                                    <span>${safeCreatedAt}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 详细说明 -->
                        <div class="glass-card" style="padding: 25px; margin-bottom: 25px;">
                            <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📄 详细说明</h3>
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; line-height: 1.8;">
                                ${safeDescription}
                            </div>
                        </div>
                        
                        <!-- 证据材料 -->
                        <div class="glass-card" style="padding: 25px; margin-bottom: 25px;">
                            <h3 style="margin: 0 0 20px 0; color: #2c3e50;">📎 提交的证据材料</h3>
                            
                            <!-- 1. 平台交易凭证 -->
                            <div style="margin-bottom: 20px; background: ${evidenceTrade.length > 0 ? '#e8f5e9' : '#ffebee'}; padding: 20px; border-radius: 10px; border-left: 5px solid ${evidenceTrade.length > 0 ? '#27ae60' : '#e74c3c'};">
                                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                    ${evidenceTrade.length > 0 ? '✅' : '❌'} 1. 平台交易凭证 <span style="color: #e74c3c;">*（必须）</span>
                                </h4>
                                <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">平台订单、回收报价单、废料交付确认单、平台系统操作日志</p>
                                ${renderFileList(evidenceTrade)}
                            </div>
                            
                            <!-- 2. 废料相关证据 -->
                            <div style="margin-bottom: 20px; background: ${evidenceMaterial.length > 0 ? '#e8f5e9' : '#ffebee'}; padding: 20px; border-radius: 10px; border-left: 5px solid ${evidenceMaterial.length > 0 ? '#27ae60' : '#e74c3c'};">
                                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                    ${evidenceMaterial.length > 0 ? '✅' : '❌'} 2. 废料相关证据 <span style="color: #e74c3c;">*（必须）</span>
                                </h4>
                                <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">新会柑果肉/果渣交付清单、质量检测报告、称重单据、现场照片/视频</p>
                                ${renderFileList(evidenceMaterial)}
                            </div>
                            
                            <!-- 3. 资金往来凭证 -->
                            <div style="margin-bottom: 20px; background: ${evidencePayment.length > 0 ? '#e8f5e9' : '#ffebee'}; padding: 20px; border-radius: 10px; border-left: 5px solid ${evidencePayment.length > 0 ? '#27ae60' : '#e74c3c'};">
                                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                    ${evidencePayment.length > 0 ? '✅' : '❌'} 3. 资金往来凭证 <span style="color: #e74c3c;">*（必须）</span>
                                </h4>
                                <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">转账记录、收款收据、平台结算账单</p>
                                ${renderFileList(evidencePayment)}
                            </div>
                            
                            <!-- 4. 沟通记录（可选）-->
                            <div style="margin-bottom: 20px; background: ${evidenceCommunication.length > 0 ? '#e3f2fd' : '#f8f9fa'}; padding: 20px; border-radius: 10px; border-left: 5px solid #3498db;">
                                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                    ${evidenceCommunication.length > 0 ? '📄' : '📭'} 4. 沟通记录 <span style="color: #3498db;">（可选）</span>
                                </h4>
                                <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">平台聊天、微信/短信、邮件往来</p>
                                ${renderFileList(evidenceCommunication)}
                            </div>
                            
                            <!-- 5. 其他材料（可选）-->
                            <div style="background: ${evidenceOther.length > 0 ? '#e3f2fd' : '#f8f9fa'}; padding: 20px; border-radius: 10px; border-left: 5px solid #3498db;">
                                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                    ${evidenceOther.length > 0 ? '📄' : '📭'} 5. 其他材料 <span style="color: #3498db;">（可选）</span>
                                </h4>
                                <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">平台服务协议、行业标准、损失核算明细</p>
                                ${renderFileList(evidenceOther)}
                            </div>
                        </div>
                        
                        ${item.admin_notes ? `
                            <!-- 管理员备注 -->
                            <div class="glass-card" style="padding: 25px; margin-bottom: 25px;">
                                <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📝 管理员备注</h3>
                                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; line-height: 1.8;">
                                    ${safeAdminNotes}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${item.penalty_status && item.penalty_status !== 'none' ? `
                            <!-- 罚款信息 -->
                            <div class="glass-card" style="padding: 25px; margin-bottom: 25px; background: ${item.penalty_status === 'paid' ? '#e8f5e9' : '#fff3cd'};">
                                <h3 style="margin: 0 0 15px 0; color: #2c3e50;">💰 罚款处罚</h3>
                                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${item.penalty_status === 'paid' ? '#27ae60' : '#f39c12'};">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                                        <div><strong>被罚方：</strong>${item.penalty_party === 'applicant' ? `${safeApplicantName}（申请人）` : safeRespondentName}</div>
                                        <div><strong>罚款金额：</strong><span style="color: #e74c3c; font-size: 18px; font-weight: bold;">¥${safePenaltyAmount}</span></div>
                                        <div><strong>订单金额：</strong>¥${safeOrderAmount}</div>
                                        <div><strong>罚款状态：</strong>
                                            ${item.penalty_status === 'pending' ? '<span style="color: #f39c12;">⏳ 待支付</span>' : ''}
                                            ${item.penalty_status === 'paid' ? '<span style="color: #27ae60;">✅ 已支付</span>' : ''}
                                            ${item.penalty_status === 'waived' ? '<span style="color: #95a5a6;">🔓 已豁免</span>' : ''}
                                        </div>
                                    </div>
                                    ${item.penalty_reason ? `<div style="margin-top: 10px;"><strong>罚款原因：</strong>${safePenaltyReason}</div>` : ''}
                                    ${item.penalty_paid_at ? `<div style="margin-top: 10px;"><strong>支付时间：</strong>${safePenaltyPaidAt}</div>` : ''}
                                    ${safePenaltyProof ? `
                                        <div style="margin-top: 10px;">
                                            <strong>支付凭证：</strong>
                                            <button data-arb-detail-action="view-penalty-proof" data-proof-path="${safePenaltyProofAttr}" data-proof-name="支付凭证" data-proof-image="true" style="padding: 5px 15px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
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
                                    ${safeDecision}
                                </div>
                                ${item.decided_at ? `
                                    <p style="margin: 15px 0 0 0; font-size: 13px; color: #666;">
                                        裁决时间：${safeDecidedAt} | 裁决人：${safeDecidedByName}
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
                                        <button data-arb-detail-action="start-investigation" data-arb-id="${safeId}" style="padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px;">
                                            🔍 开始调查
                                        </button>
                                    ` : ''}
                                    <button data-arb-detail-action="set-penalty" data-arb-id="${safeId}" data-order-amount="${safeOrderAmount}" style="padding: 12px 24px; background: #f39c12; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px;">
                                        💰 设置罚款
                                    </button>
                                    <button data-arb-detail-action="resolve" data-arb-id="${safeId}" style="padding: 12px 24px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px;">
                                        ✅ 做出裁决
                                    </button>
                                    <button data-arb-detail-action="reject" data-arb-id="${safeId}" style="padding: 12px 24px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px;">
                                        ❌ 驳回申请
                                    </button>
                                    <button data-arb-detail-action="add-note" data-arb-id="${safeId}" style="padding: 12px 24px; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px;">
                                        📝 添加备注
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;

                container.querySelectorAll('[data-file-preview-key]').forEach(node => {
                    const previewKey = node.getAttribute('data-file-preview-key') || '';
                    const fileMeta = filePreviewRegistry.get(previewKey);
                    if (!fileMeta) return;

                    node.addEventListener('mouseenter', () => {
                        node.style.transform = 'scale(1.05)';
                    });
                    node.addEventListener('mouseleave', () => {
                        node.style.transform = 'scale(1)';
                    });
                    node.addEventListener('click', () => {
                        this.viewFile(fileMeta.filePath, fileMeta.fileName, fileMeta.isImage);
                    });
                });

                container.querySelectorAll('[data-arb-detail-action]').forEach(node => {
                    const action = node.getAttribute('data-arb-detail-action') || '';
                    node.addEventListener('click', () => {
                        if (action === 'back-list') {
                            this.navigateTo('arbitration-management');
                            return;
                        }

                        if (action === 'view-penalty-proof') {
                            const proofPath = this.sanitizeRelativeAssetPath(node.getAttribute('data-proof-path') || '');
                            if (!proofPath) {
                                this.showAlert('支付凭证路径无效', 'warning');
                                return;
                            }
                            const proofName = node.getAttribute('data-proof-name') || '支付凭证';
                            const isImageProof = (node.getAttribute('data-proof-image') || '').toLowerCase() === 'true';
                            this.viewFile(proofPath, proofName, isImageProof);
                            return;
                        }

                        const actionId = Number(node.getAttribute('data-arb-id') || '0');
                        if (!Number.isInteger(actionId) || actionId <= 0) {
                            this.showAlert('仲裁记录 ID 无效', 'warning');
                            return;
                        }

                        if (action === 'start-investigation') {
                            this.updateArbitrationStatus(actionId, 'investigating');
                            setTimeout(() => this.showArbitrationDetail(actionId), 1000);
                            return;
                        }
                        if (action === 'set-penalty') {
                            const orderAmount = Number(node.getAttribute('data-order-amount') || '0');
                            const safeAmount = Number.isFinite(orderAmount) ? orderAmount : 0;
                            this.setPenalty(actionId, safeAmount);
                            return;
                        }
                        if (action === 'resolve') {
                            this.resolveArbitration(actionId);
                            return;
                        }
                        if (action === 'reject') {
                            this.rejectArbitration(actionId);
                            return;
                        }
                        if (action === 'add-note') {
                            this.addArbitrationNote(actionId);
                        }
                    });
                });
            })
            .catch(err => {
                console.error('加载仲裁详情失败:', err);
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <p style="color: #e74c3c; margin-bottom: 20px;">加载失败，请重试</p>
                        <button data-arb-detail-error-action="back-list" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            返回列表
                        </button>
                    </div>
                `;

                const backButton = container.querySelector('[data-arb-detail-error-action="back-list"]');
                if (backButton) {
                    backButton.addEventListener('click', () => {
                        this.navigateTo('arbitration-management');
                    });
                }
            });
    },
    
    // 查看文件
    async viewFile(filePath, fileName, isImage) {
        let fileBlob;
        try {
            fileBlob = await this.fetchProtectedFileBlob(filePath);
        } catch (err) {
            this.showAlert(err.message || '文件加载失败', 'error');
            return;
        }

        const blobUrl = URL.createObjectURL(fileBlob);

        // 创建模态框显示文件
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;';

        const cleanupAndRemove = () => {
            URL.revokeObjectURL(blobUrl);
            modal.remove();
        };
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕ 关闭';
        closeBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; padding: 12px 24px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; z-index: 10001;';
        closeBtn.addEventListener('click', cleanupAndRemove);
        
        const title = document.createElement('div');
        title.style.cssText = 'position: absolute; top: 20px; left: 20px; color: white; font-size: 18px; font-weight: bold; z-index: 10001; max-width: calc(100% - 180px);';
        title.textContent = fileName;
        
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = 'max-width: 90%; max-height: 80%; overflow: auto; background: white; border-radius: 10px; padding: 20px;';
        
        if (isImage) {
            const img = document.createElement('img');
            img.src = blobUrl;
            img.style.cssText = 'max-width: 100%; max-height: 70vh; object-fit: contain;';
            img.onerror = () => {
                contentWrapper.innerHTML = '<p style="color: #e74c3c; text-align: center; padding: 40px;">图片加载失败</p>';
            };
            contentWrapper.appendChild(img);
        } else if (filePath.endsWith('.pdf')) {
            const iframe = document.createElement('iframe');
            iframe.src = blobUrl;
            iframe.style.cssText = 'width: 80vw; height: 80vh; border: none;';
            iframe.onerror = () => {
                contentWrapper.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <p style="color: #e74c3c; margin-bottom: 20px;">PDF预览失败</p>
                        <a href="${blobUrl}" download="${fileName}" style="padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 8px;">下载文件</a>
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
                    <a href="${blobUrl}" download="${fileName}" style="padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 8px; display: inline-block;">
                        ⬇️ 下载文件
                    </a>
                </div>
            `;
        }
        
        modal.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(contentWrapper);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) cleanupAndRemove();
        });
        
        document.body.appendChild(modal);
    },

    closeModalByType(modalType) {
        if (!modalType) return;
        const modal = document.querySelector(`[data-modal-type="${modalType}"]`);
        if (modal) {
            modal.remove();
        }
    },
    
    // 设置罚款
    setPenalty(arbitrationId, orderAmount = 0) {
        const targetId = Number(arbitrationId);
        if (!Number.isInteger(targetId) || targetId <= 0) {
            this.showAlert('仲裁记录 ID 无效', 'warning');
            return;
        }

        const container = document.createElement('div');
        container.dataset.modalType = 'set-penalty';
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
                    <button data-set-penalty-action="calc-20pct" style="margin-top: 5px; padding: 5px 15px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                        按订单金额20%计算
                    </button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">罚款原因</label>
                    <textarea id="penalty-reason" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;" placeholder="说明罚款原因..."></textarea>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button data-set-penalty-action="submit" data-arb-id="${targetId}" style="flex: 1; padding: 12px; background: #f39c12; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        确认设置
                    </button>
                    <button data-set-penalty-action="cancel" style="flex: 1; padding: 12px; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        取消
                    </button>
                </div>
            </div>
        `;
        
        container.addEventListener('click', (e) => {
            if (e.target === container) this.closeModalByType('set-penalty');
        });

        const orderAmountInput = container.querySelector('#order-amount');
        const penaltyAmountInput = container.querySelector('#penalty-amount');

        container.querySelectorAll('[data-set-penalty-action]').forEach(node => {
            const action = node.getAttribute('data-set-penalty-action') || '';
            node.addEventListener('click', () => {
                if (action === 'calc-20pct') {
                    const amount = Number(orderAmountInput?.value || '0');
                    const calcAmount = Number.isFinite(amount) && amount > 0 ? amount * 0.2 : 0;
                    if (penaltyAmountInput) {
                        penaltyAmountInput.value = calcAmount.toFixed(2);
                    }
                    return;
                }

                if (action === 'cancel') {
                    this.closeModalByType('set-penalty');
                    return;
                }

                if (action === 'submit') {
                    const actionId = Number(node.getAttribute('data-arb-id') || '0');
                    if (!Number.isInteger(actionId) || actionId <= 0) {
                        this.showAlert('仲裁记录 ID 无效', 'warning');
                        return;
                    }
                    this.submitPenalty(actionId);
                }
            });
        });
        
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
            await this.authFetch(`/api/arbitration-requests/${arbitrationId}/penalty`, {
                method: 'POST',
                body: JSON.stringify({
                    penalty_party: party,
                    penalty_amount: amount,
                    penalty_reason: reason,
                    order_amount: orderAmount
                })
            });
            
            this.showAlert('罚款设置成功', 'success');
            
            // 关闭弹窗
            this.closeModalByType('set-penalty');
            
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
        const targetId = Number(arbitrationId);
        if (!Number.isInteger(targetId) || targetId <= 0) {
            this.showAlert('仲裁记录 ID 无效', 'warning');
            return;
        }

        const container = document.createElement('div');
        container.dataset.modalType = 'pay-penalty';
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
                    <button data-pay-penalty-action="submit" data-arb-id="${targetId}" style="flex: 1; padding: 12px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        提交支付凭证
                    </button>
                    <button data-pay-penalty-action="cancel" style="flex: 1; padding: 12px; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        取消
                    </button>
                </div>
            </div>
        `;
        
        container.addEventListener('click', (e) => {
            if (e.target === container) this.closeModalByType('pay-penalty');
        });

        container.querySelectorAll('[data-pay-penalty-action]').forEach(node => {
            const action = node.getAttribute('data-pay-penalty-action') || '';
            node.addEventListener('click', () => {
                if (action === 'cancel') {
                    this.closeModalByType('pay-penalty');
                    return;
                }

                if (action === 'submit') {
                    const actionId = Number(node.getAttribute('data-arb-id') || '0');
                    if (!Number.isInteger(actionId) || actionId <= 0) {
                        this.showAlert('仲裁记录 ID 无效', 'warning');
                        return;
                    }
                    this.submitPenaltyPayment(actionId);
                }
            });
        });
        
        document.body.appendChild(container);
        
        // 文件预览
        const proofInput = container.querySelector('#penalty-proof');
        proofInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const preview = container.querySelector('#proof-preview');
                preview.innerHTML = '';
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const img = document.createElement('img');
                        img.src = evt.target.result;
                        img.style.maxWidth = '100%';
                        img.style.maxHeight = '200px';
                        img.style.borderRadius = '8px';
                        preview.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                } else {
                    const text = document.createElement('p');
                    text.style.color = '#666';
                    text.textContent = `📄 ${file.name}`;
                    preview.appendChild(text);
                }
            }
        });
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
            
            const response = await this.authFetch(`/api/arbitration-requests/${arbitrationId}/pay-penalty`, {
                method: 'POST',
                body: formData
            });
            this.showAlert('支付凭证已提交，等待管理员确认', 'success');
            
            // 关闭弹窗
            this.closeModalByType('pay-penalty');
            
            // 刷新列表
            setTimeout(() => {
                this.loadMyArbitrations();
            }, 1000);
            
        } catch (err) {
            console.error('提交支付失败:', err);
            this.showAlert(err.message || '提交失败，请重试', 'error');
        }
    },

    // ─────────────────────────── 意向投递系统 ───────────────────────────

    /**
     * 打开「发起意向」提交模态框
     * @param {{ target_type: string, target_id: string|number, target_no: string, target_name: string }} data
     */
    openIntentionModal(data = {}) {
        this._intentionTarget = { ...data };
        const modal = document.getElementById('intention-submit-modal');
        const labelEl = document.getElementById('intention-modal-target');
        if (!modal) return;
        // 重置表单
        document.getElementById('intention-weight').value = '';
        document.getElementById('intention-date').value = '';
        document.getElementById('intention-notes').value = '';
        // 显示目标信息
        const typeLabels = { farmer_report: '农户供货', recycler_request: '回收商求购', processor_request: '处理商求购' };
        const typeLabel = typeLabels[data.target_type] || '需求';
        labelEl.textContent = `目标：${typeLabel}${data.target_no ? ' · 编号 ' + data.target_no : ''}${data.target_name ? ' · ' + data.target_name : ''}`;
        modal.style.display = 'flex';
    },

    closeIntentionModal() {
        const modal = document.getElementById('intention-submit-modal');
        if (modal) modal.style.display = 'none';
        this._intentionTarget = null;
    },

    async submitIntention() {
        const target = this._intentionTarget;
        if (!target || !target.target_type || !target.target_id) {
            return this.showAlert('意向目标信息缺失，请重试', 'error');
        }
        const weight = parseFloat(document.getElementById('intention-weight').value);
        if (!weight || weight <= 0) {
            return this.showAlert('请填写有效的预估供货量', 'warning');
        }
        const date  = document.getElementById('intention-date').value;
        const notes = document.getElementById('intention-notes').value.trim();
        try {
            await this.authFetch('/api/intentions', {
                method: 'POST',
                body: JSON.stringify({
                    applicant_id:      this.currentUser.id,
                    applicant_name:    this.currentUser.name || this.currentUser.username || '',
                    target_type:       target.target_type,
                    target_id:         target.target_id,
                    target_no:         target.target_no || '',
                    target_name:       target.target_name || '',
                    estimated_weight:  weight,
                    expected_date:     date || null,
                    notes:             notes
                })
            });
            this.closeIntentionModal();
            this.showAlert('✅ 意向已提交，等待对方回复', 'success');
        } catch (err) {
            this.showAlert(err.message || '提交失败，请重试', 'error');
        }
    },

    /**
     * 查看某需求收到的所有意向（需求方视角）
     */
    async viewIntentions(target_type, target_id, target_no) {
        const modal = document.getElementById('intention-list-modal');
        const body  = document.getElementById('intention-list-body');
        if (!modal || !body) return;
        body.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">加载中…</p>';
        modal.style.display = 'flex';
        const statusLabels = { pending: '待处理', accepted: '已接受', rejected: '已拒绝' };
        const statusColors  = { pending: '#f39c12', accepted: '#27ae60', rejected: '#e74c3c' };
        try {
            const rows = await this.authFetch(`/api/intentions?target_type=${encodeURIComponent(target_type)}&target_id=${encodeURIComponent(target_id)}`);
            if (!rows || rows.length === 0) {
                body.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">暂无意向投递</p>';
                return;
            }
            body.innerHTML = rows.map(r => {
                const safeId = Number(r.id);
                const idAttr = Number.isInteger(safeId) && safeId > 0 ? String(safeId) : '';
                const safeApplicant = this.escapeHtml(r.applicant_name || '匿名用户');
                const safeStatusLabel = this.escapeHtml(statusLabels[r.status] || r.status || '未知状态');
                const safeStatusColor = statusColors[r.status] || '#95a5a6';
                const estimatedWeight = Number(r.estimated_weight);
                const safeEstimatedWeight = Number.isFinite(estimatedWeight) && estimatedWeight > 0
                    ? String(estimatedWeight)
                    : this.escapeHtml(r.estimated_weight || '--');
                const safeExpectedDate = this.escapeHtml(r.expected_date || '');
                const safeNotes = this.escapeHtml(r.notes || '');
                const safeCreatedAt = this.escapeHtml(r.created_at || '--');

                return `
                <div style="padding:14px;border:1px solid #eee;border-radius:10px;margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <strong style="font-size:15px;">${safeApplicant}</strong>
                        <span style="background:${safeStatusColor};color:#fff;padding:3px 10px;border-radius:20px;font-size:12px;">${safeStatusLabel}</span>
                    </div>
                    <p style="margin:4px 0;font-size:14px;color:#555;">预估供货：<strong>${safeEstimatedWeight} 斤</strong>${safeExpectedDate ? `　期望日期：${safeExpectedDate}` : ''}</p>
                    ${safeNotes ? `<p style="margin:4px 0;font-size:13px;color:#777;">💬 ${safeNotes}</p>` : ''}
                    <p style="margin:6px 0 0;font-size:12px;color:#bbb;">${safeCreatedAt}</p>
                    ${r.status === 'pending' && idAttr ? `
                    <div style="display:flex;gap:8px;margin-top:10px;">
                        <button data-intention-action="accepted" data-intention-id="${idAttr}" style="flex:1;padding:7px;border:none;border-radius:6px;background:#27ae60;color:#fff;cursor:pointer;font-size:13px;">✅ 接受</button>
                        <button data-intention-action="rejected" data-intention-id="${idAttr}" style="flex:1;padding:7px;border:none;border-radius:6px;background:#e74c3c;color:#fff;cursor:pointer;font-size:13px;">❌ 拒绝</button>
                    </div>` : ''}
                </div>
            `;
            }).join('');

            body.querySelectorAll('[data-intention-action]').forEach(node => {
                const action = node.getAttribute('data-intention-action') || '';
                node.addEventListener('click', () => {
                    const intentionId = Number(node.getAttribute('data-intention-id') || '0');
                    if (!Number.isInteger(intentionId) || intentionId <= 0) {
                        this.showAlert('意向记录 ID 无效', 'warning');
                        return;
                    }

                    if (action === 'accepted' || action === 'rejected') {
                        this.updateIntentionStatus(intentionId, action, node);
                    }
                });
            });
        } catch (err) {
            body.innerHTML = `<p style="color:#e74c3c;text-align:center;padding:20px;">${this.escapeHtml(err.message || '加载失败')}</p>`;
        }
    },

    async updateIntentionStatus(id, status, btn) {
        const actionBtn = btn && typeof btn === 'object' ? btn : null;
        try {
            if (actionBtn) actionBtn.disabled = true;
            const result = await this.authFetch(`/api/intentions/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });

            if (status === 'accepted' && result && result.order_no) {
                this.showAlert(`✅ 已接受意向！已自动生成订单：${result.order_no}，请前往订单管理查看。`, 'success');
            } else {
                this.showAlert(status === 'accepted' ? '已接受该意向' : '已拒绝该意向', 'success');
            }

            // 更新卡片状态标签并移除操作按钮
            const card = actionBtn?.closest('div[style]');
            if (card) {
                const statusColors = { accepted: '#27ae60', rejected: '#e74c3c' };
                const statusLabels = { accepted: '已接受', rejected: '已拒绝' };
                const badge = card.querySelector('span[style*="border-radius:20px"]');
                if (badge) {
                    badge.textContent = statusLabels[status];
                    badge.style.background = statusColors[status];
                }
                if (status === 'accepted' && result && result.order_no) {
                    const orderTag = document.createElement('p');
                    orderTag.style.cssText = 'margin:6px 0 0;font-size:12px;color:#27ae60;font-weight:bold;';
                    orderTag.textContent = `📦 订单：${result.order_no}`;
                    card.appendChild(orderTag);
                }
                const btnsDiv = card.querySelector('div[style*="display:flex;gap:8px"]');
                if (btnsDiv) btnsDiv.remove();
            }
        } catch (err) {
            this.showAlert(err.message || '操作失败', 'error');
            if (actionBtn) actionBtn.disabled = false;
        }
    },

    closeIntentionListModal() {
        const modal = document.getElementById('intention-list-modal');
        if (modal) modal.style.display = 'none';
    }

};

// ====== 页面加载完成后初始化 ======
document.addEventListener('DOMContentLoaded', () => {
    authSystem.init();
});

// 将 authFetch 代理到全局，供 userProfile.js 等外部脚本调用
window.authFetch = (...args) => authSystem.authFetch(...args);
