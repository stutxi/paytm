const express = require('express');
const app = express();
const router = express.Router();
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware');
const { Account } = require('../db');

router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const account = await Account.findOne({ userId: req.userId });
        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }
        res.json({ balance: account.balance });
    } catch (err) {
        res.status(500).json({ message: "Error fetching balance", error: err.message });
    }
});

router.post('/transfer', authMiddleware, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount, to } = req.body;

        // Input validation
        if (!amount || amount <= 0 || !to) {
            await session.abortTransaction();
            return res.status(400).json({ message: "Invalid input" });
        }

        // Fetch accounts within the transaction
        const account = await Account.findOne({ userId: req.userId }).session(session);
        const toAccount = await Account.findOne({ userId: to }).session(session);

        if (!account || account.balance < amount) {
            await session.abortTransaction();
            return res.status(400).json({ message: "Insufficient balance" });
        }

        if (!toAccount) {
            await session.abortTransaction();
            return res.status(400).json({ message: "Recipient not found" });
        }

        // Update balances
        await Account.updateOne({ userId: req.userId }, { $inc: { balance: -amount } }).session(session);
        await Account.updateOne({ userId: to }, { $inc: { balance: amount } }).session(session);

        await session.commitTransaction();
        res.json({ message: "Transfer successful" });
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ message: "Transfer failed", error: err.message });
    } finally {
        session.endSession();
    }
});

module.exports = router;
