const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not set in .env');
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    console.log('🔍 Attempting to connect to MongoDB Atlas...');
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    console.error("\n📋 Possible issues:");
    console.error("1. Cluster is paused - Go to Atlas and click 'Resume'");
    console.error("2. IP not whitelisted - Add 0.0.0.0/0 in Network Access");
    console.error("3. Wrong cluster URL - Verify in Atlas dashboard");
    console.error("4. Cluster was deleted - Create a new one");
  } finally {
    await client.close();
  }
}

run();
