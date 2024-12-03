const express = require("express");
const nodemailer = require("nodemailer");
require("dotenv").config();
const asyncHandle = require("express-async-handler");
const nodeCron = require("node-cron");
const { JWT } = require("google-auth-library");
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const db = require("./firebase");

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

app.post(
  "/send-OTP",
  asyncHandle(async (req, res) => {
    const { email } = req.body;
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
  })
);
//lay ra cac task trong db

const getAccessToken = () => {
  return new Promise(function (resolve, reject) {
    const key = require("./service-account.json");
    const jwtClient = new JWT(
      key.client_email,
      null,
      key.private_key,
      ["https://www.googleapis.com/auth/cloud-platform"],
      null
    );
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        reject(err);
        return;
      }
      resolve(tokens.access_token);
      console.log("token", tokens.access_token);
    });
  });
};
const handlerSendNotification = async ({ tokens, title, body, data }) => {
  if (!Array.isArray(tokens)) {
    tokens = [tokens];
  }

  for (const token of tokens) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${await getAccessToken()}`);

    var raw = JSON.stringify({
      message: {
        token: token,
        notification: {
          title,
          body,
        },
        data: data,
      },
    });

    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    fetch(
      "https://fcm.googleapis.com/v1/projects/timely-d206d/messages:send",
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => console.log(result))
      .catch((error) => console.log("error", error));
  }
};

nodeCron.schedule("* * * * *", async () => {
  try {
    console.log("Checking for due tasks...");

    // Lấy danh sách task chưa thông báo
    const tasksSnapshot = await db
      .collection("tasks")
      .where("notified", "==", false)
      .get();

    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      console.log(`Checking task: ${taskData}`);
      const { title, startDate, remind, startTime, uid } = taskData;
      console.log(`Checking task1: ${startTime}`);
      console.log(`Checking task: ${startDate}`);

      // Lấy thông tin người dùng từ uid
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) {
        console.log(`User with UID ${uid} not found`);
        continue; // Bỏ qua nếu người dùng không tồn tại
      }
      const userData = userDoc.data();
      const fcmTokens = userData.tokens;

      if (!fcmTokens || fcmTokens.length === 0) {
        console.log(`No FCM tokens found for user ${uid}`);
        continue; // Nếu người dùng không có token, bỏ qua
      }
      const now = new Date();
      const remindTime = Number(remind) * 60 * 1000;
      const taskTime = new Date(startTime).getTime();
      const timeDate = new Date(startDate).getDate();
      const timeDiff = taskTime - now.getTime();
      if (
        timeDiff > 0 &&
        timeDiff <= remindTime &&
        timeDate === now.getDate()
      ) {
        console.log(`Sending notification to user ${uid}...`);
        await handlerSendNotification({
          tokens: fcmTokens, // Gửi token của người dùng này
          title: "Task Reminder",
          body: `You have a task: ${title}`,
          data: {
            taskId: taskDoc.id,
            uid: uid,
          },
        });
        await db.collection("tasks").doc(taskDoc.id).update({ notified: true });
      }
    }
  } catch (error) {
    console.error("Error sending notifications:", error);
  }
});

app.listen(PORT, () => {
  console.log(`Server starting at http://localhost:${PORT}`);
});
