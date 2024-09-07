const express = require("express");
const zod = require("zod");
const { User, Account } = require("../db");
const jwt = require('jsonwebtoken');
const { authMiddleware } = require("../middleware");
require('dotenv').config();

const router = express.Router();

const signUpSchema = zod.object({
    username: zod.string().email(),
    password: zod.string(),
    firstName: zod.string(),
    lastName: zod.string()
});

const signInSchema = zod.object({
    username: zod.string().email(),
    password: zod.string()
});

const updateSchema = zod.object({
    password: zod.string().optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional()
});

router.post('/signup', async (req, res) => {
    const validation = signUpSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({
            message: "Invalid input",
            errors: validation.error.issues
        });
    }

    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser) {
        return res.status(409).json({
            message: "Email already taken"
        });
    }

    const user = await User.create({
        username: req.body.username,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName
    });

    await Account.create({
        userId: user._id,
        balance: Math.max(1, 1 + Math.random() * 10000) 
    });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.status(200).json({ message: "User Created Successfully", token });
});

router.post('/signin', async (req, res) => {
    const validation = signInSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({
            message: "Invalid email or password",
            errors: validation.error.issues
        });
    }

    const user = await User.findOne({ username: req.body.username, password: req.body.password });
    if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.status(200).json({ message: "User Signed In Successfully", token });
});

router.put('/', authMiddleware, async (req, res) => {
    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({
            message: "Invalid input",
            errors: validation.error.issues
        });
    }

    await User.updateOne({ _id: req.userId }, req.body);

    res.status(200).json({ message: "User Information Updated Successfully" });
});

router.get('/bulk', async (req, res) => {
    const filter = req.query.filter || "";
    const users = await User.find({
        $or: [
            { firstName: { $regex: filter, $options: 'i' } },
            { lastName: { $regex: filter, $options: 'i' } }
        ]
    });

    res.json({
        users: users.map(user => ({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            _id: user._id
        }))
    });
});

module.exports = router;
