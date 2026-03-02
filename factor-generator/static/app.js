const btn = document.getElementById('submitBtn');
const input = document.getElementById('inputText');
const datasourceSel = document.getElementById('datasource');
const chatResults = document.getElementById('chatResults');
const clearBtn = document.getElementById('clearBtn');
const historyList = document.getElementById('historyList');
const suggestionList = document.getElementById('suggestionList');
let sessionId = null;
let history = [];

const suggestions = [
  { label: '波动率', text: '标的 AAPL，日频收盘价，过去20日 波动率' },
  { label: '动量', text: '标的 AAPL，日频收盘价，过去60日 动量' },
  { label: '均线', text: '标的 AAPL，日频收盘价，过去20日 均线' },
  { label: '收益率', text: '标的 AAPL，日频收盘价，收益率' },
  { label: '换手率', text: '标的 000001.SZ，日频，换手率 因子，窗口20' },
  { label: '夏普率', text: '标的 AAPL，日频收盘价，过去60日 夏普率，无风险利率2%，年化' },
  { label: '索提诺', text: '标的 AAPL，日频收盘价，过去60日 索提诺比率，无风险利率2%，年化' },
  { label: '信息比率', text: '标的 AAPL，基准 SPY，信息比率，窗口60，年化' },
  { label: '最大回撤', text: '标的 AAPL，过去120日 最大回撤' },
  { label: 'RSI', text: '标的 AAPL，日频收盘价，过去14日 RSI' },
  { label: 'MACD', text: '标的 AAPL，日频收盘价，MACD(12,26,9)' },
  { label: '市值', text: '标的 AAPL，日频，市值 因子，窗口20' },
];

function renderSuggestions() {
  if (!suggestionList) return;
  suggestionList.innerHTML = '';
  suggestions.forEach(s => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = s.label;
    b.title = s.text;
    b.onclick = () => {
      input.value = s.text;
      btn.click();
    };
    suggestionList.appendChild(b);
  });
}
renderSuggestions();

function renderResult(data) {
  chatResults.innerHTML = '';
  const block = document.createElement('div');
  block.className = 'result-block';
  const h = document.createElement('h2');
  h.textContent = '结果';
  const actions = document.createElement('div');
  actions.className = 'block-actions';
  const exportCsvBtn = document.createElement('button');
  exportCsvBtn.className = 'btn small';
  exportCsvBtn.textContent = '导出CSV';
  const exportJsonBtn = document.createElement('button');
  exportJsonBtn.className = 'btn small';
  exportJsonBtn.textContent = '导出JSON';
  const copyCodeBtn = document.createElement('button');
  copyCodeBtn.className = 'btn small';
  copyCodeBtn.textContent = '复制代码';
  const titleDesc = document.createElement('h3');
  titleDesc.className = 'subsection-title';
  titleDesc.textContent = '因子描述';
  const descDiv = document.createElement('div');
  descDiv.textContent = data.description || '';
  const titleLatex = document.createElement('h3');
  titleLatex.className = 'subsection-title';
  titleLatex.textContent = '数学表达式';
  const latexDiv = document.createElement('div');
  latexDiv.textContent = data.expression_latex || '';
  const titleCode = document.createElement('h3');
  titleCode.className = 'subsection-title';
  titleCode.textContent = 'Python代码';
  const codePre = document.createElement('pre');
  codePre.textContent = data.code || '';
  const spec = data.spec || {};
  const titleSpec = document.createElement('h3');
  titleSpec.className = 'subsection-title';
  titleSpec.textContent = '规格详情';
  const specTable = document.createElement('table');
  specTable.innerHTML = '<thead><tr><th>key</th><th>value</th></tr></thead><tbody></tbody>';
  const specBody = specTable.querySelector('tbody');
  Object.keys(spec).forEach(k => {
    const tr = document.createElement('tr');
    const tk = document.createElement('td');
    tk.textContent = k;
    const tv = document.createElement('td');
    tv.textContent = String(spec[k]);
    tr.appendChild(tk);
    tr.appendChild(tv);
    specBody.appendChild(tr);
  });
  const titleSeries = document.createElement('h3');
  titleSeries.className = 'subsection-title';
  titleSeries.textContent = '因子值序列';
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>date</th><th>factor_value</th></tr></thead><tbody></tbody>';
  const tbody = table.querySelector('tbody');
  (data.dataframe?.data || []).slice(0, 200).forEach(row => {
    const tr = document.createElement('tr');
    const td0 = document.createElement('td');
    td0.textContent = row[0];
    const td1 = document.createElement('td');
    td1.textContent = typeof row[1] === 'number' ? row[1].toFixed(6) : row[1];
    tr.appendChild(td0);
    tr.appendChild(td1);
    tbody.appendChild(tr);
  });
  block.appendChild(h);
  actions.appendChild(exportCsvBtn);
  actions.appendChild(exportJsonBtn);
  actions.appendChild(copyCodeBtn);
  block.appendChild(actions);
  block.appendChild(titleDesc);
  block.appendChild(descDiv);
  block.appendChild(titleLatex);
  block.appendChild(latexDiv);
  block.appendChild(titleCode);
  block.appendChild(codePre);
  block.appendChild(titleSpec);
  block.appendChild(specTable);
  block.appendChild(titleSeries);
  block.appendChild(table);
  chatResults.appendChild(block);
  const title = (data.spec?.operation || 'factor') + ' · ' + (data.spec?.symbol || '');
  exportCsvBtn.onclick = () => {
    const cols = (data.dataframe?.columns || []);
    const rows = (data.dataframe?.data || []);
    const csvRows = [];
    csvRows.push(cols.join(','));
    rows.forEach(r => {
      const line = r.map(v => {
        if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`;
        return v;
      }).join(',');
      csvRows.push(line);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g,'_')}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };
  exportJsonBtn.onclick = () => {
    const payload = {
      description: data.description,
      expression_latex: data.expression_latex,
      code: data.code,
      spec: data.spec,
      dataframe: data.dataframe
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g,'_')}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };
  copyCodeBtn.onclick = async () => {
    const text = data.code || '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      const old = copyCodeBtn.textContent;
      copyCodeBtn.textContent = '已复制';
      setTimeout(() => { copyCodeBtn.textContent = old; }, 1500);
    } catch (e) {
      const old = copyCodeBtn.textContent;
      copyCodeBtn.textContent = '复制失败';
      setTimeout(() => { copyCodeBtn.textContent = old; }, 1500);
    }
  };
  if (window.MathJax && window.MathJax.typeset) {
    window.MathJax.typeset();
  }
}

function opLabel(op) {
  const map = {
    volatility: '波动率',
    momentum: '动量',
    moving_average: '均线',
    return: '收益率',
    turnover: '换手率',
    sharpe: '夏普率'
  };
  return map[op] || op || '因子';
}

btn.addEventListener('click', async () => {
  const text = input.value.trim();
  const datasource = datasourceSel.value;
  if (!text) {
    alert('请输入因子描述');
    return;
  }
  btn.disabled = true;
  btn.textContent = '发送中...';
  try {
    const payload = { text, datasource, session_id: sessionId };
    const resp = await fetch('http://localhost:8000/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(t);
    }
    const data = await resp.json();
    sessionId = data.session_id || sessionId;
    const title = opLabel(data.spec?.operation) + ' · ' + (data.spec?.symbol || '');
    const time = new Date().toLocaleTimeString();
    const item = { id: Date.now(), title, time, data };
    history.unshift(item);
    renderHistory();
    renderResult(data);
    input.value = '';
  } catch (e) {
    alert('生成失败: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '发送';
  }
});

clearBtn.addEventListener('click', () => {
  sessionId = null;
  chatResults.innerHTML = '';
  history = [];
  renderHistory();
});

function renderHistory() {
  historyList.innerHTML = '';
  history.forEach(item => {
    const li = document.createElement('li');
    li.className = 'history-item';
    const title = document.createElement('div');
    title.className = 'history-title';
    title.textContent = item.title;
    const time = document.createElement('div');
    time.className = 'history-time';
    time.textContent = item.time;
    li.appendChild(title);
    li.appendChild(time);
    li.onclick = () => {
      if (item.data) {
        renderResult(item.data);
      }
    };
    historyList.appendChild(li);
  });
}
