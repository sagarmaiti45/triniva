interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export async function verifyRecaptcha(token: string, action: string): Promise<boolean> {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error("reCAPTCHA secret key not configured");
      return false;
    }

    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${secretKey}&response=${token}`,
      }
    );

    const data: RecaptchaResponse = await response.json();

    // For reCAPTCHA v3, check success, score, and action
    if (!data.success) {
      console.error("reCAPTCHA verification failed:", data["error-codes"]);
      return false;
    }

    // Check if action matches
    if (data.action !== action) {
      console.error("reCAPTCHA action mismatch:", data.action, "expected:", action);
      return false;
    }

    // Check score (0.0 - 1.0, where 1.0 is very likely a good interaction)
    // You can adjust the threshold based on your needs
    const scoreThreshold = 0.5;
    if (data.score && data.score < scoreThreshold) {
      console.error("reCAPTCHA score too low:", data.score);
      return false;
    }

    return true;
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return false;
  }
}