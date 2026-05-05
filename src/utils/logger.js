// utils/logger.js
export const debugLogs = [];
const listeners = new Set();

export const LOG_LEVELS = {
  INFO: { color: 'text-blue-400', label: 'INFO', bg: 'bg-blue-500/10' },
  SUCCESS: { color: 'text-green-400', label: 'SUCCESS', bg: 'bg-green-500/10' },
  WARN: { color: 'text-yellow-400', label: 'WARN', bg: 'bg-yellow-500/10' },
  ERROR: { color: 'text-red-400', label: 'ERROR', bg: 'bg-red-500/10' },
  PERF: { color: 'text-purple-400', label: 'PERF', bg: 'bg-purple-500/10' }
};

/**
 * Adiciona um log ao console de debug
 */
export const addLog = (tag, data = {}, level = 'INFO') => {
  try {
    const entry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      tag: tag.toUpperCase(),
      level,
      data: data ? JSON.parse(JSON.stringify(data, (key, value) => 
        typeof value === 'function' ? '[Function]' : value
      )) : {},
      pathname: window.location.pathname,
      memory: window.performance?.memory?.usedJSHeapSize 
        ? Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' 
        : 'N/A'
    };
    
    debugLogs.unshift(entry);
    if (debugLogs.length > 300) debugLogs.pop(); // Aumentado para 300 logs
    
    // Espelha no console real do navegador para desenvolvedores
    const consoleMethod = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log';
    console[consoleMethod](`[${tag}]`, data);
    
    listeners.forEach(listener => listener([...debugLogs]));
  } catch (e) {
    console.error("Logger critical error:", e);
  }
};

/**
 * Mede o tempo de execução de uma função (Síncrona ou Assíncrona)
 * Exemplo: const data = await measurePerf('Busca API', () => fetch(...))
 */
export const measurePerf = async (label, fn) => {
  const start = performance.now();
  addLog(`PERF_START: ${label}`, { startTime: start }, 'PERF');
  
  try {
    const result = await fn();
    const end = performance.now();
    const duration = (end - start).toFixed(2);
    
    addLog(`PERF_DONE: ${label}`, { 
      duration: `${duration}ms`,
      status: 'success' 
    }, 'PERF');
    
    return result;
  } catch (error) {
    const end = performance.now();
    addLog(`PERF_FAIL: ${label}`, { 
      duration: `${(end - start).toFixed(2)}ms`,
      error: error.message 
    }, 'ERROR');
    throw error;
  }
};

// Captura automática de eventos de rede (Online/Offline)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => addLog('NETWORK', { status: 'online' }, 'SUCCESS'));
  window.addEventListener('offline', () => addLog('NETWORK', { status: 'offline' }, 'ERROR'));
  
  window.onerror = (msg, url, line, col, error) => {
    addLog('RUNTIME_ERROR', { msg, url, line, col, stack: error?.stack }, 'ERROR');
  };
}

export const clearLogs = () => {
  debugLogs.length = 0;
  listeners.forEach(listener => listener([]));
};

export const subscribeLogs = (callback) => {
  listeners.add(callback);
  callback([...debugLogs]);
  return () => listeners.delete(callback);
};