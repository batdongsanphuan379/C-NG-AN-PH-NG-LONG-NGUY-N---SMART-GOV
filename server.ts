import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // API Route for Zalo OA Notification
  app.post("/api/notify-zalo", async (req, res) => {
    const { phone, message, recordCode } = req.body;

    console.log(`[Zalo OA] Attempting to send notification to ${phone}`);
    
    try {
      // In production, you would use Zalo OA SDK or axios to call Zalo APIs
      // For example: https://openapi.zalo.me/v2.0/oa/message
      // You need an access_token from your Zalo OA app
      
      const ZALO_ACCESS_TOKEN = process.env.VITE_ZALO_ACCESS_TOKEN;
      
      if (!ZALO_ACCESS_TOKEN) {
        console.warn("ZALO_ACCESS_TOKEN not set. Simulating success.");
        return res.json({ 
          success: true, 
          message: "Notification simulated (no API key)",
          details: { phone, text: message, code: recordCode }
        });
      }

      // Real integration snippet example:
      /*
      const response = await axios.post("https://openapi.zalo.me/v3.0/oa/message/transaction", {
        recipient: { phone: phone },
        message: {
          template_id: "your_template_id",
          template_data: {
            customer_name: "Citizen",
            order_code: recordCode,
            status: message
          }
        }
      }, {
        headers: { access_token: ZALO_ACCESS_TOKEN }
      });
      return res.json(response.data);
      */

      res.json({ success: true, message: "Notification sent via Zalo OA" });
    } catch (error) {
      console.error("Zalo OA notification failed:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    console.log(`[Production] Serving static files from: ${distPath}`);
    
    app.use(express.static(distPath));
    
    // SPA Fallback - ensure this is the LAST route
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`[Error] Failed to send index.html:`, err);
          res.status(500).send("Server Error: Missing static assets. Please run build.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
