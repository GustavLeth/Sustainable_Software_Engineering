const localStorage = chrome.storage.local;
let counter = 0;
let stats = {}
let duration = 0

const extractHostname = (url) => {
    let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];
  
    // find & remove port number
    hostname = hostname.split(':')[0];
    // find & remove "?"
    hostname = hostname.split('?')[0];
  
    return hostname;
  };
  
  const setByteLengthPerOrigin = async(origin, byteLength) => {
    // check if it has key, else we would parse the number to "NAN" and we don't want that.
    counter += byteLength;
    console.log('counter', counter);
    const bytePerOrigin = origin in stats ? parseInt(stats[origin]) : 0;
    stats[origin] = bytePerOrigin + byteLength;
  };

  const writeToStorageCycle = () => {
    setTimeout(() => {
      chrome.storage.sync.set({ "stats": JSON.stringify(stats) }).then(() => {
        console.log("website stats: " + JSON.stringify(stats));
      });
      writeToStorageCycle();
      const bytesUsed = document.getElementById("bytes");
      bytesUsed.textContent = counter / 1024;
      }, 3000);
  };
  
  const isChrome = () => {
    return (typeof(browser) === 'undefined');
  };
  
  const headersReceivedListener = (requestDetails) => {
    if (isChrome()) {
       const origin = extractHostname(!requestDetails.initiator ? requestDetails.url : requestDetails.initiator);
       const responseHeadersContentLength = requestDetails.responseHeaders.find(element => element.name.toLowerCase() === "content-length");
       const contentLength = undefined === responseHeadersContentLength ? {value: 0}
        : responseHeadersContentLength;
       const requestSize = parseInt(contentLength.value, 10);
       console.log('origin', origin);
       setByteLengthPerOrigin(origin, requestSize);
  
       return {};
    }
  
    let filter = browser.webRequest.filterResponseData(requestDetails.requestId);
  
    filter.ondata = event => {
      const origin = extractHostname(!requestDetails.originUrl ? requestDetails.url : requestDetails.originUrl);
      setByteLengthPerOrigin(origin, event.data.byteLength);
      console.log('event', event)
      filter.write(event.data);
    };
  
    filter.onstop = () => {
      filter.disconnect();
    };
  
    return {};
  };
  
  const setBrowserIcon = (type) => {
    //chrome.browserAction.setIcon({path: `icons/icon-${type}-48.png`});
  };
  
  
  const start = () => {
    console.log("start");
      setBrowserIcon('on');
  
      chrome.webRequest.onHeadersReceived.addListener(
        headersReceivedListener,
        {urls: ['<all_urls>']},
        ['responseHeaders']
      );
  };

  chrome.runtime.onConnect.addListener(function(port) {
    console.log("on connect");
        port.onDisconnect.addListener(function() {
           onDisconnect();
        });
  });
  chrome.storage.sync.get(["stats"]).then((result) => {
    stats = JSON.parse(result["stats"]);
    counter = Object.keys(stats).reduce((acc, currentKey) => acc + stats[currentKey], 0);
    console.log('counter', counter)
    start();
    writeToStorageCycle();
  });

const getCurrentCarbonIntensity = async() => {
  try {
  const response = await fetch("http://localhost:3000");
  const intensity = await response.json();
  console.log('intensity', intensity)
  const carbonIntensityElement = document.getElementById("carbon_intensity");
  carbonIntensityElement.textContent = intensity;
  } catch(error) {
    console.log("couldn't fetch from backend");
    return 0;
  }
}
getCurrentCarbonIntensity();

  