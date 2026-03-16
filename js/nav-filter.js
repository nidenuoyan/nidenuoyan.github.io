/**
 * 导航菜单过滤器 - 只保留4个核心菜单项
 */
(function() {
  'use strict';
  
  // 需要隐藏的菜单项（匹配链接 href 或文本内容）
  const hideRules = [
    { type: 'href', value: '/portfolio/', iconCheck: 'fa-briefcase' }, // 项目作品（有 briefcase 图标）
    { type: 'href', value: '/categories/%E6%95%B0%E6%8D%AE%E5%88%86%E6%9E%90/' }, // 数据分析分类
    { type: 'href', value: '/factor-generator/' }, // 光伏成本
    { type: 'href', value: '/archives/' }, // 归档
    { type: 'href', value: '/link/' }, // 友链
    { type: 'text', value: '关于', exact: false, exclude: '关于我' }, // 简短的"关于"（不是"关于我"）
  ];
  
  function filterMenus() {
    // 获取所有菜单项（包括顶部导航和侧边栏）
    const menuItems = document.querySelectorAll('.menus_item');
    
    menuItems.forEach(item => {
      const link = item.querySelector('a.site-page');
      if (!link) return;
      
      const href = link.getAttribute('href') || '';
      const text = link.textContent.trim();
      const icon = link.querySelector('i');
      const iconClass = icon ? icon.className : '';
      
      let shouldHide = false;
      
      for (const rule of hideRules) {
        if (rule.type === 'href') {
          if (href === rule.value || href.includes(rule.value)) {
            // 如果指定了图标检查，确保图标匹配
            if (rule.iconCheck) {
              if (iconClass.includes(rule.iconCheck)) {
                shouldHide = true;
                break;
              }
            } else {
              shouldHide = true;
              break;
            }
          }
        } else if (rule.type === 'text') {
          if (rule.exact) {
            if (text === rule.value) {
              shouldHide = true;
              break;
            }
          } else {
            // 包含匹配，但排除特定文本
            if (text.includes(rule.value)) {
              if (rule.exclude && text.includes(rule.exclude)) {
                // 包含排除文本，不隐藏
                shouldHide = false;
              } else {
                shouldHide = true;
                break;
              }
            }
          }
        }
      }
      
      if (shouldHide) {
        item.style.display = 'none';
        item.style.visibility = 'hidden';
      }
    });
  }
  
  // 页面加载完成后执行
  function init() {
    // 立即执行
    filterMenus();
    
    // 延迟执行以确保动态内容也被处理
    setTimeout(filterMenus, 100);
    setTimeout(filterMenus, 500);
    setTimeout(filterMenus, 1000);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // 监听可能的菜单变化
  const observer = new MutationObserver(function(mutations) {
    filterMenus();
  });
  
  // 开始监听
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
