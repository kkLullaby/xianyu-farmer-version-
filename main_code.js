/**
 * 农业废品回收系统 - 核心业务逻辑
 */

// 1. 统一管理初始化逻辑
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
});

/**
 * 导航初始化函数：设置点击监听
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-list a');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const menuText = link.innerText;

            // 路由分发逻辑
            if (menuText.includes('返回首页') || menuText.includes('我的首页') || menuText.includes('仪表板')) {
                // 根据用户身份返回对应仪表板
                if (authSystem.currentUser) {
                    authSystem.redirectToDashboard();
                }
            } 
            else if (menuText.includes('柑肉处理申报')) {
                renderReportForm(); 
            }
            else {
                // 如果点击了还没写的菜单，给个提示
                document.getElementById('content-area').innerHTML = `<h1>正在开发中...</h1><p>您点击了：${menuText}</p>`;
            }
        });
    });
}

/**
 * 页面渲染函数：柑肉处理申报表单
 */
function renderReportForm() {
    const container = document.getElementById('content-area');
    
    container.innerHTML = `
        <div class="form-container" style="animation: fadeIn 0.5s;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #1abc9c; padding-bottom: 10px;">
                ♻️ 柑肉无害化处理申报
            </h2>
            <form id="waste-form" style="display: grid; gap: 15px; margin-top: 20px; max-width: 500px;">
                <label>
                    <strong>处理日期：</strong><br>
                    <input type="date" id="date" style="width: 100%; padding: 8px; margin-top: 5px;">
                </label>
                
                <label>
                    <strong>处理重量 (斤)：</strong><br>
                    <input type="number" id="weight" placeholder="请输入重量" style="width: 100%; padding: 8px; margin-top: 5px;">
                </label>
                
                <label>
                    <strong>处理地点：</strong><br>
                    <select id="location" style="width: 100%; padding: 8px; margin-top: 5px;">
                        <option value="factory_1">第一无害化处理厂</option>
                        <option value="factory_2">三江镇集散中心</option>
                        <option value="factory_3">双水镇处理点</option>
                    </select>
                </label>
                
                <label>
                    <strong>备注说明：</strong><br>
                    <textarea id="note" rows="3" style="width: 100%; padding: 8px; margin-top: 5px;"></textarea>
                </label>
                
                <button type="button" onclick="submitReport()" style="
                    background: #1abc9c; color: white; border: none; 
                    padding: 12px; cursor: pointer; border-radius: 4px; font-weight: bold;">
                    提交申报信息
                </button>
            </form>
        </div>
        <style>
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    `;
}

/**
 * 业务逻辑：提交申报表单
 */
function submitReport() {
    const weight = document.getElementById('weight').value;
    const date = document.getElementById('date').value;

    if (!weight || !date) {
        alert('请完整填写日期和重量！');
        return;
    }
    
    alert(`【系统消息】申报成功！\n日期：${date}\n重量：${weight} 斤`);
    document.getElementById('waste-form').reset();
}
