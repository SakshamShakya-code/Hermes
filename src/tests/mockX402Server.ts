import express from "express";

const app = express();
const PORT = 3001;

app.get("/api/yield", (req, res) => {
  const paymentHeader = req.headers["x-402-payment"];

  if (!paymentHeader) {
    return res.status(402).json({
      error: "Payment Required",
      message: "This endpoint requires an X-402-Payment header",
    });
  }

  return res.json({
    liquidStakingAPY: 14.2,
    poolAPY: 8.1,
  });
});

app.listen(PORT, () => {
  console.log(`Mock x402 yield server running on http://localhost:${PORT}`);
});
