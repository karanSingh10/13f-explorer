const{createProxyMiddleware:p}=require("http-proxy-middleware");
const h={"User-Agent":"SEC13FExplorer research@example.com"};
module.exports=a=>{
  a.use("/sec-data",p({target:"https://data.sec.gov",changeOrigin:true,pathRewrite:{"^/sec-data":""},headers:h}));
  a.use("/sec-archives",p({target:"https://www.sec.gov",changeOrigin:true,pathRewrite:{"^/sec-archives":""},headers:h}));
  a.use("/sec-search",p({target:"https://efts.sec.gov",changeOrigin:true,pathRewrite:{"^/sec-search":""},headers:h}));
};
