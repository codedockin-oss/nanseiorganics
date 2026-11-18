// News updates: /api/news (shared routes in postRoutes.js)
module.exports = require('./postRoutes')(require('../models/News'), 'news', 'News update');
