const express = require("express");
const zod = require("zod");
const { User, Account } = require("../db");
const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../config');
const { authMiddleware } = require("../middleware");

const router = express.Router();

const signUpSchema = zod.object({
    username: zod.string().email(),
    password: zod.string(),
    firstName: zod.string(),
    lastName: zod.string()
})

const signInSchema = zod.object({
    username: zod.string().email(),
    password: zod.string()
})

const updateSchema = zod.object({
    password: zod.string().optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional()
})

router.post('/signup', async (req, res) => {
    const {success} = signUpSchema.safeParse(req.body);
    if (!success) {
        return res.status(411).json({
            message: "Email already taken / Incorrect inputs"
        })
    }

    const existingUser = await User.findOne({
        username: req.body.username
    })

    if (existingUser) {
        return res.status(411).json({
            message: "Email already taken / Incorrect Inputs"
        })
    }

    const user = await User.create({
        username: req.body.username,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName
    });

    const userId = user._id;

    await Account.create({
        userId: userId,
        balance: 1 + Math.random() * 10000
    })

    const token = jwt.sign({
        userId
    }, JWT_SECRET)

    res.status(200).json({
        message: "User Created Successfully",
        token: token
    })
})

router.post('/signin', async (req, res) => {
    const {success} = signInSchema.safeParse(req.body);
    if (!success) {
        return res.status(411).json({
            message: "Invalid email/password"
        })
    }

    const user = await User.findOne({
        username: req.body.username,
        password: req.body.password
    })

    if (user) {
        const token = jwt.sign({
            userId: user._id
        }, JWT_SECRET)

        res.status(200).json({
            message: "User Signed In Successfully",
            token: token
        })
        return;
    }

    res.status(411).json({
        message: "Error while signing in"
    })
})

router.put('/', authMiddleware, async (req, res) => {
    const {success} = updateUserSchema.safeParse(req.body);
    if (!success) {
        return res.status(411).json({
            message: "Error while updating information"
        })
    }

    await User.updateOne(req,body, {
        id: req.userId
    })

    res.status(200).json({
        message: "User Information Updated Successfully"
    })
})

router.get('/bulk', async(req, res) => {
    const filter = req.query.filter || "";

    const users = await User.find ({
        $or: [{
            firstName: {
                $regex: filter,
            }
        }, {
            lastName: {
                $regex: filter
            }
        }]
    })

    res.json({
        user: users.map(user => ({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            _id: user._id
        }))
    })
}) 

module.exports = router;