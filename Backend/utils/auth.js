import dotenv from 'dotenv';
dotenv.config();  // Add this line

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Get JWT_SECRET with fallback
const SECRET_KEY = process.env.JWT_SECRET;

// Remove the immediate error throw - handle it when functions are called
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (user) => {
  if (!SECRET_KEY) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      username: user.username,
      employeeId: user.employeeId
    },
    SECRET_KEY,
    { expiresIn: '1d' }
  );
};

export const verifyToken = (token) => {
  if (!SECRET_KEY) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  return jwt.verify(token, SECRET_KEY);
};