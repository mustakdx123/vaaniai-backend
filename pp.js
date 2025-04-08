// vaaniAI backend using Node.js + Express + Play.ht API + Stripe + Firebase

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 3000;

// Firebase Admin SDK
const firebaseConfig = require("./firebase-config.json");
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
});
const db = admin.firestore();

// Stripe Setup
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Voice Generation Endpoint
app.post("/generate-voice", async (req, res) => {
  const { text, voice, speed, pitch, language, gender, email } = req.body;

  try {
    const response = await axios.post(
      "https://play.ht/api/v2/tts",
      {
        content: text,
        voice: voice || "en-US-Male1",
        speed: speed || 1.0,
        pitch: pitch || 1.0,
        language: language || "en-US",
        gender: gender || "male",
      },
      {
        headers: {
          Authorization: process.env.PLAYHT_API_KEY,
          "X-User-Id": process.env.PLAYHT_USER_ID,
          "Content-Type": "application/json",
        },
      }
    );

    const audioUrl = response.data.audioUrl;
    const id = uuidv4();
    await db.collection("voiceLogs").doc(id).set({ text, email, audioUrl });

    res.json({ success: true, audioUrl });
  } catch (error) {
    console.error("Voice Generation Error:", error);
    res.status(500).json({ success: false, message: "Voice generation failed." });
  }
});

// Stripe Checkout Session
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: "your_stripe_price_id", // Replace with real price ID
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    res.json({ id: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Default Route
app.get("/", (req, res) => {
  res.send("Welcome to VaaniAI Backend");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
