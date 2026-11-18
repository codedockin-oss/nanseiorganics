// Articles: /api/blogs (shared routes in postRoutes.js)
module.exports = require('./postRoutes')(require('../models/Blog'), 'blog', 'Article');
