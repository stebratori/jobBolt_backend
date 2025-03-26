import FirebaseService from '../services/firebaseService.js'

const service = new FirebaseService();
export default async function verifyToken(req, res, next) {
    // const token = req.headers.authorization?.split("Bearer ")[1]; // Uzmi token iz Authorization headera
    const token = req.session.jwt; // Uzmi token iz sessiona
    const admin = service.getAdmin()
    if (!token) {
        return res.status(401).json({message: "No token provided"});
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // Dodaj korisnika u request
        next();
    } catch (error) {
        console.log(error.message, error.code);
        if (error.code === 'auth/id-token-expired') {
            const newToken = await fetch(`https://securetoken.googleapis.com/v1/token?key=${process.env.FIREBASE_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: req.session.refresh_token,
                }),
            })
            const parsed = await newToken.json()
            req.session.jwt = parsed.access_token
            next()
        } else {
            return res.status(403).json({message: "Invalid token"});
        }
    }
}

