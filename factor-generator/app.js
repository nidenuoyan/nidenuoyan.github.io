/**
 * 成本智能分析助手 - AI 版
 * 基于 Kimi (Moonshot) 大模型 API
 * 版本: 1.0
 */

// ==================== 配置 ====================
// 自动检测后端地址：开发环境用 localhost:8000，生产环境用相对路径 /api/
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:8000'  // 开发环境
  : '';  // 生产环境使用相对路径（Nginx 反向代理到 /api/）
const DEFAULT_MODEL = 'deepseek-reasoner';

console.log('[配置] API 地址:', API_BASE_URL || '(相对路径 /api/)');

// ==================== 状态管理 ====================
let isAnalyzing = false;
let aiStatus = { enabled: false, model: DEFAULT_MODEL };

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[初始化] 成本智能分析助手启动...');
  
  await checkAIStatus();
  initTabs();
  initButtons();
  renderHistory();
  
  console.log('[初始化] 完成');
});

// 检查 AI 服务状态
async function checkAIStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/status`);
    const data = await response.json();
    
    if (data.success) {
      aiStatus = data;
      console.log(`[AI 状态] 模型: ${data.model}, 已配置: ${data.api_configured}`);
      
      if (!data.api_configured) {
        showToast('AI 服务未配置，请联系管理员', 'warning');
      }
    }
  } catch (error) {
    console.error('[AI 状态检查失败]', error);
    showToast('无法连接到后端服务，请确保服务已启动', 'error');
  }
}



// ==================== 选项卡切换 ====================
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

// ==================== 按钮事件 ====================
function initButtons() {
  // 成本核算
  document.getElementById('calcBtn')?.addEventListener('click', () => {
    analyzeCost('cost-calc');
  });
  
  // 清空按钮
  document.getElementById('clearBtn')?.addEventListener('click', () => {
    const input = document.getElementById('costInput');
    if (input) input.value = '';
  });
  
  // 复制结果
  document.getElementById('copyBtn')?.addEventListener('click', copyResult);
  
  // 差异分析
  document.getElementById('varianceBtn')?.addEventListener('click', () => {
    analyzeCost('variance');
  });
  
  // 敏感性分析
  document.getElementById('sensitivityBtn')?.addEventListener('click', () => {
    analyzeCost('sensitivity');
  });
  
  // 成本对比
  document.getElementById('compareBtn')?.addEventListener('click', () => {
    analyzeCost('compare');
  });
}

// ==================== AI 分析核心函数 ====================
async function analyzeCost(type) {
  if (isAnalyzing) {
    showToast('正在分析中，请稍候...', 'warning');
    return;
  }
  
  if (!aiStatus.enabled) {
    showToast('AI 服务未启用，请检查后端服务', 'error');
    return;
  }
  
  const inputMap = {
    'cost-calc': 'costInput',
    'variance': 'varianceInput',
    'sensitivity': 'sensitivityInput',
    'compare': 'compareInput'
  };
  
  const inputId = inputMap[type];
  const input = document.getElementById(inputId)?.value.trim();
  
  if (!input) {
    showToast('请输入分析需求', 'error');
    return;
  }
  
  // 获取分析深度和格式
  const depth = document.getElementById('analysisDepth')?.value || 'standard';
  const format = document.getElementById('outputFormat')?.value || 'table';
  
  isAnalyzing = true;
  showLoading('AI 正在分析中，请稍候...');
  
  try {
    const result = await callLocalAI(type, input, depth, format);
    
    displayResult(type, result);
    saveToHistory(type, input, result);
    showToast('分析完成', 'success');
    
  } catch (error) {
    console.error('[AI 分析错误]', error);
    showToast(`分析失败: ${error.message}`, 'error');
  } finally {
    isAnalyzing = false;
    hideLoading();
  }
}

// 构建提示词
function buildPrompt(type, userInput, depth, format) {
  const depthInstructions = {
    'simple': '请给出简要的分析结果，重点突出关键数据和结论。',
    'standard': '请给出完整的分析，包括计算过程、结果表格和简要建议。',
    'detailed': '请给出详细的分析报告，包括：详细计算过程、多维度分析、图表建议、风险提示、优化方案等。'
  };
  
  const formatInstructions = {
    'table': '请使用 Markdown 表格展示数据，配合文字说明。',
    'chart': '请描述适合展示的图表类型，并给出图表数据，配合表格和文字说明。',
    'report': '请按照正式报告格式输出，包括：标题、摘要、详细分析、结论和建议。'
  };
  
  const typePrompts = {
    'cost-calc': `你是一位专业的成本会计分析师。请对以下成本分析需求进行详细计算和分析。

分析要求：
1. 仔细识别用户输入中的所有成本项目
2. 计算单位成本、总成本
3. 分析各成本项目的占比
4. 计算直接材料、直接人工、制造费用的构成
5. 给出成本优化的建议

${depthInstructions[depth]}
${formatInstructions[format]}`,

    'variance': `你是一位专业的成本会计分析师，擅长成本差异分析。请对以下数据进行差异分析。

分析要求：
1. 计算材料价格差异和用量差异（价格差异 = (实际价格 - 标准价格) × 实际用量；用量差异 = (实际用量 - 标准用量) × 标准价格）
2. 计算人工工资率差异和效率差异
3. 计算制造费用差异
4. 分析差异产生的原因（有利差异/不利差异）
5. 计算差异对总成本的影响金额
6. 给出控制和改进建议

${depthInstructions[depth]}
${formatInstructions[format]}`,

    'sensitivity': `你是一位专业的成本会计分析师，擅长敏感性分析和风险评估。请对以下数据进行敏感性分析。

分析要求：
1. 计算各因素变动对总成本的影响
2. 计算敏感度系数（敏感度 = 成本变动百分比 / 因素变动百分比）
3. 对敏感因素进行排序
4. 分析最佳、最可能、最差情景
5. 给出风险控制和采购策略建议

${depthInstructions[depth]}
${formatInstructions[format]}`,

    'compare': `你是一位专业的成本会计分析师，擅长方案比较和决策分析。请对以下方案进行对比分析。

分析要求：
1. 分别计算各方案的总成本
2. 计算成本无差别点（如果有）
3. 分析不同产量/情景下的最优方案
4. 进行盈亏平衡分析
5. 考虑定量因素（成本）和定性因素（质量、交期、风险等）
6. 给出明确的决策建议

${depthInstructions[depth]}
${formatInstructions[format]}`
  };
  
  const systemPrompt = typePrompts[type] || typePrompts['cost-calc'];
  
  return {
    system: systemPrompt,
    user: userInput
  };
}

// 调用本地后端 AI 分析
async function callLocalAI(analysisType, input, depth, format) {
  const response = await fetch(`${API_BASE_URL}/api/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      analysis_type: analysisType,
      input: input,
      depth: depth,
      format: format
    })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || '分析失败');
  }
  
  return data.result;
}

// ==================== 结果显示 ====================
function displayResult(type, result) {
  const sectionMap = {
    'cost-calc': { section: 'costResultSection', content: 'costResultContent', thinking: 'thinkingSection', thinkingContent: 'thinkingContent' },
    'variance': { section: 'varianceResultSection', content: 'varianceResultContent', thinking: 'varianceThinkingSection', thinkingContent: 'varianceThinkingContent' },
    'sensitivity': { section: 'sensitivityResultSection', content: 'sensitivityResultContent', thinking: 'sensitivityThinkingSection', thinkingContent: 'sensitivityThinkingContent' },
    'compare': { section: 'compareResultSection', content: 'compareResultContent', thinking: 'compareThinkingSection', thinkingContent: 'compareThinkingContent' }
  };
  
  const map = sectionMap[type];
  if (!map) return;
  
  const section = document.getElementById(map.section);
  const content = document.getElementById(map.content);
  const thinkingSection = document.getElementById(map.thinking);
  const thinkingContent = document.getElementById(map.thinkingContent);
  
  if (!section || !content) return;
  
  // 解析 AI 响应
  const response = result.content;
  
  // 显示思考过程（如果有）
  if (thinkingSection && thinkingContent) {
    // 提取思考过程（如果有特定的标记）
    const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      thinkingContent.textContent = thinkMatch[1].trim();
      thinkingSection.style.display = 'block';
    } else {
      thinkingSection.style.display = 'none';
    }
  }
  
  // 渲染 Markdown 内容
  content.innerHTML = renderMarkdown(response);
  
  // 显示结果区域
  section.style.display = 'block';
  
  // 滚动到结果区域
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Markdown 渲染
function renderMarkdown(text) {
  // 简单的 Markdown 渲染
  let html = text
    // 代码块
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 表格
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    // 无序列表
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // 引用
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // 分隔线
    .replace(/^---$/gm, '<hr>')
    // 段落
    .replace(/\n\n/g, '</p><p>')
    // 换行
    .replace(/\n/g, '<br>');
  
  // 包裹段落
  html = `<p>${html}</p>`;
  
  // 修复表格（简单处理）
  html = html.replace(/(<tr>.*<\/tr>)/g, '<table>$1</table>');
  
  // 修复列表
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
  
  return html;
}

// ==================== 历史记录 ====================
function saveToHistory(type, input, result) {
  const typeNames = {
    'cost-calc': '成本核算',
    'variance': '差异分析',
    'sensitivity': '敏感性分析',
    'compare': '成本对比'
  };
  
  const history = JSON.parse(localStorage.getItem('deepseek_cost_analysis_history') || '[]');
  
  const item = {
    id: Date.now(),
    type: type,
    typeName: typeNames[type] || '分析',
    input: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
    result: result.content,
    timestamp: new Date().toISOString(),
    model: result.model
  };
  
  history.unshift(item);
  
  // 只保留最近 50 条
  if (history.length > 50) {
    history.pop();
  }
  
  localStorage.setItem('deepseek_cost_analysis_history', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('historyList');
  if (!container) return;
  
  const history = JSON.parse(localStorage.getItem('deepseek_cost_analysis_history') || '[]');
  
  if (history.length === 0) {
    container.innerHTML = '<p class="empty-tip">暂无历史记录</p>';
    return;
  }
  
  container.innerHTML = history.map(item => `
    <div class="history-item" data-id="${item.id}">
      <div class="history-header-row">
        <span class="history-type">${item.typeName}</span>
        <span class="history-time">${formatTime(item.timestamp)}</span>
      </div>
      <div class="history-input">${escapeHtml(item.input)}</div>
      <div class="history-actions-row">
        <button onclick="loadHistoryItem(${item.id})">查看</button>
        <button onclick="deleteHistoryItem(${item.id})">删除</button>
      </div>
    </div>
  `).join('');
}

function loadHistoryItem(id) {
  const history = JSON.parse(localStorage.getItem('cost_analysis_history') || '[]');
  const item = history.find(h => h.id === id);
  
  if (!item) return;
  
  // 切换到对应选项卡并显示结果
  const typeMap = {
    'cost-calc': 'cost-calc',
    'variance': 'variance',
    'sensitivity': 'sensitivity',
    'compare': 'compare'
  };
  
  const tabId = typeMap[item.type];
  if (tabId) {
    document.querySelector(`[data-tab="${tabId}"]`)?.click();
    displayResult(item.type, { content: item.result });
  }
}

function deleteHistoryItem(id) {
  let history = JSON.parse(localStorage.getItem('deepseek_cost_analysis_history') || '[]');
  history = history.filter(h => h.id !== id);
  localStorage.setItem('deepseek_cost_analysis_history', JSON.stringify(history));
  renderHistory();
  showToast('已删除', 'success');
}

function clearAllHistory() {
  if (!confirm('确定要清空所有历史记录吗？')) return;
  
  localStorage.removeItem('deepseek_cost_analysis_history');
  renderHistory();
  showToast('历史记录已清空', 'success');
}

// ==================== 模板 ====================
const templates = {
  perc_182: `计算 PERC 182mm 电池片单位成本

【基础参数】
- 硅片规格：182mm (M10)
- 硅片厚度：150μm
- 电池片功率：7.6W/片
- 转换效率：23.5%

【材料成本】
- 硅片价格：1.08 元/片
- 正银浆：90mg/片，价格 7850 元/kg
- 背银浆：60mg/片，价格 5200 元/kg
- 铝浆：1.2g/片，价格 22 元/kg
- 其他化学品：0.03 元/W

【加工成本】
- 加工费：0.12 元/W (湿法+镀膜+烧结)
- 折旧+能耗+人工：0.04 元/W
- 良率：98.5%

【计算要求】
1. 计算单片电池片的硅片成本
2. 计算银浆成本（正银+背银）
3. 计算单位成本（元/W）
4. 分析成本构成及各部分占比
5. 给出降低银浆成本的建议`,

  topcon_182: `计算 TOPCon 182mm 电池片单位成本

【基础参数】
- 硅片规格：182mm (M10)
- 硅片厚度：130μm
- 电池片功率：8.1W/片
- 转换效率：25.5%

【材料成本】
- 硅片价格：1.08 元/片
- 正银浆：100mg/片，价格 7850 元/kg
- 背银浆：40mg/片，价格 5200 元/kg
- 铝浆：0.8g/片，价格 22 元/kg
- 靶材+特殊化学品：0.04 元/W

【加工成本】
- 加工费：0.14 元/W (多道镀膜工序)
- 折旧+能耗+人工：0.04 元/W
- 良率：96%

【计算要求】
1. 计算单片电池片的总材料成本
2. 对比 PERC 和 TOPCon 的银浆耗量差异
3. 计算单位成本（元/W）
4. 分析虽然 TOPCon 效率更高但加工费也更贵的原因
5. 计算 TOPCon 相比 PERC 的成本优势`,

  hjt_210: `计算 HJT 210mm 电池片单位成本

【基础参数】
- 硅片规格：210mm (G12)
- 硅片厚度：110μm
- 电池片功率：11.2W/片
- 转换效率：26.5%

【材料成本】
- 硅片价格：1.40 元/片
- 低温银浆：180mg/片，价格 8500 元/kg
- 无铝浆（HJT 不需要铝浆）
- TCO 靶材：0.04 元/W
- 化学品：0.02 元/W

【加工成本】
- 加工费：0.15 元/W (PECVD+低温工艺)
- 折旧+能耗+人工：0.05 元/W
- 良率：94%

【计算要求】
1. 计算单片电池片的总材料成本
2. 分析 HJT 银浆耗量大的原因及低温银浆价格高的原因
3. 计算单位成本（元/W）
4. 对比 PERC/TOPCon/HJT 三种技术路线的成本
5. 分析 HJT 降本路径（薄片化、银包铜、0BB 等）`,

  module_182: `分析 182mm 组件成本构成

【组件规格】
- 组件功率：550W
- 电池片类型：PERC 182mm
- 电池片数量：72 片
- 组件尺寸：2278×1134×30mm

【材料成本】
- 电池片：72 片 × 0.31 元/W = 电池片总成本
- 玻璃：3.2mm，22 元/㎡，面积约 2.59 ㎡
- EVA 胶膜：6.8 元/㎡ × 2 层
- 背板：白色 7.5 元/㎡
- 铝合金边框：85 元/套
- 接线盒：12 元/个
- 光伏电缆 4mm：3.2 元/米 × 4 米
- 互联条+汇流条：约 80 元/kg

【加工成本】
- 人工：0.05 元/W
- 折旧+能耗：0.04 元/W
- 良率：99%

【计算要求】
1. 计算组件 BOM 成本（元/W）
2. 分析各材料成本占比（玻璃、胶膜、边框等）
3. 对比电池片成本和辅材成本比例
4. 给出降低辅材成本的建议
5. 计算不同功率档（540W/550W/560W）的成本差异`,

  module_210: `分析 210mm 组件成本构成

【组件规格】
- 组件功率：660W
- 电池片类型：TOPCon 210mm
- 电池片数量：60 片
- 组件尺寸：2384×1303×35mm

【材料成本】
- 电池片：60 片 × 0.42 元/W = 电池片总成本
- 玻璃：2.0mm（双面双玻），14 元/㎡ × 2 层
- POE 胶膜：10.5 元/㎡ × 2 层
- 无背板（双玻组件）
- 铝合金边框：90 元/套（更大尺寸）
- 接线盒：15 元/个
- 光伏电缆 4mm：3.2 元/米 × 4 米
- 互联条+汇流条：约 82 元/kg

【加工成本】
- 人工：0.04 元/W（大尺寸效率更高）
- 折旧+能耗：0.04 元/W
- 良率：98.5%

【计算要求】
1. 计算组件 BOM 成本（元/W）
2. 对比 182 组件和 210 组件的成本差异
3. 分析双玻组件相比单玻组件的成本优势（无背板、玻璃降价）
4. 计算大尺寸组件在人工和物流方面的降本效果
5. 评估 210 组件的性价比`,

  wafer_impact: `分析硅片价格上涨对电池片成本的影响

【当前市场情况】
- M10 硅片当前价格：1.08 元/片
- M10 硅片价格上涨后：1.35 元/片（涨幅 25%）
- PERC 182 电池片当前售价：0.31 元/W

【成本结构】
- 电池片功率：7.6W/片
- 当前硅片成本占比：约 46%
- 当前单位成本：0.295 元/W

【分析要求】
1. 计算硅片涨价前后的电池片单位成本
2. 计算硅片每涨 0.1 元/片，电池片成本增加多少元/W
3. 分析在电池片售价不变的情况下，利润空间压缩多少
4. 评估硅片涨价对 PERC/TOPCon/HJT 的不同影响程度
5. 给出应对硅片涨价的策略（长单锁价、薄片化、提升良率等）`,

  silver_impact: `分析银浆价格波动对电池片成本的影响

【当前市场情况】
- 正银浆当前价格：7850 元/kg
- 正银浆价格波动：±20%（6280~9420 元/kg）
- 白银现货价格波动区间

【技术路线银浆耗量】
- PERC 182：正银 90mg + 背银 60mg = 150mg/片
- TOPCon 182：正银 100mg + 背银 40mg = 140mg/片
- HJT 210：低温银 180mg/片

【分析要求】
1. 计算银浆价格涨 20% 时，各技术路线的成本增加
2. 计算银浆价格跌 20% 时，各技术路线的成本降低
3. 分析银浆价格波动对不同技术路线的影响敏感度
4. 评估银包铜、0BB 等降银技术的降本潜力
5. 给出应对银浆价格波动的采购策略和库存管理建议`,

  tech_compare: `对比 PERC/TOPCon/HJT/BC 四种技术路线成本

【对比参数】
- 统一基准：182mm 或 210mm 硅片
- 硅片价格：182mm = 1.08元/片，210mm = 1.40元/片

【各技术路线参数】
PERC 182：
- 效率 23.5%，功率 7.6W/片
- 银浆 150mg/片，加工费 0.12元/W
- 良率 98.5%

TOPCon 182：
- 效率 25.5%，功率 8.1W/片
- 银浆 140mg/片，加工费 0.14元/W
- 良率 96%

HJT 210：
- 效率 26.5%，功率 11.2W/片
- 银浆 180mg/片，加工费 0.15元/W
- 良率 94%

BC 182：
- 效率 26%，功率 8.2W/片
- 银浆 130mg/片，加工费 0.16元/W
- 良率 95%

【分析要求】
1. 分别计算四种技术路线的单位成本（元/W）
2. 分析各技术路线的成本构成差异
3. 对比效率提升和成本增加的关系
4. 评估各技术路线的性价比（成本/效率比）
5. 给出不同应用场景的技术路线选择建议`,

  variance_analysis: `光伏电池片生产成本差异分析

【标准成本】(月度预算)
- 产量预算：1000 万片 PERC 182
- 标准硅片成本：1.08 元/片
- 标准银浆成本：正银 7850元/kg × 90mg + 背银 5200元/kg × 60mg
- 标准加工费：0.12 元/W
- 标准良率：98.5%
- 标准单位成本：0.295 元/W

【实际成本】(实际生产)
- 实际产量：980 万片
- 实际硅片价格：1.15 元/片（涨价）
- 实际银浆耗量：正银 95mg/片（超耗），银浆价格不变
- 实际加工费：0.125 元/W（设备维护增加）
- 实际良率：97.8%（下降）
- 实际单位成本：0.312 元/W

【分析要求】
1. 计算硅片价格差异和用量差异
2. 计算银浆价格差异和用量差异（耗量变化）
3. 计算加工费差异和良率损失差异
4. 分析不利差异产生的原因
5. 给出成本控制和改进建议`,

  break_even: `光伏产线盈亏平衡分析

【产线参数】
- 产线类型：PERC 182 电池片
- 产能：500MW/年（约 6579 万片）
- 当前产能利用率：80%

【固定成本】(每月)
- 厂房租金：50 万元
- 设备折旧：300 万元
- 管理人员工资：80 万元
- 其他固定费用：40 万元
- 合计：470 万元/月

【变动成本】
- 硅片：1.08 元/片
- 银浆+化学品：约 0.12 元/W
- 加工费：0.12 元/W
- 人工：0.03 元/W
- 变动制造费用：0.02 元/W
- 合计：约 0.29 元/W

【市场价格】
- 当前电池片售价：0.31 元/W

【分析要求】
1. 计算单位边际贡献和边际贡献率
2. 计算月度盈亏平衡点（产量和金额）
3. 计算在当前产能利用率下的月度利润
4. 分析如果电池片价格降到 0.28 元/W 的盈亏情况
5. 给出提升产能利用率或降低成本的策略`
};

function loadTemplate(templateKey) {
  const input = document.getElementById('costInput');
  if (input && templates[templateKey]) {
    input.value = templates[templateKey];
    input.focus();
    showToast('模板已加载', 'success');
  }
}

function loadVarianceExample() {
  const input = document.getElementById('varianceInput');
  if (input && templates['variance_analysis']) {
    input.value = templates['variance_analysis'];
    showToast('示例已加载', 'success');
  }
}

function loadSensitivityExample() {
  const input = document.getElementById('sensitivityInput');
  if (input && templates['silver_impact']) {
    input.value = templates['silver_impact'];
    showToast('示例已加载', 'success');
  }
}

function loadCompareExample() {
  const input = document.getElementById('compareInput');
  if (input && templates['tech_compare']) {
    input.value = templates['tech_compare'];
    showToast('示例已加载', 'success');
  }
}

// ==================== 导出功能 ====================
function exportResult(format) {
  const content = document.getElementById('costResultContent')?.textContent;
  if (!content) {
    showToast('没有可导出的内容', 'error');
    return;
  }
  
  const timestamp = new Date().toISOString().slice(0, 10);
  let filename, mimeType, blobContent;
  
  if (format === 'markdown') {
    filename = `成本分析_${timestamp}.md`;
    mimeType = 'text/markdown';
    blobContent = content;
  } else {
    filename = `成本分析_${timestamp}.txt`;
    mimeType = 'text/plain';
    blobContent = content;
  }
  
  downloadFile(blobContent, filename, mimeType);
  showToast('导出成功', 'success');
}

function exportVariance(format) {
  const content = document.getElementById('varianceResultContent')?.textContent;
  if (!content) {
    showToast('没有可导出的内容', 'error');
    return;
  }
  
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `差异分析_${timestamp}.md`;
  downloadFile(content, filename, 'text/markdown');
  showToast('导出成功', 'success');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyResult() {
  const content = document.getElementById('costResultContent')?.textContent;
  if (!content) {
    showToast('没有可复制的内容', 'error');
    return;
  }
  
  navigator.clipboard.writeText(content).then(() => {
    showToast('已复制到剪贴板', 'success');
  }).catch(() => {
    showToast('复制失败', 'error');
  });
}

// ==================== 工具函数 ====================
function showLoading(text) {
  const mask = document.getElementById('loadingMask');
  const loadingText = document.getElementById('loadingText');
  if (mask) {
    if (loadingText) loadingText.textContent = text || 'AI 正在分析中...';
    mask.style.display = 'flex';
  }
}

function hideLoading() {
  const mask = document.getElementById('loadingMask');
  if (mask) mask.style.display = 'none';
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== 键盘快捷键 ====================
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Enter 快速分析
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const activeTab = document.querySelector('.nav-tab.active')?.dataset.tab;
    if (activeTab) {
      analyzeCost(activeTab);
    }
  }
});

console.log('[成本智能分析助手 - 本地后端版] 加载完成');
