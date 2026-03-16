// 图片懒加载优化
(function() {
  'use strict';
  
  // 配置项
  const config = {
    rootMargin: '50px 0px',
    threshold: 0.01
  };
  
  // 检查浏览器是否支持 IntersectionObserver
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          loadImage(img);
          observer.unobserve(img);
        }
      });
    }, config);
    
    // 观察所有带有 loading="lazy" 属性的图片
    document.addEventListener('DOMContentLoaded', () => {
      const lazyImages = document.querySelectorAll('img[loading="lazy"]');
      lazyImages.forEach(img => imageObserver.observe(img));
    });
  } else {
    // 降级方案：直接加载所有图片
    document.addEventListener('DOMContentLoaded', () => {
      const lazyImages = document.querySelectorAll('img[loading="lazy"]');
      lazyImages.forEach(img => loadImage(img));
    });
  }
  
  // 加载图片函数
  function loadImage(img) {
    // 如果有 data-src 属性，使用它作为真实 src
    const src = img.getAttribute('data-src') || img.src;
    
    if (src && img.src !== src) {
      const tempImage = new Image();
      
      tempImage.onload = function() {
        img.src = src;
        img.classList.add('loaded');
        img.removeAttribute('data-src');
      };
      
      tempImage.onerror = function() {
        console.warn('Failed to load image:', src);
        img.classList.add('error');
      };
      
      tempImage.src = src;
    }
  }
  
  // 为表格添加响应式包装
  document.addEventListener('DOMContentLoaded', () => {
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      if (!table.parentElement.classList.contains('table-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });
  });
})();
