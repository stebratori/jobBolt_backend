import FirebaseService from '../services/firebaseService.js'

const service = new FirebaseService();
export default async function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split("Bearer ")[1]; // Uzmi token iz Authorization headera
    console.log(token);
    const admin = service.getAdmin()
    if (!token) {
        return res.status(401).json({message: "No token provided"});
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // Dodaj korisnika u request
        next();
    } catch (error) {
        console.log(error);
        return res.status(403).json({message: "Invalid or expired token"});
    }
}

