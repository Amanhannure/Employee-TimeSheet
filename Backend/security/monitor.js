export const securityMonitor = {
  suspiciousActivities: new Map(),
  
  logSuspiciousActivity: (type, ip, details) => {
    const key = `${ip}_${type}`;
    const count = this.suspiciousActivities.get(key) || 0;
    this.suspiciousActivities.set(key, count + 1);
    
    if (count > 10) {
      console.warn(`🚨 SECURITY ALERT: ${type} from ${ip}`, details);
    }
  }
};