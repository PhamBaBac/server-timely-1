
const express = require('express');
const nodemailer = require("nodemailer");
require("dotenv").config();
const asyncHandle = require("express-async-handler");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT;



const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: process.env.USERNAME_EMAIL,
    pass: process.env.PASSWORD_EMAIL,
  },
});

const handleSendMail = async (val) => {
  try {
    await transporter.sendMail(val);

    return "OK";
  } catch (error) {
    return error;
  }
};

app.post("/send-OTP", asyncHandle(async (req, res) => {
    const { email} = req.body;
    const verificationCode = Math.round(1000 + Math.random() * 9000);
    try {
      const data = {
        from: `"Support Timely Appplication" <${process.env.USERNAME_EMAIL}>`,
        to: email,
        subject: "Verification email code",
        text: "Your code to verification email",
        html: `<h1>${verificationCode}</h1>`,
      };

      await handleSendMail(data);

      res.status(200).json({
        message: "Send verification code successfully!!!",
        data: {
          code: verificationCode,
        },
      });
    } catch (error) {
      res.status(401);
      throw new Error("Can not send email");
    }
}));


app.listen(PORT, () => {
  console.log(`Server starting at http://localhost:${PORT}`);
});
