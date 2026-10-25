import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Account } from '../models/Account.js';
import { env } from '../config/env.js';
import { AuthenticationError, ConflictError, NotFoundError } from '../utils/errors.js';
import { withTransaction } from '../config/database.js';

export class AuthService {
  static async register({ name, email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError('An account with this email already exists', 'EMAIL_ALREADY_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let user;
    let account;

    await withTransaction(async (session) => {
      const userDoc = new User({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      });
      user = await userDoc.save({ session });

      const accountDoc = new Account({
        userId: user._id,
      });
      account = await accountDoc.save({ session });
    });

    const token = this.generateToken(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      account: {
        totalCashPaise: account.totalCashPaise,
        reservedCashPaise: account.reservedCashPaise,
        availableCashPaise: account.availableCashPaise,
        currency: account.currency,
      },
      token,
    };
  }

  static async login({ email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Use a timing-safe generic error message to prevent email enumeration
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AuthenticationError('Invalid email or password');
    }

    const account = await Account.findOne({ userId: user._id });
    const token = this.generateToken(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      account: account
        ? {
            totalCashPaise: account.totalCashPaise,
            reservedCashPaise: account.reservedCashPaise,
            availableCashPaise: account.availableCashPaise,
            currency: account.currency,
          }
        : null,
      token,
    };
  }

  static async getMe(userId) {
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    let account = await Account.findOne({ userId: user._id });
    if (!account) {
      // Create if missing for any legacy/demo user
      account = await Account.create({ userId: user._id });
    }

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      account: {
        totalCashPaise: account.totalCashPaise,
        reservedCashPaise: account.reservedCashPaise,
        availableCashPaise: account.availableCashPaise,
        currency: account.currency,
      },
    };
  }

  static generateToken(user) {
    return jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      throw new AuthenticationError('Invalid or expired authentication token');
    }
  }
}
