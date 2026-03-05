/**
 * 光伏成本智能分析助手 - 前端逻辑
 * 版本: 3.0 - 仅显示后端数据
 */

// API 基础地址
const API_BASE_URL = 'https://factor.zoengsang.cloud';

// 当前价格数据（从后端获取）
let priceData = {};
let lastUpdate = null;

// 分类排序
const CATEGORY_ORDER = ['硅片', '电池片', '硅料', '银浆', '玻璃', '胶膜', '其他'];

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
  if (!container) return;
  
  // 按分类分组
  const byCategory = {};
  Object.values(priceData).forEach(item => {
    const cat = item.category || '其他';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });
  
  // 按预设顺序渲染
  let html = '';
  CATEGORY_ORDER.forEach(cat => {
    if (byCategory[cat]) {
      html += `<div class="category-header">${cat}</div>`;
      byCategory[cat].forEach(item => {
        html += renderPriceItem(item);
      });
    }
  });
  
  container.innerHTML = html || '<div style="padding:20px;text-align:center;color:#999;">暂无数据</div>';
  
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
  const highLow = item.high && item.low ? `<small>高:${item.high} 低:${item.low}</small>` : '';
  
  return `
    <div class="price-item">
      <div>
        <span class="price-name">${item.name}</span>
        <small style="display:block;color:#999;">${item.source || 'API'}</small>
      </div>
      <div style="text-align:right">
        <div>
          <span class="price-value">${item.price}</span>
          <span class="price-unit">${item.unit}</span>
        </div>
        <span class="price-trend ${trendClass}">${trendIcon}</span>
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
  
  section.style.display = 'block';
  content.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card highlight">
        <div class="metric-label">单位成本</div>
        <div class="metric-value">${result.unit_cost}</div>
        <div class="metric-unit">${result.currency}</div>
      </div>
    </div>
    <div class="result-card">
      <div>电池片价格: ${result.cell_price} 元/W</div>
      <div>硅片价格: ${result.wafer_price} 元/片</div>
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
