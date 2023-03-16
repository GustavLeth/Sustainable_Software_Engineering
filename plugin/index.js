console.log("hi");

const extractHostname = (url) => {
    let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];
  
    // find & remove port number
    hostname = hostname.split(':')[0];
    // find & remove "?"
    hostname = hostname.split('?')[0];
  
    return hostname;
  };
  
  setByteLengthPerOrigin = (origin, byteLength) => {
    const stats = localStorage.getItem('stats');
    const statsJson = null === stats ? {} : JSON.parse(stats);
  
    let bytePerOrigin = undefined === statsJson[origin] ? 0 : parseInt(statsJson[origin]);
    statsJson[origin] = bytePerOrigin + byteLength;
  
    localStorage.setItem('stats', JSON.stringify(statsJson));
  };
  
  isChrome = () => {
    return (typeof(browser) === 'undefined');
  };

  headersReceivedListener = (requestDetails) => {
    if (isChrome()) {
       const origin = extractHostname(!requestDetails.initiator ? requestDetails.url : requestDetails.initiator);
       const responseHeadersContentLength = requestDetails.responseHeaders.find(element => element.name.toLowerCase() === "content-length");
       const contentLength = undefined === responseHeadersContentLength ? {value: 0}
        : responseHeadersContentLength;
       const requestSize = parseInt(contentLength.value, 10);
       setByteLengthPerOrigin(origin, requestSize);
  
       return {};
    }
  
    let filter = browser.webRequest.filterResponseData(requestDetails.requestId);
  
    filter.ondata = event => {
      const origin = extractHostname(!requestDetails.originUrl ? requestDetails.url : requestDetails.originUrl);
      setByteLengthPerOrigin(origin, event.data.byteLength);
  
      filter.write(event.data);
    };
  
    filter.onstop = () => {
      filter.disconnect();
    };
  
    return {};
  };
  

let downloadedMb = 0

const callback = details => {console.log("details", details)};
const headersCallback = details => {console.log("onHeadersReceived", details)};
const filter = {urls: ["<all_urls>"]};

var opt_extraInfoSpec = ["responseHeaders"];

// chrome.webRequest.onResponseStarted.addListener(callback, filter, opt_extraInfoSpec)
chrome.webRequest.onHeadersReceived.addListener(headersCallback, filter, opt_extraInfoSpec);
chrome.webRequest.onCompleted.addListener(callback, filter, opt_extraInfoSpec);

// async function logRequests() {
//     let harLog = await browser.devtools.network.getHAR();
//     console.log(`HAR version: ${harLog.version}`);
//     for (const entry of harLog.entries) {
//       console.log(entry.request.url);
//     }
// }
  
// logRequestsButton.addEventListener("click", logRequests);