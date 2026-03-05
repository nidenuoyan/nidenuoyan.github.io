/**
 * 光伏成本智能分析助手 - 前端逻辑
 * 版本: 3.0 - 仅显示后端数据
 */

// API 基础地址
const API_BASE_URL = 'https://factor.zoengsang.cloud';

// 当前价格数据（从后端获取）
let priceData = {};
let lastUpdate = null;

// 分类排序（匹配后端）
const CATEGORY_ORDER = ['硅片', '电池片', '硅料', '银浆', '玻璃', '胶膜', '背板', '边框', '焊带', '电气', '靶材', '网版', '石英', '化学品', '铝浆', '金属', '其他'];

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[初始化] 开始...');
  
  initTabs();
  initButtons();
  initSearch();
  
  // 从后端获取价格
  await loadPricesFromAPI();
  
  renderHistory();
  initCharts();
  
  console.log('[初始化] 完成');
});

// 从后端 API 获取价格
async function loadPricesFromAPI() {
  try {
    showLoading('正在加载价格数据...');
    
    const response = await fetch(`${API_BASE_URL}/api/prices`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      priceData = result.data;
      lastUpdate = result.last_update;
      console.log(`[API] 获取到 ${Object.keys(priceData).length} 条价格`);
      
      renderPriceList();
      showToast('价格数据已更新', 'success');
    } else {
      throw new Error('数据格式错误');
    }
  } catch (error) {
    console.error('[API] 获取失败:', error);
    showToast('获取价格失败', 'error');
  } finally {
    hideLoading();
  }
}

// 渲染价格列表
function renderPriceList() {
  const container = document.getElementById('materialPrices');
  if (!container) {
    console.error('[渲染] 找不到 materialPrices 容器');
    return;
  }
  
  console.log('[渲染] 数据条目:', Object.keys(priceData).length);
  
  // 按分类分组
  const byCategory = {};
  Object.values(priceData).forEach(item => {
    const cat = item.category || '其他';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });
  
  console.log('[渲染] 分类:', Object.keys(byCategory));
  
  // 按预设顺序渲染
  let html = '';
  CATEGORY_ORDER.forEach(cat => {
    if (byCategory[cat] && byCategory[cat].length > 0) {
      html += `<div class="category-header" style="padding:10px 15px;background:#f5f5f5;font-weight:bold;border-left:3px solid #1890ff;margin-top:10px;">${cat}</div>`;
      byCategory[cat].forEach(item => {
        html += renderPriceItem(item);
      });
    }
  });
  
  if (!html) {
    html = '<div style="padding:20px;text-align:center;color:#999;">暂无数据</div>';
  }
  
  container.innerHTML = html;
  console.log('[渲染] 完成，HTML长度:', html.length);
  
  // 更新时间显示
  const updateTime = document.getElementById('updateTime');
  if (updateTime && lastUpdate) {
    updateTime.textContent = new Date(lastUpdate).toLocaleString('zh-CN');
  }
}

// 渲染单个价格项
function renderPriceItem(item) {
  const trendIcon = item.trend === 'up' ? '📈' : item.trend === 'down' ? '📉' : '➡️';
  const trendClass = item.trend === 'up' ? 'up' : item.trend === 'down' ? 'down' : '';
  const trendColor = item.trend === 'up' ? '#f5222d' : item.trend === 'down' ? '#52c41a' : '#999';
  const highLow = item.high && item.low ? `<small style="color:#999">高:${item.high} 低:${item.low}</small>` : '';
  
  return `
    <div class="price-item" style="display:flex;justify-content:space-between;padding:12px 15px;border-bottom:1px solid #eee;align-items:center;">
      <div>
        <div style="font-weight:500;color:#333;">${item.name}</div>
        <small style="color:#999;font-size:11px;">${item.source || 'API'}</small>
      </div>
      <div style="text-align:right">
        <div style="font-size:16px;font-weight:bold;color:#1890ff;">
          ${item.price}
          <span style="font-size:12px;color:#666;font-weight:normal;">${item.unit}</span>
        </div>
        <div style="font-size:12px;color:${trendColor};">${trendIcon} ${item.trend || 'stable'}</div>
        ${highLow}
      </div>
    </div>
  `;
}

// 刷新价格
async function refreshPrices() {
  await loadPricesFromAPI();
}

// 成本计算
async function calculateCost() {
  const input = document.getElementById('costInput');
  const productType = document.getElementById('productType')?.value || 'cell';
  const cellType = document.getElementById('cellType')?.value || 'PERC';
  const sizeSpec = document.getElementById('sizeSpec')?.value || '182';
  
  showLoading('正在计算...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/cost/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_type: productType,
        cell_type: cellType,
        size_spec: sizeSpec
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      displayCostResult(result.result);
      showToast('计算完成', 'success');
    }
  } catch (error) {
    showToast('计算失败', 'error');
  } finally {
    hideLoading();
  }
}

// 显示成本结果
function displayCostResult(result) {
  const section = document.getElementById('costResultSection');
  const content = document.getElementById('costResultContent');
  
  if (!section || !content) return;
  
  // 构建成本分解表格
  let breakdownHtml = '';
  if (result.breakdown) {
    breakdownHtml = `
      <div class="result-card">
        <div class="result-title">📊 成本分解</div>
        <table class="cost-table">
          <thead>
            <tr><th>项目</th><th>金额(元/W)</th><th>占比</th></tr>
          </thead>
          <tbody>
            ${Object.entries(result.breakdown).map(([key, val]) => `
              <tr>
                <td>${key}</td>
                <td class="text-right">${val}</td>
                <td class="text-right">${((val/result.unit_cost)*100).toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  section.style.display = 'block';
  content.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card highlight">
        <div class="metric-label">单位成本</div>
        <div class="metric-value">${result.unit_cost}</div>
        <div class="metric-unit">${result.currency}</div>
      </div>
      ${result.efficiency ? `
      <div class="metric-card">
        <div class="metric-label">转换效率</div>
        <div class="metric-value">${result.efficiency}%</div>
      </div>
      ` : ''}
    </div>
    ${breakdownHtml}
    <div class="result-card">
      <div class="result-title">ℹ️ 计算说明</div>
      <ul style="color:var(--text-muted);padding-left:20px;">
        <li>技术路线: <strong>${result.cell_type}</strong></li>
        <li>尺寸规格: <strong>${result.size}mm</strong></li>
        <li>银浆成本已按单片耗量计算</li>
        <li>加工费包含人工、折旧、能耗等</li>
      </ul>
    </div>
  `;
}

// 显示/隐藏加载
function showLoading(msg) {
  const mask = document.getElementById('loadingMask');
  if (mask) {
    mask.querySelector('p').textContent = msg;
    mask.style.display = 'flex';
  }
}

function hideLoading() {
  const mask = document.getElementById('loadingMask');
  if (mask) mask.style.display = 'none';
}

// 模板定义
const templates = {
  perc_cost: '计算PERC电池片(182mm)单位成本，硅片价格1.08元/片，正银浆90mg/片，背银浆60mg/片，良率98.5%',
  topcon_cost: '计算TOPCon电池片(182mm)单位成本，硅片价格1.08元/片，正银浆100mg/片，背银浆40mg/片，良率96%',
  hjt_cost: '计算HJT电池片(210mm)单位成本，硅片价格1.40元/片，低温银浆180mg/片，靶材成本0.04元/W，良率94%',
  bc_cost: '计算BC电池片(182mm)单位成本，硅片价格1.08元/片，BC专用银浆85mg/片，无背银浆，良率95%',
  ibc_cost: '计算IBC电池片(210mm)单位成本，硅片价格1.40元/片，IBC专用银浆80mg/片，无背银浆，良率94%，效率27%',
  module_182: '分析182组件成本，电池片成本0.31元/W，功率550W，玻璃3.2mm，EVA胶膜',
  module_210: '分析210组件成本，电池片成本0.42元/W，功率660W，玻璃2.0mm，POE胶膜',
  variance_analysis: '分析本月成本涨价原因，标准成本0.35元/W，实际成本0.38元/W，产量1000MW',
  wafer_impact: '如果M10硅片价格从1.08元上涨到1.35元，对PERC电池片成本的影响有多大？',
  silver_impact: '分析银浆价格波动对TOPCon电池片成本的影响，当前银浆价格7850元/kg'
};

// 加载模板
function loadTemplate(templateKey) {
  const input = document.getElementById('costInput');
  if (input && templates[templateKey]) {
    input.value = templates[templateKey];
    input.focus();
    showToast('模板已加载', 'success');
    
    // 自动选择对应的技术路线
    const cellTypeSelect = document.getElementById('cellType');
    if (cellTypeSelect) {
      if (templateKey.includes('perc')) cellTypeSelect.value = 'PERC';
      else if (templateKey.includes('topcon')) cellTypeSelect.value = 'TOPCon';
      else if (templateKey.includes('hjt')) cellTypeSelect.value = 'HJT';
      else if (templateKey.includes('ibc')) cellTypeSelect.value = 'IBC';
      else if (templateKey.includes('bc')) cellTypeSelect.value = 'BC';
    }
  }
}

// 显示提示
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
  }
}

// 初始化选项卡
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const target = tab.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`${target}-panel`)?.classList.add('active');
    });
  });
}

// 初始化按钮
function initButtons() {
  document.getElementById('calcBtn')?.addEventListener('click', calculateCost);
  document.getElementById('clearBtn')?.addEventListener('click', () => {
    const input = document.getElementById('costInput');
    if (input) input.value = '';
  });
}

// 初始化搜索
function initSearch() {
  const searchInput = document.getElementById('priceSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterPrices(e.target.value);
    });
  }
}

// 过滤价格
function filterPrices(searchTerm) {
  const term = searchTerm.toLowerCase();
  const filtered = {};
  
  Object.entries(priceData).forEach(([key, item]) => {
    if (item.name.toLowerCase().includes(term)) {
      filtered[key] = item;
    }
  });
  
  // 临时替换数据并渲染
  const originalData = priceData;
  priceData = filtered;
  renderPriceList();
  priceData = originalData;
}

// 历史记录
function renderHistory() {
  // 简化版，可根据需要扩展
}

// 图表初始化
function initCharts() {
  // 简化版，可根据需要扩展
}
