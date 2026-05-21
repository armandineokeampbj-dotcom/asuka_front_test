// frontend/src/__tests__/auth.test.ts
// Quick auth tests to verify Phase 3 adaptation

export async function testAuth() {
  const API_BASE = "http://localhost:3000";

  console.log("🧪 Running Phase 3 Auth Tests...\n");

  try {
    // Test 1: Signup
    console.log("1️⃣ Testing signup...");
    const signupRes = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "Test123!",
        full_name: "Test User",
      }),
    });
    if (!signupRes.ok) throw new Error(`Signup failed: ${signupRes.status}`);
    const signupData = await signupRes.json();
    console.log("✅ Signup successful\n");

    // Test 2: Verify OTP (mock OTP = "000000" for testing)
    console.log("2️⃣ Testing OTP verification...");
    const otpRes = await fetch(`${API_BASE}/api/auth/verify-email-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        otp_code: "000000",
      }),
    });
    if (!otpRes.ok) throw new Error(`OTP verification failed: ${otpRes.status}`);
    const otpData = await otpRes.json();
    const token = otpData.token;
    console.log("✅ OTP verification successful\n");

    // Test 3: Get authenticated user
    console.log("3️⃣ Testing GET /api/auth/me...");
    const meRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok) throw new Error(`GET /me failed: ${meRes.status}`);
    const userData = await meRes.json();
    console.log("✅ GET /me successful\n");

    // Test 4: Get profile
    console.log("4️⃣ Testing GET /api/profile/:id...");
    const profileRes = await fetch(`${API_BASE}/api/profile/${userData.user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) throw new Error(`GET /profile failed: ${profileRes.status}`);
    const profileData = await profileRes.json();
    console.log("✅ GET /profile successful\n");

    // Test 5: Get rewards
    console.log("5️⃣ Testing GET /api/rewards...");
    const rewardsRes = await fetch(`${API_BASE}/api/rewards`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!rewardsRes.ok) throw new Error(`GET /rewards failed: ${rewardsRes.status}`);
    const rewardsData = await rewardsRes.json();
    console.log("✅ GET /rewards successful\n");

    // Test 6: Get pulses
    console.log("6️⃣ Testing GET /api/pulses...");
    const pulsesRes = await fetch(`${API_BASE}/api/pulses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!pulsesRes.ok) throw new Error(`GET /pulses failed: ${pulsesRes.status}`);
    const pulsesData = await pulsesRes.json();
    console.log("✅ GET /pulses successful\n");

    console.log("🎉 All Phase 3 Auth Tests Passed!");
    return { success: true, token, user: userData.user };
  } catch (err: any) {
    console.error("❌ Test failed:", err.message);
    return { success: false, error: err.message };
  }
}

// Run tests if this file is executed directly
if (typeof window === "undefined") {
  testAuth().then((result) => {
    process.exit(result.success ? 0 : 1);
  });
}
