import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // الدارك مود هو الافتراضي
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark';
  });

  useEffect(() => {
    // حفظ الثيم في localStorage
    localStorage.setItem('theme', theme);
    
    // تطبيق الثيم على العنصر الجذري
    document.documentElement.setAttribute('data-theme', theme);
    
    // تحديث body background
    document.body.style.backgroundColor = theme === 'dark' ? '#000000' : '#ffffff';
    
    // تحديث meta theme-color للمتصفحات
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
    
    // تحديث manifest link
    updateManifest(theme);
    
  }, [theme]);

  const updateManifest = (currentTheme) => {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      const manifestUrl = currentTheme === 'dark' 
        ? '/site.webmanifest' 
        : '/site-light.webmanifest';
      manifestLink.setAttribute('href', manifestUrl);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      
      // إضافة تأثير انتقالي سلس
      document.documentElement.classList.add('theme-transitioning');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 300);
      
      return newTheme;
    });
  };

  const setDarkTheme = () => {
    setTheme('dark');
  };

  const setLightTheme = () => {
    setTheme('light');
  };

  const value = {
    theme,
    toggleTheme,
    setDarkTheme,
    setLightTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};