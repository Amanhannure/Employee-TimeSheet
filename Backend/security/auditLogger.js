export const auditLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const log = {
      timestamp: new Date(),
      userId: req.user?.id,
      action: `${req.method} ${req.url}`,
      status: res.statusCode,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    console.log('AUDIT:', JSON.stringify(log));
  });
  
  next();
};