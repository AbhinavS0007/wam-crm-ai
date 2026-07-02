import app from './app.js';

const PORT = 5001;



app.listen(PORT, () => {
  console.log(`WAM backend running at http://localhost:${PORT}`);
});