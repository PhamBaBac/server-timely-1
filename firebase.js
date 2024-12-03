const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

// Khởi tạo Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://<your-database-name>.firebaseio.com", // Dùng cho Realtime Database
});

const db = admin.firestore(); // Firestore
console.log("Firebase connected successfully");
// const db = admin.database(); // Realtime Database

module.exports = db;
