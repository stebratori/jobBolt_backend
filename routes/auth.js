import express from "express";
import FirebaseNonAdmin from "../services/firebaseNonAdmin.js";


const router = express.Router();
const firebaseService = new FirebaseNonAdmin()
router.post("/login", async (req, res, next) => {
    try {
        const body = req.body;

        const {email, password} = body;
        //const firebaseService = FirebaseNonAdmin.getInstance()user
        const user = await firebaseService.login(email, password);
        req.session.jwt = user.accessToken;
        req.session.refresh_token = user.refreshToken;
        const userToSend = {uid: user.uid, email: user.email};
        return res.status(201).json(userToSend)
    } catch (e) {
        console.log(e);
        res.status(400).json({error: e.message});
    }
})

router.get('/check-session', (req, res) => {
    console.log("SID from cookie:", req.cookies['connect.sid']); // ✅ Loguj SID iz kolačića
    console.log("Session ID:", req.sessionID);
    console.log("Session data:", req.session);
    res.json({sessionID: req.sessionID, sessionData: req.session});
});


router.post("/register", async (req, res, next) => {
    try {
        const body = req.body;

        const {email, password, companyName} = body;
        const user = await firebaseService.signUp(email, password, companyName);
        return res.status(201).json(user)
    } catch (e) {
        e.logger.error(e);
        res.status(400).json({error: e.message});
    }
})

router.post("/logout", async (req, res, next) => {

})

export default router;