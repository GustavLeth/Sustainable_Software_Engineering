(()=>{chrome.storage.local;let e=0,t={};const o=e=>{let t=e.indexOf("//")>-1?e.split("/")[2]:e.split("/")[0];return t=t.split(":")[0],t=t.split("?")[0],t},n=async(o,n)=>{e+=n;const s=o in t?parseInt(t[o]):0;t[o]=s+n,chrome.storage.local.set({stats:"hey"}).then((()=>{console.log("Value is set to "+JSON.stringify(t))}))},s=e=>{if("undefined"==typeof browser){const t=o(e.initiator?e.initiator:e.url),s=e.responseHeaders.find((e=>"content-length"===e.name.toLowerCase())),r=parseInt((void 0===s?{value:0}:s).value,10);return n(t,r),{}}let t=browser.webRequest.filterResponseData(e.requestId);return t.ondata=s=>{const r=o(e.originUrl?e.originUrl:e.url);n(r,s.data.byteLength),console.log("event",s),t.write(s.data)},t.onstop=()=>{t.disconnect()},{}},r=async()=>{};let a;chrome.runtime.onConnect.addListener((function(e){e.onDisconnect.addListener((function(){(()=>{const e=JSON.stringify(t);console.log("disconnected"),chrome.storage.local.set({stats:e}).then((()=>{console.log("Value is set to "+e)}))})()}))})),(e=>{if("start"===(e={action:"start"}).action)return console.log("start"),chrome.webRequest.onHeadersReceived.addListener(s,{urls:["<all_urls>"]},["responseHeaders"]),void(a||(a=setInterval(r,6e4)));"stop"===e.action&&(chrome.webRequest.onHeadersReceived.removeListener(s),a&&(clearInterval(a),a=null))})({action:"start"}),(async()=>{const e=fetch("http://localhost:3000",{mode:"no-cors"}).then((e=>(console.log("response",e),console.log("response.data",e.body),e))).catch((e=>{console.error("error",e)}));document.getElementById("carbon_intensity").textContent=e})()})();