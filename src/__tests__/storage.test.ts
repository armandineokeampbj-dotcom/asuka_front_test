// frontend/src/__tests__/storage.test.ts
// Test file storage with MongoDB GridFS

export async function testStorage() {
  const API_BASE = "http://localhost:3000";
  
  console.log("🧪 Running Phase 4 Storage Tests...\n");

  try {
    // Mock auth token
    const token = localStorage.getItem("asuka_token");
    if (!token) {
      console.error("❌ No auth token. Please login first.");
      return { success: false, error: "No auth token" };
    }

    // Test 1: Upload a file
    console.log("1️⃣ Testing file upload...");
    const testFile = new File(["test content"], "test.txt", { type: "text/plain" });
    const formData = new FormData();
    formData.append("file", testFile);

    const uploadRes = await fetch(`${API_BASE}/api/storage/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
    const uploadData = await uploadRes.json();
    const fileId = uploadData.fileId;
    console.log("✅ File uploaded successfully\n");

    // Test 2: Download file
    console.log("2️⃣ Testing file download...");
    const downloadUrl = uploadData.url;
    const downloadRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!downloadRes.ok) throw new Error(`Download failed: ${downloadRes.status}`);
    const downloadedContent = await downloadRes.text();
    if (downloadedContent !== "test content") throw new Error("Downloaded content mismatch");
    console.log("✅ File downloaded successfully\n");

    // Test 3: List files
    console.log("3️⃣ Testing file list...");
    const listRes = await fetch(`${API_BASE}/api/storage/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listRes.ok) throw new Error(`List failed: ${listRes.status}`);
    const listData = await listRes.json();
    console.log(`✅ Found ${listData.files.length} files\n`);

    // Test 4: Delete file
    console.log("4️⃣ Testing file delete...");
    const deleteRes = await fetch(`${API_BASE}/api/storage/delete/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!deleteRes.ok) throw new Error(`Delete failed: ${deleteRes.status}`);
    console.log("✅ File deleted successfully\n");

    console.log("🎉 All Phase 4 Storage Tests Passed!");
    return { success: true };
  } catch (err: any) {
    console.error("❌ Test failed:", err.message);
    return { success: false, error: err.message };
  }
}

// Usage in browser console:
// import { testStorage } from '@/__tests__/storage.test';
// testStorage().then(console.log);
