require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Session to track patient info between pages
app.use(session({
  secret: 'bloodreportsecret',
  resave: false,
  saveUninitialized: true
}));

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/bloodReports', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ROUTES
const mainRoutes = require('./routes/mainRoutes');
app.use('/', mainRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
