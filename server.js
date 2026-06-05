const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

const app = express();
const h = { "User-Agent": "SEC13FExplorer research@example.com" };

app.use("/sec-data", createProxyMiddleware({ target: "https://data.sec.gov", changeOrigin: true, pathRewrite: { "^/sec-data": "" }, headers: h }));
app.use("/sec-archives", createProxyMiddleware({ target: "https://www.sec.gov", changeOrigin: true, pathRewrite: { "^/sec-archives": "" }, headers: h }));
app.use("/sec-search", createProxyMiddleware({ target: "https://efts.sec.gov", changeOrigin: true, pathRewrite: { "^/sec-search": "" }, headers: h }));
app.use(express.static(path.join(__dirname, "build")));
app.get("*", (_, res) => res.sendFile(path.join(__dirname, "build", "index.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`13F Explorer running → http://localhost:${PORT}`));
