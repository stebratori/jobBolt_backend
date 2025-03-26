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
        return res.status(201).json(user)
    } catch (e) {
        console.log(e);
        res.status(e.code).json({error: e.message});
    }
})

router.post("/register", async (req, res, next) => {
    try {
        const body = req.body;

        const {email, password, companyName} = body;
        const user = await firebaseService.signUp(email, password, companyName);
        return res.status(201).json(user)
    } catch (e) {
        e.logger.error(e);
        res.status(e.code).json({error: e.message});
    }
})

router.post("/logout", async (req, res, next) => {
    
})

export default router;