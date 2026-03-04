/**
 * 光伏成本智能分析助手 - 前端逻辑
 */

// API 基础地址
// 演示版：使用模拟数据，无需后端服务
const API_BASE_URL = '';
const DEMO_MODE = true;

// 会话历史
let sessionHistory = JSON.parse(localStorage.getItem('cost_history') || '[]');

// 常用模板
const templates = {
  perc_cost: '计算PERC电池片(182mm)单位成本，硅片3.5元/片，正银浆110mg/片，良率98%',
  module_cost: '分析182组件成本，电池片成本0.35元/W，功率550W',
  variance_analysis: '分析本月成本涨价原因，标准成本2.1元/W，实际成本2.25元/W',
  wafer_impact: '如果硅片价格从3.5元上涨到4.2元，对PERC电池片成本的影响'
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initButtons();
  loadMaterialPrices();
  renderHistory();
});

// 选项卡切换
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const panels = document.querySelectorAll('.tab-panel');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // 更新选项卡状态
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // 切换面板
      panels.forEach(panel => {
        panel.classList.remove('active');
      });
      document.getElementById(`${targetTab}-panel`).classList.add('active');
    });
  });
}

// 按钮事件
function initButtons() {
  // BOM成本核算
  document.getElementById('calcBtn')?.addEventListener('click', calculateCost);
  document.getElementById('clearBtn')?.addEventListener('click', clearInput);
  
  // 差异分析
  document.getElementById('varianceBtn')?.addEventListener('click', analyzeVariance);
  
  // 敏感性分析
  document.getElementById('sensitivityBtn')?.addEventListener('click', analyzeSensitivity);
}

// 加载原材料价格
async function loadMaterialPrices() {
  const container = document.getElementById('materialPrices');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/materials/prices`);
    const data = await response.json();
    
    if (data.materials) {
      container.innerHTML = data.materials.map(m => `
        <div class="price-item">
          <span class="price-name">${m.name}</span>
          <div>
            <span class="price-value">${m.price}</span>
            <span class="price-unit">${m.unit}</span>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    // 如果API不可用，使用默认数据
    const defaultPrices = [
      { name: 'M10硅片', price: 3.50, unit: '元/片' },
      { name: 'G12硅片', price: 4.80, unit: '元/片' },
      { name: '正银浆', price: 8.00, unit: '元/g' },
      { name: '背银浆', price: 5.50, unit: '元/g' },
      { name: '铝浆', price: 0.018, unit: '元/g' }
    ];
    
    container.innerHTML = defaultPrices.map(m => `
      <div class="price-item">
        <span class="price-name">${m.name}</span>
        <div>
          <span class="price-value">${m.price}</span>
          <span class="price-unit">${m.unit}</span>
        </div>
      </div>
    `).join('');
  }
}

// 加载模板
function loadTemplate(templateKey) {
  const input = document.getElementById('costInput');
  if (templates[templateKey]) {
    input.value = templates[templateKey];
  }
}

// BOM成本计算
async function calculateCost() {
  const input = document.getElementById('costInput');
  const productType = document.getElementById('productType')?.value || 'cell';
  const cellType = document.getElementById('cellType')?.value || 'PERC';
  
  if (!input.value.trim()) {
    alert('请输入成本分析需求');
    return;
  }
  
  const btn = document.getElementById('calcBtn');
  btn.disabled = true;
  btn.textContent = '分析中...';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/cost/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: input.value,
        product_type: productType,
        cell_type: cellType
      })
    });
    
    const result = await response.json();
    displayResult(result);
    addToHistory(input.value, '成本核算', result);
  } catch (error) {
    // 演示模式：显示模拟结果
    const mockResult = {
      success: true,
      message: '演示模式（后端未连接）',
      result: {
        unit_cost: 0.8523,
        currency: '元/W',
        cost_breakdown: [
          { item: '硅片', cost: 3.57, pct: 45 },
          { item: '正银浆', cost: 0.96, pct: 12 },
          { item: '背银浆', cost: 0.35, pct: 4 },
          { item: '铝浆', cost: 0.11, pct: 1.4 },
          { item: '化学品', cost: 0.15, pct: 2 },
          { item: '人工', cost: 0.08, pct: 1 },
          { item: '制造费用', cost: 0.12, pct: 1.5 }
        ],
        code: '# Python 计算代码将在此处生成\nunit_cost = 0.8523'
      }
    };
    displayResult(mockResult);
    addToHistory(input.value, '成本核算（演示）', mockResult);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">🔍</span> 开始分析';
  }
}

// 显示结果
function displayResult(result) {
  const section = document.getElementById('resultSection');
  const content = document.getElementById('resultContent');
  
  section.style.display = 'block';
  
  if (result.result) {
    const r = result.result;
    content.innerHTML = `
      <div class="result-card">
        <div class="result-title">单位成本</div>
        <div>
          <span class="result-value">${r.unit_cost}</span>
          <span class="result-unit">${r.currency}</span>
        </div>
      </div>
      <div class="result-card">
        <div class="result-title">成本构成</div>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <thead>
            <tr style="border-bottom:1px solid var(--border);">
              <th style="text-align:left;padding:8px;">成本项目</th>
              <th style="text-align:right;padding:8px;">金额(元)</th>
              <th style="text-align:right;padding:8px;">占比</th>
            </tr>
          </thead>
          <tbody>
            ${r.cost_breakdown?.map(item => `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:8px;">${item.item}</td>
                <td style="text-align:right;padding:8px;">${item.cost}</td>
                <td style="text-align:right;padding:8px;">${item.pct}%</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
      </div>
      <div class="result-card">
        <div class="result-title">Python 代码</div>
        <pre style="background:#1e293b;color:#e2e8f0;padding:16px;border-radius:8px;overflow-x:auto;"><code>${r.code}</code></pre>
        <button class="btn btn-secondary" style="margin-top:12px;" onclick="copyCode('${encodeURIComponent(r.code)}')">
          复制代码
        </button>
      </div>
    `;
  } else {
    content.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
  }
  
  // 重新渲染数学公式
  if (window.MathJax) {
    window.MathJax.typeset();
  }
}

// 差异分析
async function analyzeVariance() {
  const stdCost = document.getElementById('stdCost')?.value;
  const actualCost = document.getElementById('actualCost')?.value;
  const volume = document.getElementById('prodVolume')?.value;
  
  if (!stdCost || !actualCost) {
    alert('请输入标准成本和实际成本');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/cost/variance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `成本差异分析`,
        standard_cost: parseFloat(stdCost),
        actual_cost: parseFloat(actualCost),
        production_volume: parseFloat(volume || 0)
      })
    });
    
    const result = await response.json();
    alert('差异分析完成，请查看控制台');
    console.log(result);
  } catch (error) {
    alert('演示模式：差异分析功能开发中');
  }
}

// 敏感性分析
async function analyzeSensitivity() {
  const input = document.getElementById('sensitivityInput');
  
  if (!input.value.trim()) {
    alert('请输入敏感性分析需求');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/cost/sensitivity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.value })
    });
    
    const result = await response.json();
    alert('敏感性分析完成');
    console.log(result);
  } catch (error) {
    alert('演示模式：敏感性分析功能开发中');
  }
}

// 清空输入
function clearInput() {
  document.getElementById('costInput').value = '';
  document.getElementById('resultSection').style.display = 'none';
}

// 复制代码
function copyCode(code) {
  const decoded = decodeURIComponent(code);
  navigator.clipboard.writeText(decoded).then(() => {
    alert('代码已复制到剪贴板');
  });
}

// 添加到历史
function addToHistory(text, type, result) {
  const item = {
    id: Date.now(),
    text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
    type: type,
    time: new Date().toLocaleString(),
    result: result
  };
  
  sessionHistory.unshift(item);
  if (sessionHistory.length > 20) {
    sessionHistory = sessionHistory.slice(0, 20);
  }
  
  localStorage.setItem('cost_history', JSON.stringify(sessionHistory));
  renderHistory();
}

// 渲染历史记录
function renderHistory() {
  const container = document.getElementById('historyList');
  
  if (sessionHistory.length === 0) {
    container.innerHTML = '<p class="empty-tip">暂无历史记录</p>';
    return;
  }
  
  container.innerHTML = sessionHistory.map(item => `
    <div class="history-item" onclick="loadHistoryItem(${item.id})">
      <div class="history-title">${item.type} - ${item.text}</div>
      <div class="history-meta">${item.time}</div>
    </div>
  `).join('');
}

// 加载历史项
function loadHistoryItem(id) {
  const item = sessionHistory.find(h => h.id === id);
  if (item && item.result) {
    displayResult(item.result);
    // 切换到结果面板
    document.querySelector('[data-tab="cost-calc"]').click();
  }
}

// 全局函数暴露
window.loadTemplate = loadTemplate;
window.copyCode = copyCode;
window.loadHistoryItem = loadHistoryItem;
