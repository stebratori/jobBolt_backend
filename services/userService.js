import crypto from 'crypto';
import FirebaseService from "./firebaseService.js";

const firebaseService = new FirebaseService();

export default class UserService {
    static generateUdid() {
        return crypto.randomUUID();
    }

    // Static method to generate a 6-digit random password (uppercase letters and numbers)
    static generatePassword() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length: 6 }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
    }

    // Static method to generate users with passwords for a given array of emails
    static async generateUsersAndPasswordsForEmails(emails, companyID, jobID) {
        // Create an array of candidate objects
        const candidates = emails.map(email => ({
          id: UserService.generateUdid(),
          email: email,
          password: UserService.generatePassword(),
          invitedAt: Date.now(),
        }));
        await firebaseService.storeCandidatesInJobPosting(companyID, jobID, candidates)
    
        // Separate emails and passwords into two arrays
        const emailsArray = candidates.map(candidate => candidate.email);
        const passwordsArray = candidates.map(candidate => candidate.password);
    
        // Return both arrays
        return { emailsArray, passwordsArray };
      }
}
