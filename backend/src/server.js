import "dotenv/config";
import app from "./app.js";
import env from "./config/env.js";

app.listen(env.appPort, env.appHost, () => {
  console.log(`RuNSee backend local: ${env.localApiUrl}`);
  console.log(`RuNSee backend public: ${env.publicApiUrl}`);
});
