//import bcrypt from "bcrypt";
import bcrypt from 'bcryptjs';
//import { storage } from "./storage";
import { sqliteStorage as storage } from "./sqlite-storage";
import { type InsertUser, type LoginCredentials } from "@shared/schema";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerUser(userData: InsertUser) {
  const hashedPassword = await hashPassword(userData.password);
  return storage.createUser({
    ...userData,
    password: hashedPassword,
  });
}

export async function authenticateUser(credentials: LoginCredentials) {
  const user = await storage.getUserByUsername(credentials.username);
  
  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(credentials.password, user.password);
  
  if (!isValid) {
    return null;
  }

  return user;
}
