module.exports = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    // Check if the request is an API request or expects JSON
    if (req.path.startsWith('/api') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return res.redirect('/login.html');
  }
};
