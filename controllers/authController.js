import User from '../models/User.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';

export const registerAdmin = async (req, res) => {
  try {
    const { username, password, email, role = 'admin' } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'Username already exists' });

    const passwordHash = await hashPassword(password);
    const newUser = new User({ username, email, passwordHash, role });
    await newUser.save();

    res.status(201).json({ message: 'Admin registered' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || user.role !== 'admin') return res.status(401).json({ message: 'Invalid credentials' });

    const validPassword = await comparePassword(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
