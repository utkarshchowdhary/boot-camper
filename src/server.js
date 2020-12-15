require('dotenv').config({ path: './config.env' });

process.on('uncaughtException', (err) => {
  console.log(err.name);
  console.log(err.message);
  process.exit(1);
});

const app = require('./app');

const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}..`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name);
  console.log(err.message);
  server.close(() => process.exit(1));
});
