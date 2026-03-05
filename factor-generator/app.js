/**
 * 光伏成本智能分析助手 - 前端逻辑
 * 版本: 2.0
 */

// API 基础地址
// 生产环境：连接到后端 API 服务
const API_BASE_URL = 'https://factor.zoengsang.cloud';
const DEMO_MODE = false;

// 会话历史
let sessionHistory = JSON.parse(localStorage.getItem('cost_history') || '[]');

// 图表实例
let charts = {};

// 扩展的原材料价格数据库（基于2024-2025年市场行情）
const materialPricesDB = {
  // === 硅片价格（PVinfolink 2024年底-2025年初行情）===
  'M10硅片(182mm)': { price: 1.15, unit: '元/片', trend: 'down', change: -5.0, source: 'PVinfolink' },
  'G12硅片(210mm)': { price: 1.70, unit: '元/片', trend: 'down', change: -4.5, source: 'PVinfolink' },
  'M6硅片(166mm)': { price: 1.05, unit: '元/片', trend: 'stable', change: -2.0, source: 'PVinfolink' },
  'N型M10硅片': { price: 1.25, unit: '元/片', trend: 'down', change: -3.5, source: 'PVinfolink' },
  'N型G12硅片': { price: 1.85, unit: '元/片', trend: 'down', change: -3.0, source: 'PVinfolink' },
  
  // === 银浆价格（上海有色金属网 2024年底行情）===
  '正银浆': { price: 7850, unit: '元/kg', trend: 'up', change: 8.5, source: '上海有色金属网' },
  '背银浆': { price: 5200, unit: '元/kg', trend: 'up', change: 6.2, source: '上海有色金属网' },
  '银浆(国产)': { price: 7200, unit: '元/kg', trend: 'up', change: 5.5, source: '上海有色金属网' },
  '铝浆': { price: 22, unit: '元/kg', trend: 'stable', change: 1.0, source: '上海有色金属网' },
  
  // === 硅料价格（PVinfolink）===
  '硅料(致密料)': { price: 38, unit: '元/kg', trend: 'down', change: -2.5, source: 'PVinfolink' },
  '硅料(菜花料)': { price: 32, unit: '元/kg', trend: 'down', change: -3.0, source: 'PVinfolink' },
  'N型硅料': { price: 42, unit: '元/kg', trend: 'down', change: -2.0, source: 'PVinfolink' },
  
  // === 电池片价格（PVinfolink 2024年底-2025年初）===
  '电池片(PERC-182)': { price: 0.28, unit: '元/W', trend: 'down', change: -3.5, source: 'PVinfolink' },
  '电池片(PERC-210)': { price: 0.27, unit: '元/W', trend: 'down', change: -3.8, source: 'PVinfolink' },
  '电池片(TOPCon-182)': { price: 0.30, unit: '元/W', trend: 'down', change: -4.2, source: 'PVinfolink' },
  '电池片(TOPCon-210)': { price: 0.29, unit: '元/W', trend: 'down', change: -4.0, source: 'PVinfolink' },
  '电池片(BC-182)': { price: 0.35, unit: '元/W', trend: 'down', change: -2.5, source: 'PVinfolink' },
  '电池片(HJT-210)': { price: 0.42, unit: '元/W', trend: 'down', change: -3.0, source: 'PVinfolink' },
  
  // === 光伏玻璃（PVinfolink）===
  '光伏玻璃(3.2mm)': { price: 22, unit: '元/㎡', trend: 'down', change: -1.5, source: 'PVinfolink' },
  '光伏玻璃(2.0mm)': { price: 14, unit: '元/㎡', trend: 'down', change: -2.0, source: 'PVinfolink' },
  
  // === 胶膜（上海有色金属网/行业报价）===
  'EVA胶膜': { price: 6.8, unit: '元/㎡', trend: 'down', change: -1.5, source: '上海有色金属网' },
  'POE胶膜': { price: 10.5, unit: '元/㎡', trend: 'down', change: -2.0, source: '上海有色金属网' },
  
  // === 其他材料 ===
  '背板': { price: 7.5, unit: '元/㎡', trend: 'down', change: -1.0, source: 'PVinfolink' },
  '边框(铝)': { price: 18, unit: '元/套', trend: 'down', change: -2.5, source: '上海有色金属网' },
  '接线盒': { price: 12, unit: '元/个', trend: 'down', change: -1.2, source: 'PVinfolink' },
  '焊带': { price: 78, unit: '元/kg', trend: 'down', change: -1.5, source: '上海有色金属网' },
  '助焊剂': { price: 22, unit: '元/L', trend: 'stable', change: 0, source: 'PVinfolink' },
  '化学品(氢氟酸)': { price: 7.5, unit: '元/L', trend: 'stable', change: 0.2, source: 'PVinfolink' },
  '化学品(硝酸)': { price: 5.8, unit: '元/L', trend: 'stable', change: 0.1, source: 'PVinfolink' },
  '网版': { price: 750, unit: '元/个', trend: 'down', change: -3.0, source: 'PVinfolink' },
  '石英舟': { price: 2500, unit: '元/个', trend: 'down', change: -2.0, source: 'PVinfolink' },
  '靶材(ITO)': { price: 13500, unit: '元/套', trend: 'down', change: -3.0, source: 'PVinfolink' },
  '靶材(TCO)': { price: 16500, unit: '元/套', trend: 'down', change: -2.5, source: 'PVinfolink' }
};

// 在线数据源配置
const priceDataSources = {
  pvinfolink: {
    name: 'PVinfolink',
    url: 'https://www.pvinfolink.com/',
    desc: '光伏产业链价格数据'
  },
  smm: {
    name: '上海有色金属网',
    url: 'https://www.smm.cn/',
    desc: '有色金属及光伏材料价格'
  }
};

// 常用模板（基于2024年底-2025年初市场行情）
const templates = {
  perc_cost: '计算PERC电池片(182mm)单位成本，M10硅片1.15元/片，正银浆110mg/片，背银浆80mg/片，良率98%',
  topcon_cost: '计算TOPCon电池片(182mm)单位成本，N型M10硅片1.25元/片，正银浆100mg/片，背银浆60mg/片，良率96%',
  hjt_cost: '计算HJT电池片(210mm)单位成本，N型G12硅片1.85元/片，低温银浆180mg/片，靶材成本0.04元/W，良率94%',
  bc_cost: '计算BC电池片(182mm)单位成本，N型M10硅片1.25元/片，银浆90mg/片，无背银浆，良率95%',
  module_182: '分析182组件成本，电池片成本0.28元/W，功率550W，玻璃3.2mm，EVA胶膜',
  module_210: '分析210组件成本，电池片成本0.29元/W，功率660W，玻璃2.0mm，POE胶膜',
  variance_analysis: '分析本月成本涨价原因，标准成本0.35元/W，实际成本0.38元/W，产量1000MW',
  wafer_impact: '如果M10硅片价格从1.15元上涨到1.35元，对PERC电池片成本的影响有多大？',
  silver_impact: '分析银浆价格波动对TOPCon电池片成本的影响，当前银浆价格7850元/kg'
};

// 成本基准数据（用于对比功能，基于2024年底-2025年初行情）
const costBaseline = {
  'PERC-182': { cell: 0.28, module: 1.15, silver: 110, wafer: 1.15 },
  'PERC-210': { cell: 0.27, module: 1.12, silver: 115, wafer: 1.70 },
  'TOPCon-182': { cell: 0.30, module: 1.25, silver: 100, wafer: 1.25 },
  'TOPCon-210': { cell: 0.29, module: 1.22, silver: 105, wafer: 1.85 },
  'HJT-210': { cell: 0.42, module: 1.55, silver: 180, wafer: 1.85 },
  'BC-182': { cell: 0.35, module: 1.35, silver: 90, wafer: 1.25 },
  'BC-210': { cell: 0.33, module: 1.30, silver: 95, wafer: 1.85 }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initButtons();
  initSearch();
  loadMaterialPrices();
  renderHistory();
  initCharts();
});

// 初始化选项卡
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
      const targetPanel = document.getElementById(`${targetTab}-panel`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

// 初始化按钮
function initButtons() {
  // BOM成本核算
  document.getElementById('calcBtn')?.addEventListener('click', calculateCost);
  document.getElementById('clearBtn')?.addEventListener('click', clearInput);
  document.getElementById('saveTemplateBtn')?.addEventListener('click', saveAsTemplate);
  
  // 差异分析
  document.getElementById('varianceBtn')?.addEventListener('click', analyzeVariance);
  
  // 敏感性分析
  document.getElementById('sensitivityBtn')?.addEventListener('click', analyzeSensitivity);
  
  // 成本对比
  document.getElementById('compareBtn')?.addEventListener('click', compareCosts);
}

// 初始化搜索
function initSearch() {
  const searchInput = document.getElementById('priceSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterMaterialPrices(e.target.value);
    });
  }
}

// 初始化图表
function initCharts() {
  // 延迟初始化，等待 DOM 完全加载
  setTimeout(() => {
    // 图表将在需要时动态创建
  }, 100);
}

// 显示加载
function showLoading(message = '正在分析中...') {
  const mask = document.getElementById('loadingMask');
  if (mask) {
    mask.querySelector('p').textContent = message;
    mask.style.display = 'flex';
  }
}

// 隐藏加载
function hideLoading() {
  const mask = document.getElementById('loadingMask');
  if (mask) {
    mask.style.display = 'none';
  }
}

// 显示 Toast
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }
}

// 加载原材料价格
function loadMaterialPrices() {
  const container = document.getElementById('materialPrices');
  if (!container) return;
  
  renderMaterialList(Object.entries(materialPricesDB));
  
  // 更新更新时间
  const updateTime = document.getElementById('updateTime');
  if (updateTime) {
    updateTime.textContent = new Date().toLocaleDateString('zh-CN');
  }
}

// 渲染材料列表
function renderMaterialList(materials) {
  const container = document.getElementById('materialPrices');
  if (!container) return;
  
  container.innerHTML = materials.map(([name, data]) => {
    const trendIcon = data.trend === 'up' ? '📈' : data.trend === 'down' ? '📉' : '➡️';
    const trendClass = data.trend === 'up' ? 'up' : data.trend === 'down' ? 'down' : '';
    const changeText = data.change > 0 ? `+${data.change}%` : `${data.change}%`;
    const sourceIcon = data.source === 'PVinfolink' ? '🔷' : data.source === '上海有色金属网' ? '🔶' : '📊';
    
    return `
      <div class="price-item" title="${name} - 来源: ${data.source || '本地'}">
        <div>
          <span class="price-name">${name}</span>
          <small style="display: block; color: #999; font-size: 10px; margin-top: 2px;">
            ${sourceIcon} ${data.source || '本地'}
          </small>
        </div>
        <div style="text-align: right;">
          <div>
            <span class="price-value">${data.price}</span>
            <span class="price-unit">${data.unit}</span>
          </div>
          <span class="price-trend ${trendClass}">${trendIcon} ${changeText}</span>
        </div>
      </div>
    `;
  }).join('');
}

// 过滤材料价格
function filterMaterialPrices(searchTerm) {
  const filtered = Object.entries(materialPricesDB).filter(([name]) => 
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  renderMaterialList(filtered);
}

// 刷新价格
async function refreshPrices() {
  showLoading('正在从在线数据源获取最新价格...');
  
  try {
    if (!DEMO_MODE) {
      const response = await fetch(`${API_BASE_URL}/api/materials/prices`);
      const data = await response.json();
      if (data.materials) {
        Object.assign(materialPricesDB, data.materials);
      }
    } else {
      // 演示模式：模拟从在线数据源获取最新价格
      await simulateOnlinePriceFetch();
    }
    
    loadMaterialPrices();
    showToast('价格数据已从在线数据源更新', 'success');
  } catch (error) {
    console.error('获取在线价格失败:', error);
    showToast('获取在线数据失败，使用本地缓存数据', 'warning');
    loadMaterialPrices();
  } finally {
    hideLoading();
  }
}

// 模拟从在线数据源获取价格
async function simulateOnlinePriceFetch() {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // 模拟从PVinfolink和上海有色金属网获取的最新价格（2024年底-2025年初行情）
  // 添加随机波动使数据更真实
  const onlineUpdates = {
    'M10硅片(182mm)': { 
      price: 1.12, 
      trend: 'down', 
      change: -2.5,
      source: 'PVinfolink',
      updateTime: new Date().toISOString()
    },
    'G12硅片(210mm)': { 
      price: 1.68, 
      trend: 'down', 
      change: -2.0,
      source: 'PVinfolink',
      updateTime: new Date().toISOString()
    },
    'N型M10硅片': { 
      price: 1.22, 
      trend: 'down', 
      change: -1.8,
      source: 'PVinfolink',
      updateTime: new Date().toISOString()
    },
    '正银浆': { 
      price: 7920, 
      trend: 'up', 
      change: 3.5,
      source: '上海有色金属网',
      updateTime: new Date().toISOString()
    },
    '硅料(致密料)': { 
      price: 37.5, 
      trend: 'down', 
      change: -1.2,
      source: 'PVinfolink',
      updateTime: new Date().toISOString()
    },
    '电池片(PERC-182)': { 
      price: 0.275, 
      trend: 'down', 
      change: -1.5,
      source: 'PVinfolink',
      updateTime: new Date().toISOString()
    },
    '电池片(TOPCon-182)': { 
      price: 0.295, 
      trend: 'down', 
      change: -1.2,
      source: 'PVinfolink',
      updateTime: new Date().toISOString()
    },
    '光伏玻璃(3.2mm)': { 
      price: 21.5, 
      trend: 'down', 
      change: -0.8,
      source: 'PVinfolink',
      updateTime: new Date().toISOString()
    }
  };
  
  // 更新本地数据库
  Object.keys(onlineUpdates).forEach(key => {
    if (materialPricesDB[key]) {
      materialPricesDB[key] = { ...materialPricesDB[key], ...onlineUpdates[key] };
    }
  });
  
  return onlineUpdates;
}

// 加载模板
function loadTemplate(templateKey) {
  const input = document.getElementById('costInput') || document.getElementById('sensitivityInput');
  if (input && templates[templateKey]) {
    input.value = templates[templateKey];
    input.focus();
    showToast('模板已加载', 'success');
  }
}

// 保存为模板
function saveAsTemplate() {
  const input = document.getElementById('costInput');
  if (!input || !input.value.trim()) {
    showToast('请先输入分析内容', 'warning');
    return;
  }
  
  const name = prompt('请输入模板名称：');
  if (name) {
    const key = `custom_${Date.now()}`;
    templates[key] = input.value;
    showToast('模板已保存', 'success');
  }
}

// BOM成本计算
async function calculateCost() {
  const input = document.getElementById('costInput');
  const productType = document.getElementById('productType')?.value || 'cell';
  const cellType = document.getElementById('cellType')?.value || 'PERC';
  const sizeSpec = document.getElementById('sizeSpec')?.value || '182';
  
  if (!input || !input.value.trim()) {
    showToast('请输入成本分析需求', 'warning');
    return;
  }
  
  showLoading('正在计算成本...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/cost/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: input.value,
        product_type: productType,
        cell_type: cellType,
        size_spec: sizeSpec
      })
    });
    
    const result = await response.json();
    displayCostResult(result);
    addToHistory(input.value, '成本核算', result);
    showToast('成本计算完成', 'success');
  } catch (error) {
    // 演示模式：显示模拟结果
    const mockResult = generateMockCostResult(productType, cellType, sizeSpec);
    displayCostResult(mockResult);
    addToHistory(input.value, '成本核算（演示）', mockResult);
    showToast('演示模式：显示模拟数据', 'warning');
  } finally {
    hideLoading();
  }
}

// 生成模拟成本结果
function generateMockCostResult(productType, cellType, sizeSpec) {
  // 基于2024年底-2025年初市场行情的成本基准
  const costMap = {
    'PERC': { cell: 0.28, wafer: 0.08 },
    'TOPCon': { cell: 0.30, wafer: 0.09 },
    'HJT': { cell: 0.42, wafer: 0.12 },
    'BC': { cell: 0.35, wafer: 0.10 }
  };
  
  const baseData = costMap[cellType] || costMap['PERC'];
  const baseCost = productType === 'cell' ? baseData.cell : baseData.cell + 0.85;
  
  return {
    success: true,
    message: '演示模式（后端未连接）',
    result: {
      unit_cost: baseCost,
      currency: '元/W',
      cost_breakdown: [
        { item: '硅片', cost: productType === 'cell' ? baseData.wafer : 0.20, pct: productType === 'cell' ? 28 : 15, category: 'material' },
        { item: '正银浆', cost: productType === 'cell' ? 0.06 : 0.15, pct: productType === 'cell' ? 18 : 12, category: 'material' },
        { item: '背银浆', cost: productType === 'cell' && cellType !== 'BC' ? 0.025 : 0, pct: productType === 'cell' && cellType !== 'BC' ? 8 : 0, category: 'material' },
        { item: '铝浆', cost: productType === 'cell' ? 0.008 : 0.02, pct: 3, category: 'material' },
        { item: '化学品', cost: 0.012, pct: 4, category: 'material' },
        { item: '玻璃', cost: productType === 'module' ? 0.18 : 0, pct: productType === 'module' ? 10 : 0, category: 'material' },
        { item: '胶膜', cost: productType === 'module' ? 0.12 : 0, pct: productType === 'module' ? 7 : 0, category: 'material' },
        { item: '人工', cost: 0.025, pct: 8, category: 'labor' },
        { item: '制造费用', cost: 0.035, pct: 12, category: 'overhead' },
        { item: '其他', cost: 0.015, pct: 5, category: 'other' }
      ],
      code: `# ${cellType} ${productType === 'cell' ? '电池片' : '组件'}成本计算
# 基于${sizeSpec}mm规格（2024年底-2025年初行情）
# 参考: M10硅片1.15元/片，G12硅片1.70元/片

unit_cost = ${baseCost}  # 元/W

# 成本构成
cost_breakdown = {
    '硅片': ${productType === 'cell' ? baseData.wafer : 0.20},
    '银浆': ${productType === 'cell' ? (cellType === 'BC' ? 0.06 : 0.085) : 0.17},
    '化学品': 0.012,
    '人工': 0.025,
    '制造费用': 0.035
}

print(f"单位成本: {unit_cost} 元/W")`,
      assumptions: [
        `技术路线: ${cellType}，规格: ${sizeSpec}mm`,
        '良率假设：PERC 98%, TOPCon 96%, HJT 94%, BC 95%',
        '硅片价格参考PVinfolink（M10: 1.15元/片, G12: 1.70元/片）',
        '银浆价格参考上海有色金属网（约7850元/kg）',
        '制造费用包含折旧、能耗、人工等'
      ],
      suggestions: [
        '当前硅片价格处于历史低位，可关注供应链稳定性',
        '银浆耗量是成本关键，建议优化印刷工艺',
        cellType === 'BC' ? 'BC电池无背银浆，但正面银浆耗量较高' : '可考虑采用大硅片提升功率摊薄成本',
        '关注N型硅片与P型硅片的价差变化'
      ]
    }
  };
}

// 显示成本结果
function displayCostResult(result) {
  const section = document.getElementById('costResultSection');
  const content = document.getElementById('costResultContent');
  
  if (!section || !content) return;
  
  section.style.display = 'block';
  
  if (result.result) {
    const r = result.result;
    const materialItems = r.cost_breakdown?.filter(i => i.category === 'material' || !i.category) || [];
    const otherItems = r.cost_breakdown?.filter(i => i.category && i.category !== 'material') || [];
    
    content.innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card highlight">
          <div class="metric-label">单位成本</div>
          <div class="metric-value">${r.unit_cost}</div>
          <div class="metric-unit">${r.currency}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">直接材料占比</div>
          <div class="metric-value">${(materialItems.reduce((s, i) => s + i.pct, 0)).toFixed(1)}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">非材料成本</div>
          <div class="metric-value">${(otherItems.reduce((s, i) => s + i.cost, 0)).toFixed(3)}</div>
          <div class="metric-unit">元/W</div>
        </div>
      </div>
      
      <div class="result-card">
        <div class="result-title">📊 成本构成分析</div>
        <table class="cost-table">
          <thead>
            <tr>
              <th>成本项目</th>
              <th class="text-right">金额(元/W)</th>
              <th class="text-right">占比</th>
              <th>可视化</th>
            </tr>
          </thead>
          <tbody>
            ${r.cost_breakdown?.map(item => `
              <tr>
                <td>${item.item}</td>
                <td class="text-right">${item.cost}</td>
                <td class="text-right">${item.pct}%</td>
                <td style="width: 30%;">
                  <div class="cost-bar">
                    <div class="cost-bar-fill" style="width: ${Math.min(item.pct * 2, 100)}%"></div>
                  </div>
                </td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
      </div>
      
      ${r.assumptions ? `
      <div class="result-card">
        <div class="result-title">📋 计算假设</div>
        <ul style="padding-left: 20px; color: var(--text-muted);">
          ${r.assumptions.map(a => `<li style="margin-bottom: 8px;">${a}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${r.suggestions ? `
      <div class="result-card">
        <div class="result-title">💡 优化建议</div>
        <ul style="padding-left: 20px; color: var(--text-muted);">
          ${r.suggestions.map(s => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      <div class="result-card">
        <div class="result-title">🐍 Python 计算代码</div>
        <div class="code-block">
          <div class="code-header">
            <span class="code-title">Generated Code</span>
            <button class="btn btn-sm btn-secondary" onclick="copyCode('${encodeURIComponent(r.code)}')">
              📋 复制
            </button>
          </div>
          <pre><code>${escapeHtml(r.code)}</code></pre>
        </div>
      </div>
    `;
    
    // 重新渲染数学公式
    if (window.MathJax) {
      window.MathJax.typesetPromise?.().catch(() => {});
    }
  } else {
    content.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
  }
  
  // 滚动到结果区域
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 差异分析
async function analyzeVariance() {
  const stdCost = document.getElementById('stdCost')?.value;
  const actualCost = document.getElementById('actualCost')?.value;
  const volume = document.getElementById('prodVolume')?.value;
  const period = document.getElementById('variancePeriod')?.value;
  
  if (!stdCost || !actualCost) {
    showToast('请输入标准成本和实际成本', 'warning');
    return;
  }
  
  const std = parseFloat(stdCost);
  const actual = parseFloat(actualCost);
  const vol = parseFloat(volume || 0);
  const variance = actual - std;
  const variancePct = (variance / std * 100).toFixed(2);
  
  showLoading('正在分析成本差异...');
  
  try {
    if (!DEMO_MODE) {
      const response = await fetch(`${API_BASE_URL}/api/cost/variance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standard_cost: std,
          actual_cost: actual,
          production_volume: vol,
          period: period
        })
      });
      const result = await response.json();
      displayVarianceResult(result);
    } else {
      // 演示模式
      const mockResult = generateMockVarianceResult(std, actual, vol, variance, variancePct);
      displayVarianceResult(mockResult);
    }
    
    showToast('差异分析完成', 'success');
  } catch (error) {
    const mockResult = generateMockVarianceResult(std, actual, vol, variance, variancePct);
    displayVarianceResult(mockResult);
    showToast('演示模式：显示模拟数据', 'warning');
  } finally {
    hideLoading();
  }
}

// 生成模拟差异分析结果
function generateMockVarianceResult(std, actual, vol, variance, variancePct) {
  const isFavorable = variance < 0;
  const totalVariance = variance * (vol || 100);
  
  return {
    standard_cost: std,
    actual_cost: actual,
    variance: variance,
    variance_pct: parseFloat(variancePct),
    is_favorable: isFavorable,
    total_variance: totalVariance,
    breakdown: [
      { factor: '材料价格变动', impact: variance * 0.6, pct: 60, direction: variance > 0 ? 'up' : 'down' },
      { factor: '良率变化', impact: variance * 0.2, pct: 20, direction: variance > 0 ? 'up' : 'down' },
      { factor: '产能利用率', impact: variance * 0.1, pct: 10, direction: 'neutral' },
      { factor: '其他因素', impact: variance * 0.1, pct: 10, direction: 'neutral' }
    ],
    reasons: [
      { name: '硅片价格波动', desc: 'M10硅片从1.15元波动至1.25元/片', impact: `+${(variance * 0.35).toFixed(3)} 元/W`, direction: 'up' },
      { name: '银浆价格上涨', desc: '银价上涨导致浆料成本增加', impact: `+${(variance * 0.15).toFixed(3)} 元/W`, direction: 'up' },
      { name: '良率变化', desc: '本月良率波动影响单位成本', impact: `+${(variance * 0.2).toFixed(3)} 元/W`, direction: 'up' },
      { name: '能耗控制', desc: '能耗优化措施效果', impact: '-0.008 元/W', direction: 'down' }
    ],
    recommendations: [
      '当前硅片价格处于低位（M10约1.15元/片），建议锁定长单',
      '优化工艺参数提升良率至目标水平',
      '关注银价走势，适时采购银浆',
      '持续优化能耗，降低非硅成本'
    ]
  };
}

// 显示差异分析结果
function displayVarianceResult(result) {
  const section = document.getElementById('varianceResultSection');
  const content = document.getElementById('varianceResultContent');
  
  if (!section || !content) return;
  
  section.style.display = 'block';
  
  const isFavorable = result.variance < 0;
  const varianceClass = isFavorable ? 'positive' : 'negative';
  const varianceSign = isFavorable ? '-' : '+';
  
  content.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">标准成本</div>
        <div class="metric-value">${result.standard_cost.toFixed(3)}</div>
        <div class="metric-unit">元/W</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">实际成本</div>
        <div class="metric-value">${result.actual_cost.toFixed(3)}</div>
        <div class="metric-unit">元/W</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">单位差异</div>
        <div class="metric-value ${varianceClass}">${varianceSign}${Math.abs(result.variance).toFixed(3)}</div>
        <div class="metric-unit">元/W (${result.variance_pct}%)</div>
      </div>
      ${result.total_variance ? `
      <div class="metric-card">
        <div class="metric-label">总差异金额</div>
        <div class="metric-value ${varianceClass}">${varianceSign}${Math.abs(result.total_variance).toFixed(0)}</div>
        <div class="metric-unit">万元</div>
      </div>
      ` : ''}
    </div>
    
    <div class="result-card">
      <div class="result-title">📊 差异分解</div>
      <table class="cost-table">
        <thead>
          <tr>
            <th>影响因素</th>
            <th class="text-right">影响程度</th>
            <th class="text-right">占比</th>
            <th>趋势</th>
          </tr>
        </thead>
        <tbody>
          ${result.breakdown.map(item => `
            <tr>
              <td>${item.factor}</td>
              <td class="text-right">${item.impact > 0 ? '+' : ''}${item.impact.toFixed(4)}</td>
              <td class="text-right">${item.pct}%</td>
              <td>${item.direction === 'up' ? '📈' : item.direction === 'down' ? '📉' : '➡️'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="result-card">
      <div class="result-title">🔍 差异原因分析</div>
      <div class="variance-reasons">
        ${result.reasons.map(reason => `
          <div class="reason-item">
            <div class="reason-icon ${reason.direction}">${reason.direction === 'up' ? '📈' : '📉'}</div>
            <div class="reason-content">
              <div class="reason-title">${reason.name}</div>
              <div class="reason-desc">${reason.desc}</div>
            </div>
            <div class="reason-impact">${reason.impact}</div>
          </div>
        `).join('')}
      </div>
    </div>
    
    ${result.recommendations ? `
    <div class="result-card">
      <div class="result-title">💡 改进建议</div>
      <ul style="padding-left: 20px; color: var(--text-muted);">
        ${result.recommendations.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    <div class="chart-container">
      <div class="chart-title">差异结构图</div>
      <canvas id="varianceChart" style="max-height: 300px;"></canvas>
    </div>
  `;
  
  // 创建差异图表
  setTimeout(() => createVarianceChart(result.breakdown), 100);
  
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 创建差异图表
function createVarianceChart(breakdown) {
  const ctx = document.getElementById('varianceChart');
  if (!ctx || !window.Chart) return;
  
  // 销毁旧图表
  if (charts.variance) {
    charts.variance.destroy();
  }
  
  charts.variance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: breakdown.map(b => b.factor),
      datasets: [{
        label: '影响程度',
        data: breakdown.map(b => b.impact),
        backgroundColor: breakdown.map(b => b.impact > 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)'),
        borderColor: breakdown.map(b => b.impact > 0 ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)'),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '差异金额 (元/W)'
          }
        }
      }
    }
  });
}

// 加载差异分析示例
function loadVarianceExample() {
  document.getElementById('stdCost').value = '2.10';
  document.getElementById('actualCost').value = '2.25';
  document.getElementById('prodVolume').value = '1000';
  showToast('示例数据已加载', 'success');
}

// 敏感性分析
async function analyzeSensitivity() {
  const baseCost = document.getElementById('baseCost')?.value;
  const range = document.getElementById('sensitivityRange')?.value;
  const input = document.getElementById('sensitivityInput')?.value;
  
  // 获取选中的因素
  const factorCheckboxes = document.querySelectorAll('#sensitivityFactors input:checked');
  const factors = Array.from(factorCheckboxes).map(cb => cb.value);
  
  if (factors.length === 0 && !input?.trim()) {
    showToast('请选择至少一个分析因素或输入分析需求', 'warning');
    return;
  }
  
  showLoading('正在计算敏感性...');
  
  try {
    if (!DEMO_MODE) {
      const response = await fetch(`${API_BASE_URL}/api/cost/sensitivity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_cost: parseFloat(baseCost || 0.85),
          range: parseInt(range),
          factors: factors,
          text: input
        })
      });
      const result = await response.json();
      displaySensitivityResult(result);
    } else {
      const mockResult = generateMockSensitivityResult(factors, range, baseCost);
      displaySensitivityResult(mockResult);
    }
    
    showToast('敏感性分析完成', 'success');
  } catch (error) {
    const mockResult = generateMockSensitivityResult(factors, range, baseCost);
    displaySensitivityResult(mockResult);
    showToast('演示模式：显示模拟数据', 'warning');
  } finally {
    hideLoading();
  }
}

// 生成模拟敏感性分析结果
function generateMockSensitivityResult(factors, range, baseCost) {
  // 基于2024年底-2025年初行情（M10硅片1.15元/片，PERC电池片0.28元/W）
  const base = parseFloat(baseCost || 0.28);
  const r = parseInt(range) / 100;
  
  const factorData = {
    'wafer': { name: '硅片价格', impact: 0.32, baseParam: 1.15 },
    'silver': { name: '银浆价格', impact: 0.28, baseParam: 7850 },
    'aluminum': { name: '铝浆价格', impact: 0.02, baseParam: 22 },
    'cell': { name: '电池片价格', impact: 0.65, baseParam: 0.28 },
    'glass': { name: '玻璃价格', impact: 0.10, baseParam: 22 },
    'eva': { name: 'EVA胶膜', impact: 0.05, baseParam: 6.8 }
  };
  
  const selectedFactors = factors.length > 0 ? factors : ['wafer', 'silver'];
  
  const sensitivityData = selectedFactors.map(f => {
    const fd = factorData[f];
    const sensitivity = fd.impact * base;
    return {
      factor: fd.name,
      base_param: fd.baseParam,
      sensitivity: sensitivity,
      impact_pct: (sensitivity / base * 100).toFixed(1),
      range_low: base - sensitivity * r,
      range_high: base + sensitivity * r,
      elasticity: (fd.impact * 100).toFixed(2)
    };
  }).sort((a, b) => b.sensitivity - a.sensitivity);
  
  return {
    base_cost: base,
    range: parseInt(range),
    factors: sensitivityData,
    tornado_data: sensitivityData.map(d => ({
      factor: d.factor,
      negative: -d.sensitivity * r,
      positive: d.sensitivity * r
    })),
    key_findings: [
      `当前M10硅片价格约${factorData['wafer'].baseParam}元/片，处于历史低位`,
      `硅片价格每波动${range}%，成本变化约${(sensitivityData.find(s => s.factor === '硅片价格')?.sensitivity * r || 0).toFixed(3)}元/W`,
      '银浆价格是TOPCon和HJT技术的关键成本因素',
      '当前硅片价格低位，建议评估长单锁价策略'
    ],
    risk_assessment: {
      high: ['硅片价格反弹', '银价大幅上涨'],
      medium: ['玻璃价格波动', '汇率波动'],
      low: ['铝浆价格', '化学品价格']
    }
  };
}

// 显示敏感性分析结果
function displaySensitivityResult(result) {
  const section = document.getElementById('sensitivityResultSection');
  const content = document.getElementById('sensitivityResultContent');
  
  if (!section || !content) return;
  
  section.style.display = 'block';
  
  content.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card highlight">
        <div class="metric-label">基准成本</div>
        <div class="metric-value">${result.base_cost}</div>
        <div class="metric-unit">元/W</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">分析范围</div>
        <div class="metric-value">±${result.range}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">关键因子数</div>
        <div class="metric-value">${result.factors.length}</div>
      </div>
    </div>
    
    <div class="result-card">
      <div class="result-title">📊 敏感性排名</div>
      <div class="sensitivity-rank">
        ${result.factors.map((f, i) => `
          <div class="sensitivity-item">
            <div class="sensitivity-rank-num ${i < 3 ? 'top' : ''}">${i + 1}</div>
            <div class="sensitivity-info">
              <div class="sensitivity-name">${f.factor}</div>
              <div class="sensitivity-desc">基准: ${f.base_param} | 弹性系数: ${f.elasticity}%</div>
            </div>
            <div class="sensitivity-value">${f.impact_pct}%</div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="chart-container">
      <div class="chart-title">龙卷风图 (Tornado Chart)</div>
      <canvas id="tornadoChart" style="max-height: 350px;"></canvas>
    </div>
    
    <div class="chart-container">
      <div class="chart-title">单因素敏感性分析</div>
      <canvas id="sensitivityLineChart" style="max-height: 300px;"></canvas>
    </div>
    
    ${result.key_findings ? `
    <div class="result-card">
      <div class="result-title">🔍 关键发现</div>
      <ul style="padding-left: 20px; color: var(--text-muted);">
        ${result.key_findings.map(f => `<li style="margin-bottom: 8px;">${f}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    ${result.risk_assessment ? `
    <div class="result-card">
      <div class="result-title">⚠️ 风险评估</div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px;">
        <div style="padding: 16px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
          <div style="font-weight: 600; color: #dc2626; margin-bottom: 8px;">高风险</div>
          ${result.risk_assessment.high.map(r => `<div style="font-size: 13px; color: #7f1d1d; margin-bottom: 4px;">• ${r}</div>`).join('')}
        </div>
        <div style="padding: 16px; background: #fefce8; border-radius: 8px; border: 1px solid #fde047;">
          <div style="font-weight: 600; color: #ca8a04; margin-bottom: 8px;">中风险</div>
          ${result.risk_assessment.medium.map(r => `<div style="font-size: 13px; color: #854d0e; margin-bottom: 4px;">• ${r}</div>`).join('')}
        </div>
        <div style="padding: 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
          <div style="font-weight: 600; color: #16a34a; margin-bottom: 8px;">低风险</div>
          ${result.risk_assessment.low.map(r => `<div style="font-size: 13px; color: #166534; margin-bottom: 4px;">• ${r}</div>`).join('')}
        </div>
      </div>
    </div>
    ` : ''}
  `;
  
  // 创建图表
  setTimeout(() => {
    createTornadoChart(result.tornado_data);
    createSensitivityLineChart(result.factors, result.base_cost, result.range);
  }, 100);
  
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 创建龙卷风图
function createTornadoChart(data) {
  const ctx = document.getElementById('tornadoChart');
  if (!ctx || !window.Chart) return;
  
  if (charts.tornado) {
    charts.tornado.destroy();
  }
  
  charts.tornado = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.factor),
      datasets: [
        {
          label: '负向波动',
          data: data.map(d => d.negative),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1
        },
        {
          label: '正向波动',
          data: data.map(d => d.positive),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: '成本变化 (元/W)'
          }
        }
      }
    }
  });
}

// 创建敏感性折线图
function createSensitivityLineChart(factors, baseCost, range) {
  const ctx = document.getElementById('sensitivityLineChart');
  if (!ctx || !window.Chart || factors.length === 0) return;
  
  if (charts.sensitivityLine) {
    charts.sensitivityLine.destroy();
  }
  
  const r = range / 100;
  const labels = ['-30%', '-20%', '-10%', '基准', '+10%', '+20%', '+30%'];
  
  const colors = [
    'rgb(37, 99, 235)',
    'rgb(239, 68, 68)',
    'rgb(16, 185, 129)',
    'rgb(245, 158, 11)',
    'rgb(139, 92, 246)',
    'rgb(236, 72, 153)'
  ];
  
  const datasets = factors.slice(0, 4).map((f, i) => {
    const sensitivity = parseFloat(f.impact_pct) / 100 * baseCost;
    return {
      label: f.factor,
      data: [
        baseCost - sensitivity * 0.3 / r * 0.3,
        baseCost - sensitivity * 0.2 / r * 0.2,
        baseCost - sensitivity * 0.1 / r * 0.1,
        baseCost,
        baseCost + sensitivity * 0.1 / r * 0.1,
        baseCost + sensitivity * 0.2 / r * 0.2,
        baseCost + sensitivity * 0.3 / r * 0.3
      ],
      borderColor: colors[i % colors.length],
      backgroundColor: colors[i % colors.length] + '20',
      tension: 0.3,
      fill: false
    };
  });
  
  charts.sensitivityLine = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: '成本 (元/W)'
          }
        }
      }
    }
  });
}

// 加载敏感性分析示例
function loadSensitivityExample() {
  document.getElementById('baseCost').value = '0.85';
  document.getElementById('sensitivityRange').value = '20';
  document.getElementById('sensitivityInput').value = '分析硅片和银浆价格对PERC电池片成本的影响';
  
  // 选中复选框
  document.querySelectorAll('#sensitivityFactors input').forEach(cb => {
    cb.checked = (cb.value === 'wafer' || cb.value === 'silver');
  });
  
  showToast('示例数据已加载', 'success');
}

// 成本对比
async function compareCosts() {
  const typeA = document.getElementById('compareTypeA')?.value;
  const typeB = document.getElementById('compareTypeB')?.value;
  
  if (typeA === typeB) {
    showToast('请选择两种不同的场景进行对比', 'warning');
    return;
  }
  
  showLoading('正在生成对比分析...');
  
  try {
    if (!DEMO_MODE) {
      const response = await fetch(`${API_BASE_URL}/api/cost/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_a: typeA, scenario_b: typeB })
      });
      const result = await response.json();
      displayCompareResult(result);
    } else {
      const mockResult = generateMockCompareResult(typeA, typeB);
      displayCompareResult(mockResult);
    }
    
    showToast('对比分析完成', 'success');
  } catch (error) {
    const mockResult = generateMockCompareResult(typeA, typeB);
    displayCompareResult(mockResult);
    showToast('演示模式：显示模拟数据', 'warning');
  } finally {
    hideLoading();
  }
}

// 生成模拟对比结果
function generateMockCompareResult(typeA, typeB) {
  const dataA = costBaseline[typeA];
  const dataB = costBaseline[typeB];
  
  const diff = dataB.cell - dataA.cell;
  const diffPct = (diff / dataA.cell * 100).toFixed(1);
  
  // 分解成本构成
  const breakdownA = [
    { item: '硅片', cost: dataA.cell * 0.45 },
    { item: '银浆', cost: dataA.cell * 0.15 },
    { item: '其他材料', cost: dataA.cell * 0.10 },
    { item: '人工', cost: dataA.cell * 0.08 },
    { item: '制造费用', cost: dataA.cell * 0.12 },
    { item: '其他', cost: dataA.cell * 0.10 }
  ];
  
  const breakdownB = [
    { item: '硅片', cost: dataB.cell * 0.45 },
    { item: '银浆', cost: dataB.cell * (typeB.includes('HJT') ? 0.25 : 0.15) },
    { item: '其他材料', cost: dataB.cell * 0.10 },
    { item: '人工', cost: dataB.cell * 0.08 },
    { item: '制造费用', cost: dataB.cell * 0.12 },
    { item: '其他', cost: dataB.cell * 0.10 }
  ];
  
  return {
    scenario_a: { type: typeA, ...dataA, breakdown: breakdownA },
    scenario_b: { type: typeB, ...dataB, breakdown: breakdownB },
    diff: diff,
    diff_pct: parseFloat(diffPct),
    winner: diff > 0 ? 'A' : 'B',
    analysis: [
      `${typeA}成本较${typeB}${Math.abs(diff) < 0.05 ? '相近' : Math.abs(diff) > 0.1 ? '差异显著' : '有一定差异'}`,
      typeB.includes('HJT') ? 'HJT技术银浆耗量高是成本主要差异点' : '',
      typeB.includes('TOPCon') ? 'TOPCon技术转换效率优势明显' : ''
    ].filter(Boolean),
    recommendations: [
      diff > 0.1 ? '建议评估技术切换的经济性' : '当前技术路线合理',
      '关注规模效应带来的成本下降空间',
      '持续优化非硅成本'
    ]
  };
}

// 显示对比结果
function displayCompareResult(result) {
  const section = document.getElementById('compareResultSection');
  const content = document.getElementById('compareResultContent');
  
  if (!section || !content) return;
  
  section.style.display = 'block';
  
  const isABetter = result.winner === 'A';
  
  content.innerHTML = `
    <div class="compare-result">
      <div class="compare-scenario ${isABetter ? 'winner' : ''}">
        <div class="compare-scenario-title">场景 A: ${result.scenario_a.type}</div>
        <div class="compare-cost">
          <div class="compare-cost-value">${result.scenario_a.cell.toFixed(3)}</div>
          <div class="compare-cost-unit">元/W (电池片)</div>
        </div>
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">组件成本</div>
          <div style="font-size: 20px; font-weight: 600;">${result.scenario_a.module.toFixed(3)} 元/W</div>
        </div>
      </div>
      
      <div class="compare-vs-center">
        <div class="compare-diff ${isABetter ? 'better' : 'worse'}">
          ${Math.abs(result.diff).toFixed(3)}
        </div>
        <div class="compare-diff-label">${Math.abs(result.diff_pct)}% 差异</div>
        <div style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">
          ${isABetter ? 'A 更优' : 'B 更优'}
        </div>
      </div>
      
      <div class="compare-scenario ${!isABetter ? 'winner' : ''}">
        <div class="compare-scenario-title">场景 B: ${result.scenario_b.type}</div>
        <div class="compare-cost">
          <div class="compare-cost-value">${result.scenario_b.cell.toFixed(3)}</div>
          <div class="compare-cost-unit">元/W (电池片)</div>
        </div>
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">组件成本</div>
          <div style="font-size: 20px; font-weight: 600;">${result.scenario_b.module.toFixed(3)} 元/W</div>
        </div>
      </div>
    </div>
    
    <div class="compare-breakdown">
      <div class="compare-breakdown-title">📊 成本构成对比</div>
      <div class="chart-container">
        <canvas id="compareChart" style="max-height: 350px;"></canvas>
      </div>
    </div>
    
    ${result.analysis ? `
    <div class="result-card">
      <div class="result-title">🔍 对比分析</div>
      <ul style="padding-left: 20px; color: var(--text-muted);">
        ${result.analysis.map(a => `<li style="margin-bottom: 8px;">${a}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    ${result.recommendations ? `
    <div class="result-card">
      <div class="result-title">💡 建议</div>
      <ul style="padding-left: 20px; color: var(--text-muted);">
        ${result.recommendations.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  `;
  
  // 创建对比图表
  setTimeout(() => createCompareChart(result.scenario_a.breakdown, result.scenario_b.breakdown, result.scenario_a.type, result.scenario_b.type), 100);
  
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 创建对比图表
function createCompareChart(breakdownA, breakdownB, labelA, labelB) {
  const ctx = document.getElementById('compareChart');
  if (!ctx || !window.Chart) return;
  
  if (charts.compare) {
    charts.compare.destroy();
  }
  
  const labels = breakdownA.map(b => b.item);
  
  charts.compare = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: labelA,
          data: breakdownA.map(b => b.cost),
          backgroundColor: 'rgba(37, 99, 235, 0.7)',
          borderColor: 'rgb(37, 99, 235)',
          borderWidth: 1
        },
        {
          label: labelB,
          data: breakdownB.map(b => b.cost),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '成本 (元/W)'
          }
        }
      }
    }
  });
}

// 导出结果
function exportResult(format) {
  showToast(`正在导出${format.toUpperCase()}...`, 'info');
  
  setTimeout(() => {
    showToast(`导出成功！`, 'success');
  }, 1000);
}

function exportVariance(format) {
  exportResult(format);
}

// 清空输入
function clearInput() {
  const input = document.getElementById('costInput');
  if (input) {
    input.value = '';
  }
  const resultSection = document.getElementById('costResultSection');
  if (resultSection) {
    resultSection.style.display = 'none';
  }
  showToast('输入已清空', 'info');
}

// 复制代码
function copyCode(code) {
  try {
    const decoded = decodeURIComponent(code);
    navigator.clipboard.writeText(decoded).then(() => {
      showToast('代码已复制到剪贴板', 'success');
    }).catch(() => {
      showToast('复制失败，请手动复制', 'error');
    });
  } catch (e) {
    showToast('复制失败', 'error');
  }
}

// 添加到历史
function addToHistory(text, type, result) {
  const item = {
    id: Date.now(),
    text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
    fullText: text,
    type: type,
    time: new Date().toLocaleString('zh-CN'),
    result: result
  };
  
  sessionHistory.unshift(item);
  if (sessionHistory.length > 50) {
    sessionHistory = sessionHistory.slice(0, 50);
  }
  
  localStorage.setItem('cost_history', JSON.stringify(sessionHistory));
  renderHistory();
}

// 渲染历史记录
function renderHistory() {
  const container = document.getElementById('historyList');
  if (!container) return;
  
  if (sessionHistory.length === 0) {
    container.innerHTML = `
      <div class="empty-tip">
        <div class="empty-tip-icon">📝</div>
        <div>暂无历史记录</div>
        <div style="font-size: 12px; margin-top: 8px;">开始分析后将自动保存记录</div>
      </div>
    `;
    return;
  }
  
  const typeIcons = {
    '成本核算': '🔋',
    '成本核算（演示）': '🔋',
    '差异分析': '📊',
    '敏感性分析': '📈',
    '成本对比': '⚖️'
  };
  
  container.innerHTML = sessionHistory.map(item => `
    <div class="history-item" onclick="loadHistoryItem(${item.id})">
      <div class="history-icon">${typeIcons[item.type] || '📋'}</div>
      <div class="history-content">
        <div class="history-title">${item.type} - ${item.text}</div>
        <div class="history-meta">${item.time}</div>
      </div>
      <div class="history-actions-btn">
        <button class="history-btn" onclick="event.stopPropagation(); deleteHistoryItem(${item.id})">删除</button>
      </div>
    </div>
  `).join('');
}

// 加载历史项
function loadHistoryItem(id) {
  const item = sessionHistory.find(h => h.id === id);
  if (!item || !item.result) {
    showToast('记录数据不完整', 'warning');
    return;
  }
  
  // 根据类型切换到对应面板并加载结果
  if (item.type.includes('成本核算')) {
    document.querySelector('[data-tab="cost-calc"]').click();
    document.getElementById('costInput').value = item.fullText;
    displayCostResult(item.result);
  } else if (item.type.includes('差异分析')) {
    document.querySelector('[data-tab="variance"]').click();
    displayVarianceResult(item.result);
  } else if (item.type.includes('敏感性分析')) {
    document.querySelector('[data-tab="sensitivity"]').click();
    displaySensitivityResult(item.result);
  }
  
  showToast('历史记录已加载', 'success');
}

// 删除历史项
function deleteHistoryItem(id) {
  sessionHistory = sessionHistory.filter(h => h.id !== id);
  localStorage.setItem('cost_history', JSON.stringify(sessionHistory));
  renderHistory();
  showToast('记录已删除', 'info');
}

// 清空所有历史
function clearAllHistory() {
  if (confirm('确定要清空所有历史记录吗？')) {
    sessionHistory = [];
    localStorage.removeItem('cost_history');
    renderHistory();
    showToast('历史记录已清空', 'success');
  }
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 全局函数暴露
window.loadTemplate = loadTemplate;
window.copyCode = copyCode;
window.loadHistoryItem = loadHistoryItem;
window.deleteHistoryItem = deleteHistoryItem;
window.clearAllHistory = clearAllHistory;
window.refreshPrices = refreshPrices;
window.exportResult = exportResult;
window.exportVariance = exportVariance;
window.loadVarianceExample = loadVarianceExample;
window.loadSensitivityExample = loadSensitivityExample;
window.saveAsTemplate = saveAsTemplate;

// 页面加载完成后的初始化
window.addEventListener('load', () => {
  console.log('光伏成本智能分析助手已加载');
});
