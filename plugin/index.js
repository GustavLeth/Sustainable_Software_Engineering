console.log("hi");

const callback = details => {console.log("details", details)};
const filter = {urls: ["<all_urls>"]};

var opt_extraInfoSpec = [];

chrome.webRequest.onBeforeRequest.addListener(callback, filter, opt_extraInfoSpec);