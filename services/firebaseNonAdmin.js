import {firebaseConfig} from "../utils/firebaseConfig.js";
import {initializeApp} from "firebase/app";
import {getFirestore} from "firebase/firestore";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signOut
} from "firebase/auth";

export default class FirebaseNonAdmin {

    instance; // Singleton instance
    db; // Firestore database instance
    auth; // Firebase Auth instanceonAuthStateChanged
    currentUser; // Current logged-in user
    currentCompany; // Current logged-in company
    authInitialized;
    companyLoaded;
    changelogUnsubscribe;
    serverUrl = 'https://warm-brushlands-63272-503e36afff7e.herokuapp.com/api/firebase';

    constructor() {
        if (!firebaseConfig.apiKey) {
            console.error("Firebase API Key is missing. Please check your environment variables.");
        }

        // Initialize Firebase
        initializeApp(firebaseConfig);
        this.db = getFirestore(); // Initialize Firestore
        console.log("Initializing Firestore...");
        this.auth = getAuth(); // Initialize Firebase Auth
        console.log("Initializing Firebase Auth...");
        // Set up an auth state listener
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            if (user) {
                console.log("User logged in:", user.email);
            } else {
                console.log("User logged out.");
            }
        });
    }

    // Singleton pattern to ensure only one instance exists
    getInstance() {
        if (!FirebaseNonAdmin.instance) {
            FirebaseNonAdmin.instance = new FirebaseNonAdmin();
        }
        return FirebaseNonAdmin.instance;
    }

    async getCompanyById(companyId) {
        try {
            const url = `${this.serverUrl}/company/${companyId}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Error fetching company: ${response.statusText}`);
            }
            const company = await response.json();
            return company;
        } catch (error) {
            console.error('Error fetching company:', error);
            return null;
        }
    }

    // COMPANY
    async addNewCompany(company) {
        try {
            const url = `${this.serverUrl}/company`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(company),
            });

            if (!response.ok) {
                throw new Error(`Error creating company: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Company created:', result);
        } catch (error) {
            console.error('Error creating company:', error);
        }
    }

    setCurrentCompany(company) {
        this.currentCompany = company;
    }

    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const company = await this.getCompanyById(userCredential.user.uid);
            if (!company) {
                throw new Error("Company not found");
            }
            this.setCurrentCompany(company);
            return userCredential.user;
        } catch (error) {
            console.error("Error during login:", error);
            throw error;
        }
    }

    async signUp(email, password, companyName) {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            await sendEmailVerification(userCredential.user);
            await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
            let company = {
                id: userCredential.user.uid,
                name: companyName,
                email: email
            };
            await this.addNewCompany(company);
            console.log("User signed up successfully:", userCredential.user);
            return userCredential.user;
        } catch (error) {
            console.error("Error during sign-up:", error);
            throw error;
        }
    }

    async logout() {
        try {
            await signOut(this.auth);
            this.currentCompany = null;
            console.log("User logged out successfully.");
        } catch (error) {
            console.error("Error during logout:", error);
            throw error;
        }
    }
}
