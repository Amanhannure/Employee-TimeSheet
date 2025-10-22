import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import { authenticate, authorizeAdmin } from './middleware/authMiddleware.js';


dotenv.config();
const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'));

app.use('/api/auth', authRoutes);

// Example protected route only accessible by admin
app.get('/api/admin-only', authenticate, authorizeAdmin, (req, res) => {
  res.json({ message: `Welcome Admin ${req.user.username}` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

